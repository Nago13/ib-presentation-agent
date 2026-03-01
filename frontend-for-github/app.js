// ============================================
// IB Presentation Agent - Frontend Logic
// ============================================

const CONFIG = {
  webhookUrl: "https://ggservices.app.n8n.cloud/webhook/generate-presentation",
  pptxServiceUrl: "http://localhost:8000",
};

const state = {
  files: [],
  generating: false,
  resultBlob: null,
  resultFilename: "",
  reasoning: "",
};

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
const downloadBtn = $("#download-btn");
const newBtn = $("#new-btn");
const errorCard = $("#error-card");
const errorMessage = $("#error-message");
const retryBtn = $("#retry-btn");
const apiStatus = $("#api-status");

document.querySelectorAll(".hint").forEach((hint) => {
  hint.addEventListener("click", () => {
    promptInput.value = hint.dataset.prompt;
    promptInput.focus();
    promptInput.style.height = "auto";
    promptInput.style.height = promptInput.scrollHeight + "px";
  });
});

dropzone.addEventListener("click", () => fileInput.click());
dropzone.addEventListener("dragover", (e) => { e.preventDefault(); dropzone.classList.add("dragover"); });
dropzone.addEventListener("dragleave", () => { dropzone.classList.remove("dragover"); });
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
    if (!state.files.some((f) => f.name === file.name && f.size === file.size)) state.files.push(file);
  }
  renderFileList();
}
function removeFile(index) {
  state.files.splice(index, 1);
  renderFileList();
}
function renderFileList() {
  if (state.files.length === 0) { fileList.innerHTML = ""; return; }
  fileList.innerHTML = state.files.map((file, i) => {
    const ext = file.name.split(".").pop().toLowerCase();
    const iconClass = ["xlsx","xls"].includes(ext) ? "xlsx" : ext === "csv" ? "csv" : ext === "pdf" ? "pdf" : ext === "json" ? "json" : ["png","jpg","jpeg","gif"].includes(ext) ? "img" : "txt";
    const size = file.size < 1024 ? file.size + " B" : file.size < 1024*1024 ? (file.size/1024).toFixed(1) + " KB" : (file.size/(1024*1024)).toFixed(1) + " MB";
    const div = document.createElement("div"); div.textContent = file.name;
    return `<div class="file-item"><div class="file-icon ${iconClass}">${ext}</div><div class="file-info"><div class="file-name">${div.innerHTML}</div><div class="file-size">${size}</div></div><button class="file-remove" onclick="removeFile(${i})" title="Remover"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>`;
  }).join("");
}
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

generateBtn.addEventListener("click", handleGenerate);
async function handleGenerate() {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    promptInput.focus();
    promptInput.style.boxShadow = "0 0 0 3px rgba(194, 32, 32, 0.15)";
    promptInput.style.borderColor = "#c22020";
    setTimeout(() => { promptInput.style.boxShadow = ""; promptInput.style.borderColor = ""; }, 2000);
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
    const response = await fetch(CONFIG.webhookUrl, { method: "POST", body: formData });
    if (!response.ok) {
      let detail = `Erro ${response.status}`;
      try { const errData = await response.json(); detail = errData.message || errData.detail || detail; } catch { detail = await response.text() || detail; }
      throw new Error(detail);
    }
    const contentType = response.headers.get("Content-Type") || "";
    let blob;
    let filename = "apresentacao.pptx";
    state.reasoning = "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      if (data.presentation_base64) {
        const binaryString = atob(data.presentation_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
        filename = data.filename || "apresentacao.pptx";
        state.reasoning = data.reasoning || "";
      } else throw new Error(data.message || data.detail || "Resposta inválida do servidor.");
    } else {
      blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
      filename = filenameMatch ? filenameMatch[1] : "apresentacao.pptx";
    }
    state.resultBlob = blob;
    state.resultFilename = filename;
    completeProgress();
    setTimeout(() => {
      showSection("result");
      resultInfo.textContent = `${filename} - ${formatFileSize(blob.size)}`;
      if (resultReasoning) {
        resultReasoning.textContent = state.reasoning || "";
        resultReasoning.closest(".result-reasoning-wrap")?.classList.toggle("hidden", !state.reasoning);
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

let progressInterval = null;
function simulateProgress() {
  let progress = 0, currentStep = 1;
  const titles = ["Analisando seu pedido...", "Pesquisando dados financeiros...", "Gerando conteúdo dos slides...", "Criando a apresentação..."];
  progressBar.style.width = "0%";
  updateSteps(1);
  progressTitle.textContent = titles[0];
  progressInterval = setInterval(() => {
    if (progress < 90) {
      progress = Math.min(progress + Math.random() * 3 + 0.5, 90);
      progressBar.style.width = progress + "%";
      const newStep = Math.min(Math.floor(progress / 25) + 1, 4);
      if (newStep !== currentStep) { currentStep = newStep; updateSteps(currentStep); progressTitle.textContent = titles[currentStep - 1]; }
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

downloadBtn.addEventListener("click", () => {
  if (!state.resultBlob) return;
  const url = URL.createObjectURL(state.resultBlob);
  const a = document.createElement("a");
  a.href = url; a.download = state.resultFilename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
newBtn.addEventListener("click", resetUI);
retryBtn.addEventListener("click", () => { resetUI(); if (promptInput.value.trim()) handleGenerate(); });
function resetUI() {
  showSection("form");
  state.resultBlob = null;
  state.resultFilename = "";
  state.reasoning = "";
  if (resultReasoning) {
    resultReasoning.textContent = "";
    resultReasoning.closest(".result-reasoning-wrap")?.classList.add("hidden");
  }
  clearInterval(progressInterval);
  progressBar.style.width = "0%";
  updateSteps(0);
}

function showSection(section) {
  progressCard.classList.add("hidden");
  resultCard.classList.add("hidden");
  errorCard.classList.add("hidden");
  const formElements = document.querySelectorAll(".prompt-card, .upload-card, .generate-btn");
  if (section === "form") formElements.forEach((el) => el.classList.remove("hidden"));
  else {
    formElements.forEach((el) => el.classList.add("hidden"));
    if (section === "progress") progressCard.classList.remove("hidden");
    else if (section === "result") resultCard.classList.remove("hidden");
    else if (section === "error") errorCard.classList.remove("hidden");
  }
}

async function checkApiStatus() {
  const dot = apiStatus.querySelector(".status-dot");
  const text = apiStatus.querySelector(".status-text");
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(CONFIG.pptxServiceUrl + "/health", { signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) { dot.className = "status-dot online"; text.textContent = "Serviço online"; }
    else { dot.className = "status-dot offline"; text.textContent = "Serviço indisponível"; }
  } catch { dot.className = "status-dot offline"; text.textContent = "Serviço offline"; }
}
checkApiStatus();
setInterval(checkApiStatus, 30000);

promptInput.addEventListener("input", () => {
  promptInput.style.height = "auto";
  promptInput.style.height = Math.min(promptInput.scrollHeight, 300) + "px";
});
