// ============================================
// IB Presentation Agent - Frontend Logic
// ============================================

const CONFIG = {
  // URL do webhook N8N - use a Production URL quando o workflow estiver ativo
  webhookUrl: "https://ggservices.app.n8n.cloud/webhook/generate-presentation",
  // URL do microserviço PPTX (para health check; só funciona se o serviço estiver acessível na internet)
  pptxServiceUrl: "http://localhost:8000",
};

// ============================================
// State
// ============================================

const state = {
  files: [],
  generating: false,
  slidesUrl: null,
  sheetsUrl: null,
  resultBlob: null,
  resultFilename: "",
  reasoning: "",
};

// ============================================
// DOM References
// ============================================

const $ = (sel) => document.querySelector(sel);
const promptInput = $("#prompt-input");
const dropzone = $("#dropzone");
const fileInput = $("#file-input");
const fileList = $("#file-list");
const generateBtn = $("#generate-btn");
const progressCard = $("#progress-card");
const progressTitle = $("#progress-title");
const progressBar = $("#progress-bar");
const progressSteps = $("#progress-steps");
const resultCard = $("#result-card");
const resultInfo = $("#result-info");
const resultReasoning = $("#result-reasoning");
const openSlidesBtn = $("#open-slides-btn");
const openSheetsBtn = $("#open-sheets-btn");
const newBtn = $("#new-btn");
const errorCard = $("#error-card");
const errorMessage = $("#error-message");
const retryBtn = $("#retry-btn");
const apiStatus = $("#api-status");

// ============================================
// Prompt Hints
// ============================================

document.querySelectorAll(".hint").forEach((hint) => {
  hint.addEventListener("click", () => {
    promptInput.value = hint.dataset.prompt;
    promptInput.focus();
    promptInput.style.height = "auto";
    promptInput.style.height = promptInput.scrollHeight + "px";
  });
});

// ============================================
// File Upload
// ============================================

dropzone.addEventListener("click", () => fileInput.click());

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  addFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", () => {
  addFiles(fileInput.files);
  fileInput.value = "";
});

function addFiles(fileListObj) {
  for (const file of fileListObj) {
    if (!state.files.some((f) => f.name === file.name && f.size === file.size)) {
      state.files.push(file);
    }
  }
  renderFileList();
}

function removeFile(index) {
  state.files.splice(index, 1);
  renderFileList();
}

function renderFileList() {
  if (state.files.length === 0) {
    fileList.innerHTML = "";
    return;
  }

  fileList.innerHTML = state.files
    .map((file, i) => {
      const ext = getFileExtension(file.name);
      const iconClass = getIconClass(ext);
      const size = formatFileSize(file.size);
      return `
        <div class="file-item">
          <div class="file-icon ${iconClass}">${ext}</div>
          <div class="file-info">
            <div class="file-name">${escapeHtml(file.name)}</div>
            <div class="file-size">${size}</div>
          </div>
          <button class="file-remove" onclick="removeFile(${i})" title="Remover">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      `;
    })
    .join("");
}

function getFileExtension(name) {
  return name.split(".").pop().toLowerCase();
}

function getIconClass(ext) {
  if (["xlsx", "xls"].includes(ext)) return "xlsx";
  if (ext === "csv") return "csv";
  if (ext === "pdf") return "pdf";
  if (ext === "json") return "json";
  if (["png", "jpg", "jpeg", "gif"].includes(ext)) return "img";
  return "txt";
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// Generate Presentation
// ============================================

generateBtn.addEventListener("click", handleGenerate);

async function handleGenerate() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    promptInput.focus();
    promptInput.style.boxShadow = "0 0 0 3px rgba(194, 32, 32, 0.15)";
    promptInput.style.borderColor = "#c22020";
    setTimeout(() => {
      promptInput.style.boxShadow = "";
      promptInput.style.borderColor = "";
    }, 2000);
    return;
  }

  state.generating = true;
  showSection("progress");
  generateBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append("prompt", prompt);
    state.files.forEach((file) => formData.append("files", file));

    simulateProgress();

    const response = await fetch(CONFIG.webhookUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let detail = `Erro ${response.status}`;
      try {
        const errData = await response.json();
        detail = errData.message || errData.detail || detail;
      } catch {
        detail = await response.text() || detail;
      }
      throw new Error(detail);
    }

    let data;
    let responseError = null;
    state.reasoning = "";

    try {
      const text = await response.text();
      if (!text || !text.trim()) {
        throw new Error("Resposta vazia do servidor. O workflow pode ter falhado.");
      }
      data = JSON.parse(text);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error("Resposta inválida do servidor. O workflow pode ter falhado.");
      }
      throw e;
    }

    state.reasoning = data.reasoning != null ? data.reasoning : "";

    if (data.error && !data.slides_url) {
      const err = data.error;
      responseError = typeof err === "string"
        ? err
        : (err && (err.detail || err.message || err.error))
          ? String(err.detail || err.message || err.error)
          : "Erro ao gerar apresentação.";
    } else if (data.slides_url) {
      state.slidesUrl = data.slides_url;
      state.sheetsUrl = data.sheets_url || null;
    } else {
      throw new Error(data.message || data.detail || "Resposta inválida do servidor.");
    }

    completeProgress();

    setTimeout(() => {
      showSection("result");
      if (responseError) {
        resultInfo.textContent = "Erro: " + responseError;
        resultInfo.classList.add("result-info-error");
        openSlidesBtn.style.display = "none";
        openSheetsBtn.style.display = "none";
      } else {
        const title = data.presentation_title || "Apresentação";
        resultInfo.textContent = title + " — pronta no Google Slides";
        resultInfo.classList.remove("result-info-error");
        openSlidesBtn.style.display = "";
        openSheetsBtn.style.display = state.sheetsUrl ? "" : "none";
      }
      if (resultReasoning) {
        resultReasoning.textContent = state.reasoning || "Nenhum raciocínio disponível.";
        resultReasoning.closest(".result-reasoning-wrap")?.classList.remove("hidden");
      }
    }, 600);

  } catch (error) {
    showSection("error");
    errorMessage.textContent = error.message || "Erro desconhecido ao gerar a apresentação.";
  } finally {
    state.generating = false;
    generateBtn.disabled = false;
  }
}

