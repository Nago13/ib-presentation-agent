// ============================================
// IB Presentation Agent - Frontend Logic
// ============================================

const CONFIG = {
  // URL do webhook N8N - use a Production URL quando o workflow estiver ativo
  webhookUrl: "https://ggservices.app.n8n.cloud/webhook/generate-presentation",
  slidesPromptWebhookUrl: "https://ggservices.app.n8n.cloud/webhook/generate-presentation-from-slides",
  marketResearchWebhookUrl: "https://ggservices.app.n8n.cloud/webhook/market-research",
  contractAutomationWebhookUrl: "https://ggservices.app.n8n.cloud/webhook/contract-automation",
  // URL do microserviço PPTX/Google Slides (para health check no Render)
  pptxServiceUrl: "https://ib-pptx-service.onrender.com",
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
  currentView: "presentation",
  researchSheetsUrl: null,
  reportUrl: null,
  researchAnalysisSlides: null,
  docUrl: null,
  downloadUrl: null,
  docTitle: null,
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
const headerTitle = $(".header-title");
const headerSubtitle = $(".header-subtitle");
const viewPresentation = $("#view-presentation");
const viewMarketResearch = $("#view-market-research");
const researchTopicInput = $("#research-topic-input");
const researchExecuteBtn = $("#research-execute-btn");
const openResearchSheetsBtn = $("#open-research-sheets-btn");
const openReportBtn = $("#open-report-btn");
const resultActionsPresentation = $("#result-actions-presentation");
const resultActionsResearch = $("#result-actions-research");
const resultActionsContracts = $("#result-actions-contracts");
const viewContracts = $("#view-contracts");
const resultAnalysisWrap = $("#result-analysis-wrap");
const resultAnalysisText = $("#result-analysis-text");
const copyAnalysisBtn = $("#copy-analysis-btn");

// ============================================
// Sidebar Navigation / View Switching
// ============================================

function showView(view) {
  state.currentView = view;
  document.querySelectorAll(".nav-item").forEach((el) => el.classList.remove("active"));
  const navMap = {
    presentation: "nav-presentation",
    "market-research": "nav-market-research",
    contracts: "nav-contracts",
    history: "nav-history",
  };
  $(`#${navMap[view] || "nav-presentation"}`)?.classList.add("active");

  viewPresentation?.classList.add("hidden");
  viewMarketResearch?.classList.add("hidden");
  viewContracts?.classList.add("hidden");

  if (view === "presentation") {
    viewPresentation?.classList.remove("hidden");
    updatePromptUIForMode();
    if (headerTitle) headerTitle.textContent = "Nova Apresentação";
    if (headerSubtitle) headerSubtitle.textContent = "Descreva a apresentação desejada ou defina o conteúdo de cada slide";
  } else if (view === "market-research") {
    viewMarketResearch?.classList.remove("hidden");
    if (headerTitle) headerTitle.textContent = "Pesquisa de Mercado";
    if (headerSubtitle) headerSubtitle.textContent = "Coletar dados de mercado, consolidar em planilhas e gerar relatórios estruturados";
  } else if (view === "contracts") {
    viewContracts?.classList.remove("hidden");
    if (headerTitle) headerTitle.textContent = "Automação de Contratos";
    if (headerSubtitle) headerSubtitle.textContent = "Gerar minutas em Google Docs ou Word a partir de templates e dados do cliente";
  }

  if (sectionState === "form") {
    showSection("form");
  }
}

let sectionState = "form";

$("#nav-presentation")?.addEventListener("click", (e) => {
  e.preventDefault();
  showView("presentation");
});

$("#nav-market-research")?.addEventListener("click", (e) => {
  e.preventDefault();
  showView("market-research");
});

$("#nav-contracts")?.addEventListener("click", (e) => {
  e.preventDefault();
  showView("contracts");
});

$("#nav-history")?.addEventListener("click", (e) => {
  e.preventDefault();
  // Histórico - placeholder, sem implementação
});

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

// ============================================
// Mode toggle (Agente pesquisa vs Eu defino slides)
// ============================================

function sanitizeDisplayError(msg) {
  if (!msg || typeof msg !== "string") return String(msg || "Erro desconhecido");
  const m = msg.toLowerCase();
  if (m.includes("503") || m.includes("application loading") || m.includes("cold start")) {
    return "O serviço está em inicialização. Aguarde 30-60 segundos e tente novamente.";
  }
  if (msg.length > 300 && (m.includes("<") || m.includes("base64"))) {
    return msg.substring(0, 80).replace(/<[^>]*>/g, "").trim() + "… [resposta truncada]";
  }
  return msg.length > 350 ? msg.substring(0, 350) + "…" : msg;
}

function getPresentationMode() {
  return document.querySelector('input[name="presentation-mode"]:checked')?.value || "agent";
}

function updatePromptUIForMode() {
  const mode = getPresentationMode();
  const hints = $("#prompt-hints");
  const slidesHint = $("#slides-mode-hint");
  if (mode === "slides") {
    promptInput.placeholder = promptInput.dataset.placeholderSlides || "";
    promptInput.rows = 12;
    hints?.classList.add("hidden");
    slidesHint?.classList.remove("hidden");
    $("#prompt-label-text").textContent = "Conteúdo dos slides";
  } else {
    promptInput.placeholder = promptInput.dataset.placeholderAgent || "";
    promptInput.rows = 5;
    hints?.classList.remove("hidden");
    slidesHint?.classList.add("hidden");
    $("#prompt-label-text").textContent = "Prompt";
  }
  promptInput.style.height = "auto";
  promptInput.style.height = Math.min(promptInput.scrollHeight, mode === "slides" ? 600 : 300) + "px";
}

document.querySelectorAll('input[name="presentation-mode"]').forEach((radio) => {
  radio.addEventListener("change", updatePromptUIForMode);
});

// ============================================
// Contract Automation
// ============================================

const contractTemplateId = $("#contract-template-id");
const contractGenerateBtn = $("#contract-generate-btn");
const openContractDocBtn = $("#open-contract-doc-btn");
const openContractDownloadBtn = $("#open-contract-download-btn");

contractGenerateBtn?.addEventListener("click", handleContractSubmit);

async function handleContractSubmit() {
  const templateId = contractTemplateId?.value.trim();
  const clienteNome = $("#contract-cliente-nome")?.value.trim();
  const clienteEmail = $("#contract-cliente-email")?.value.trim();
  if (!templateId || templateId.length < 5) {
    contractTemplateId?.focus();
    contractTemplateId.style.boxShadow = "0 0 0 3px rgba(194, 32, 32, 0.15)";
    setTimeout(() => { contractTemplateId.style.boxShadow = ""; }, 2000);
    return;
  }
  if (!clienteNome || !clienteEmail) {
    const el = !clienteNome ? $("#contract-cliente-nome") : $("#contract-cliente-email");
    el?.focus();
    el.style.boxShadow = "0 0 0 3px rgba(194, 32, 32, 0.15)";
    setTimeout(() => { el.style.boxShadow = ""; }, 2000);
    return;
  }

  const format = document.querySelector('input[name="contract-format"]:checked')?.value || "google_docs";
  const client_data = {
    cliente_nome: clienteNome,
    cliente_email: clienteEmail,
    empresa: $("#contract-empresa")?.value.trim() || "",
    cpf_cnpj: $("#contract-cpf-cnpj")?.value.trim() || "",
    endereco: $("#contract-endereco")?.value.trim() || "",
  };

  state.generating = true;
  setContractProgressSteps();
  showSection("progress");
  contractGenerateBtn.disabled = true;

  try {
    const body = JSON.stringify({ template_id: templateId, format, client_data });
    simulateProgress("contract");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    const response = await fetch(CONFIG.contractAutomationWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let detail = `Erro ${response.status}`;
      const text = await response.text();
      try {
        if (text?.trim()) {
          const errData = JSON.parse(text);
          detail = errData.message || errData.detail || errData.error || detail;
        } else if (response.status === 504) {
          detail = "Timeout do servidor. O workflow demorou demais. Tente novamente.";
        } else if (response.status >= 500) {
          detail = "Erro interno do servidor. Tente novamente.";
        }
      } catch {
        if (response.status === 504) detail = "Timeout do servidor. O workflow demorou demais. Tente novamente.";
        else if (response.status >= 500) detail = "Erro interno do servidor. Tente novamente.";
      }
      throw new Error(detail);
    }

    let data;
    const text = await response.text();
    if (!text?.trim()) throw new Error("Resposta vazia do servidor. O workflow pode ter falhado.");
    try {
      data = JSON.parse(text);
    } catch (e) {
      if (e.name === "AbortError") throw new Error("Timeout: o workflow demorou mais de 5 minutos. Tente novamente.");
      throw new Error("Resposta inválida do servidor. Tente novamente.");
    }

    const rawData = data.body && typeof data.body === "object" ? data.body : data.data && typeof data.data === "object" ? data.data : data;
    state.docUrl = rawData.doc_url || data.doc_url || null;
    state.downloadUrl = rawData.download_url || data.download_url || null;
    state.docTitle = rawData.doc_title || data.doc_title || "Contrato";

    if (data.error && !state.docUrl) {
      throw new Error(data.error?.detail || data.error?.message || data.error || "Erro ao gerar minuta.");
    }

    completeProgress();
    setTimeout(() => {
      showSection("result");
      resultActionsPresentation?.classList.add("hidden");
      resultActionsResearch?.classList.add("hidden");
      resultActionsContracts?.classList.remove("hidden");
      $(".result-title").textContent = "Minuta Gerada";
      newBtn.textContent = "Gerar nova minuta";
      resultInfo.textContent = state.docTitle + (state.docUrl ? " — documento pronto" : "");
      resultInfo.classList.remove("result-info-error");
      openContractDocBtn.style.display = state.docUrl ? "" : "none";
      openContractDownloadBtn.style.display = state.downloadUrl ? "" : "none";
      resultReasoning?.closest(".result-reasoning-wrap")?.classList.add("hidden");
      resultAnalysisWrap?.classList.add("hidden");
    }, 600);
  } catch (error) {
    showSection("error");
    errorMessage.textContent = error.message || "Erro desconhecido ao gerar a minuta.";
  } finally {
    state.generating = false;
    contractGenerateBtn.disabled = false;
  }
}

function setContractProgressSteps() {
  const steps = progressSteps?.querySelectorAll(".step");
  if (!steps || steps.length < 4) return;
  const labels = ["Validando dados...", "Processando template...", "Gerando documento...", "Finalizando..."];
  steps.forEach((step, i) => {
    const label = step.querySelector(".step-label");
    if (label) label.textContent = labels[i] || label.textContent;
  });
  progressTitle.textContent = "Validando dados...";
}

// ============================================
// Market Research
// ============================================

researchExecuteBtn?.addEventListener("click", handleMarketResearchSubmit);

async function handleMarketResearchSubmit() {
  const topic = researchTopicInput?.value.trim();
  if (!topic) {
    researchTopicInput?.focus();
    researchTopicInput.style.boxShadow = "0 0 0 3px rgba(194, 32, 32, 0.15)";
    researchTopicInput.style.borderColor = "#c22020";
    setTimeout(() => {
      researchTopicInput.style.boxShadow = "";
      researchTopicInput.style.borderColor = "";
    }, 2000);
    return;
  }

  state.generating = true;
  setResearchProgressSteps();
  showSection("progress");
  researchExecuteBtn.disabled = true;

  try {
    const period = $("#research-period")?.value || "12";
    const sources = $("#research-sources")?.value || "";
    const body = JSON.stringify({ topic, period, sources });

    simulateProgress("research");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    const response = await fetch(CONFIG.marketResearchWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let detail = `Erro ${response.status}`;
      const text = await response.text();
      try {
        if (text?.trim()) {
          const errData = JSON.parse(text);
          detail = errData.message || errData.detail || errData.error || detail;
        } else if (response.status === 504) {
          detail = "Timeout do servidor. O workflow demorou demais. Tente novamente.";
        } else if (response.status >= 500) {
          detail = "Erro interno do servidor. Tente novamente.";
        }
      } catch {
        if (response.status === 504) detail = "Timeout do servidor. O workflow demorou demais. Tente novamente.";
        else if (response.status >= 500) detail = "Erro interno do servidor. Tente novamente.";
      }
      throw new Error(detail);
    }

    let data;
    const text = await response.text();
    if (!text?.trim()) throw new Error("Resposta vazia do servidor. O workflow pode ter falhado.");
    try {
      data = JSON.parse(text);
    } catch (e) {
      if (e.name === "AbortError") throw new Error("Timeout: o workflow demorou mais de 5 minutos. Tente novamente.");
      throw new Error("Resposta inválida do servidor. Tente novamente.");
    }

    const rawData = data.body && typeof data.body === "object" ? data.body : data.data && typeof data.data === "object" ? data.data : data;
    state.researchSheetsUrl = rawData.sheets_url || data.sheets_url || null;
    state.reportUrl = rawData.report_url || data.report_url || null;
    state.reasoning = rawData.reasoning ?? data.reasoning ?? "";
    state.researchAnalysisSlides = rawData.analysis_slides || data.analysis_slides || null;

    if (data.error && !state.researchSheetsUrl) {
      throw new Error(data.error?.detail || data.error?.message || data.error || "Erro ao gerar pesquisa.");
    }

    completeProgress();
    setTimeout(() => {
      showSection("result");
      resultActionsPresentation?.classList.add("hidden");
      resultActionsResearch?.classList.remove("hidden");
      const title = rawData.report_title || data.report_title || "Pesquisa de Mercado";
      resultInfo.textContent = title + (state.researchSheetsUrl ? " — planilha consolidada pronta" : "");
      resultInfo.classList.remove("result-info-error");
      openResearchSheetsBtn.style.display = state.researchSheetsUrl ? "" : "none";
      openReportBtn.style.display = (state.reportUrl && state.reportUrl !== state.researchSheetsUrl) ? "" : "none";
      $(".result-title").textContent = "Pesquisa Concluída";
      newBtn.textContent = "Nova pesquisa";
      if (resultReasoning) {
        resultReasoning.textContent = state.reasoning || "Nenhum raciocínio disponível.";
        resultReasoning.closest(".result-reasoning-wrap")?.classList.remove("hidden");
      }
      if (resultAnalysisWrap && resultAnalysisText) {
        if (state.researchAnalysisSlides) {
          resultAnalysisText.textContent = state.researchAnalysisSlides;
          resultAnalysisWrap.classList.remove("hidden");
        } else {
          resultAnalysisWrap.classList.add("hidden");
        }
      }
    }, 600);
  } catch (error) {
    showSection("error");
    errorMessage.textContent = error.message || "Erro desconhecido ao executar a pesquisa.";
  } finally {
    state.generating = false;
    researchExecuteBtn.disabled = false;
  }
}

function setResearchProgressSteps() {
  const steps = progressSteps?.querySelectorAll(".step");
  if (!steps || steps.length < 4) return;
  const labels = ["Coletando dados...", "Consolidando informações...", "Gerando relatório...", "Finalizando..."];
  steps.forEach((step, i) => {
    const label = step.querySelector(".step-label");
    if (label) label.textContent = labels[i] || label.textContent;
  });
  progressTitle.textContent = "Coletando dados...";
}

function setPresentationProgressSteps() {
  const steps = progressSteps?.querySelectorAll(".step");
  if (!steps || steps.length < 4) return;
  const labels = ["Analisando prompt", "Pesquisando dados", "Gerando conteúdo", "Criando slides"];
  steps.forEach((step, i) => {
    const label = step.querySelector(".step-label");
    if (label) label.textContent = labels[i] || label.textContent;
  });
}

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

  const isSlidesMode = getPresentationMode() === "slides";
  const webhookUrl = isSlidesMode ? CONFIG.slidesPromptWebhookUrl : CONFIG.webhookUrl;
  const formField = isSlidesMode ? "slides_prompt" : "prompt";

  state.generating = true;
  if (isSlidesMode) {
    const steps = progressSteps?.querySelectorAll(".step");
    if (steps?.length >= 4) {
      const labels = ["Analisando estrutura...", "Convertendo para slides...", "Criando apresentação...", "Finalizando..."];
      steps.forEach((step, i) => {
        const label = step.querySelector(".step-label");
        if (label) label.textContent = labels[i] || label.textContent;
      });
    }
  } else {
    setPresentationProgressSteps();
  }
  showSection("progress");
  generateBtn.disabled = true;

  try {
    const formData = new FormData();
    formData.append(formField, prompt);
    state.files.forEach((file) => formData.append("files", file));

    simulateProgress(isSlidesMode ? "slides-prompt" : "presentation");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    const response = await fetch(webhookUrl, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let detail = `Erro ${response.status}`;
      const text = await response.text();
      try {
        if (text && text.trim()) {
          const errData = JSON.parse(text);
          detail = errData.message || errData.detail || detail;
        } else if (response.status === 504) {
          detail = "Timeout do servidor. O workflow demorou demais. Tente novamente.";
        } else if (response.status >= 500) {
          detail = "Erro interno do servidor. Tente novamente.";
        }
      } catch {
        if (response.status === 504) detail = "Timeout do servidor. O workflow demorou demais. Tente novamente.";
        else if (response.status >= 500) detail = "Erro interno do servidor. Tente novamente.";
      }
      throw new Error(detail);
    }

    let data;
    let responseError = null;
    state.reasoning = "";
    let text = "";

    try {
      text = await response.text();
      if (!text || !text.trim()) {
        throw new Error("Resposta vazia do servidor. O workflow pode ter falhado.");
      }
      data = JSON.parse(text);
    } catch (e) {
      if (e.name === "AbortError") {
        throw new Error("Timeout: o workflow demorou mais de 5 minutos. Tente novamente.");
      }
      if (e instanceof SyntaxError) {
        const hint = text && text.length > 0 ? " A resposta pode ter sido truncada ou estar em formato inesperado." : "";
        throw new Error("Resposta inválida do servidor." + hint + " Tente novamente.");
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
      resultActionsPresentation?.classList.remove("hidden");
      resultActionsResearch?.classList.add("hidden");
      $(".result-title").textContent = "Apresentação Gerada";
      newBtn.textContent = "Criar outra apresentação";
      if (responseError) {
        resultInfo.textContent = "Erro: " + sanitizeDisplayError(responseError);
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

function simulateProgress(mode = "presentation") {
  let progress = 0;
  let currentStep = 1;
  const titles = mode === "research"
    ? ["Coletando dados...", "Consolidando informações...", "Gerando relatório...", "Finalizando..."]
    : mode === "contract"
      ? ["Validando dados...", "Processando template...", "Gerando documento...", "Finalizando..."]
      : mode === "slides-prompt"
        ? ["Analisando estrutura...", "Convertendo para slides...", "Criando apresentação...", "Finalizando..."]
        : ["Analisando seu pedido...", "Pesquisando dados financeiros...", "Gerando conteúdo dos slides...", "Criando a apresentação..."];

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

openResearchSheetsBtn?.addEventListener("click", () => {
  if (state.researchSheetsUrl) window.open(state.researchSheetsUrl, "_blank");
});

openReportBtn?.addEventListener("click", () => {
  if (state.reportUrl) window.open(state.reportUrl, "_blank");
});

openContractDocBtn?.addEventListener("click", () => {
  if (state.docUrl) window.open(state.docUrl, "_blank");
});

openContractDownloadBtn?.addEventListener("click", () => {
  if (state.downloadUrl) window.open(state.downloadUrl, "_blank");
});

copyAnalysisBtn?.addEventListener("click", async () => {
  if (!state.researchAnalysisSlides) return;
  try {
    await navigator.clipboard.writeText(state.researchAnalysisSlides);
    const orig = copyAnalysisBtn.textContent;
    copyAnalysisBtn.textContent = "Copiado!";
    setTimeout(() => { copyAnalysisBtn.textContent = orig; }, 2000);
  } catch {
    copyAnalysisBtn.textContent = "Erro ao copiar";
    setTimeout(() => { copyAnalysisBtn.textContent = "Copiar"; }, 2000);
  }
});

// ============================================
// Reset / Retry
// ============================================

newBtn.addEventListener("click", resetUI);
retryBtn.addEventListener("click", () => {
  resetUI();
  if (state.currentView === "presentation" && promptInput.value.trim()) {
    handleGenerate();
  } else if (state.currentView === "market-research" && researchTopicInput?.value.trim()) {
    handleMarketResearchSubmit();
  } else if (state.currentView === "contracts" && contractTemplateId?.value.trim()) {
    handleContractSubmit();
  }
});

function resetUI() {
  showSection("form");
  state.slidesUrl = null;
  state.sheetsUrl = null;
  state.researchSheetsUrl = null;
  state.reportUrl = null;
  state.researchAnalysisSlides = null;
  state.docUrl = null;
  state.downloadUrl = null;
  state.docTitle = null;
  state.resultBlob = null;
  state.resultFilename = "";
  state.reasoning = "";
  if (resultReasoning) resultReasoning.textContent = "";
  resultReasoning?.closest(".result-reasoning-wrap")?.classList.add("hidden");
  openSlidesBtn.style.display = "";
  openSheetsBtn.style.display = "none";
  openResearchSheetsBtn && (openResearchSheetsBtn.style.display = "none");
  openReportBtn && (openReportBtn.style.display = "none");
  openContractDocBtn && (openContractDocBtn.style.display = "none");
  openContractDownloadBtn && (openContractDownloadBtn.style.display = "none");
  resultActionsPresentation?.classList.remove("hidden");
  resultActionsResearch?.classList.add("hidden");
  resultActionsContracts?.classList.add("hidden");
  $(".result-title").textContent = "Apresentação Gerada";
  newBtn.textContent = "Criar outra apresentação";
  clearInterval(progressInterval);
  progressBar.style.width = "0%";
  updateSteps(0);
  setPresentationProgressSteps();
}

// ============================================
// Section Visibility
// ============================================

function showSection(section) {
  sectionState = section;
  progressCard.classList.add("hidden");
  resultCard.classList.add("hidden");
  errorCard.classList.add("hidden");

  if (section === "form") {
    showView(state.currentView);
  } else {
    viewPresentation?.classList.add("hidden");
    viewMarketResearch?.classList.add("hidden");
    viewContracts?.classList.add("hidden");
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
  const maxH = getPresentationMode() === "slides" ? 600 : 300;
  promptInput.style.height = "auto";
  promptInput.style.height = Math.min(promptInput.scrollHeight, maxH) + "px";
});