// ============================================
// Progress Simulation
// ============================================

let progressInterval = null;

function simulateProgress() {
  let progress = 0;
  let currentStep = 1;
  const titles = [
    "Analisando seu pedido...",
    "Pesquisando dados financeiros...",
    "Gerando conteúdo dos slides...",
    "Criando a apresentação...",
  ];

  progressBar.style.width = "0%";
  updateSteps(1);
  progressTitle.textContent = titles[0];

  progressInterval = setInterval(() => {
    if (progress < 90) {
      const increment = Math.random() * 3 + 0.5;
      progress = Math.min(progress + increment, 90);
      progressBar.style.width = progress + "%";

      const newStep = Math.min(Math.floor(progress / 25) + 1, 4);
      if (newStep !== currentStep) {
        currentStep = newStep;
        updateSteps(currentStep);
        progressTitle.textContent = titles[currentStep - 1];
      }
    }
  }, 500);
}

function completeProgress() {
  clearInterval(progressInterval);
  progressBar.style.width = "100%";
  updateSteps(5);
  progressTitle.textContent = "Concluído!";
}

function updateSteps(activeStep) {
  progressSteps.querySelectorAll(".step").forEach((step) => {
    const stepNum = parseInt(step.dataset.step);
    step.classList.remove("active", "done");
    if (stepNum < activeStep) step.classList.add("done");
    else if (stepNum === activeStep) step.classList.add("active");
  });
}

// ============================================
// Open Links
// ============================================

openSlidesBtn.addEventListener("click", () => {
  if (state.slidesUrl) window.open(state.slidesUrl, "_blank");
});

openSheetsBtn.addEventListener("click", () => {
  if (state.sheetsUrl) window.open(state.sheetsUrl, "_blank");
});

// ============================================
// Reset / Retry
// ============================================

newBtn.addEventListener("click", resetUI);
retryBtn.addEventListener("click", () => {
  resetUI();
  if (promptInput.value.trim()) {
    handleGenerate();
  }
});

function resetUI() {
  showSection("form");
  state.slidesUrl = null;
  state.sheetsUrl = null;
  state.resultBlob = null;
  state.resultFilename = "";
  state.reasoning = "";
  if (resultReasoning) {
    resultReasoning.textContent = "";
    resultReasoning.closest(".result-reasoning-wrap")?.classList.remove("hidden");
  }
  openSlidesBtn.style.display = "";
  openSheetsBtn.style.display = "none";
  clearInterval(progressInterval);
  progressBar.style.width = "0%";
  updateSteps(0);
}

// ============================================
// Section Visibility
// ============================================

function showSection(section) {
  progressCard.classList.add("hidden");
  resultCard.classList.add("hidden");
  errorCard.classList.add("hidden");

  const formElements = document.querySelectorAll(".prompt-card, .upload-card, .generate-btn");

  if (section === "form") {
    formElements.forEach((el) => el.classList.remove("hidden"));
  } else {
    formElements.forEach((el) => el.classList.add("hidden"));
    if (section === "progress") progressCard.classList.remove("hidden");
    else if (section === "result") resultCard.classList.remove("hidden");
    else if (section === "error") errorCard.classList.remove("hidden");
  }
}

// ============================================
// API Health Check
// ============================================

async function checkApiStatus() {
  const dot = apiStatus.querySelector(".status-dot");
  const text = apiStatus.querySelector(".status-text");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(CONFIG.pptxServiceUrl + "/health", {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      dot.className = "status-dot online";
      text.textContent = "Serviço online";
    } else {
      dot.className = "status-dot offline";
      text.textContent = "Serviço indisponível";
    }
  } catch {
    dot.className = "status-dot offline";
    text.textContent = "Serviço offline";
  }
}

checkApiStatus();
setInterval(checkApiStatus, 30000);

// ============================================
// Textarea Auto-resize
// ============================================

promptInput.addEventListener("input", () => {
  promptInput.style.height = "auto";
  promptInput.style.height = Math.min(promptInput.scrollHeight, 300) + "px";
});
