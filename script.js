const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

const toggleCameraButton = document.getElementById("toggleCamera");
const captureButton = document.getElementById("captureButton");
const downloadButton = document.getElementById("downloadButton");
const retakeButton = document.getElementById("retakeButton");

const cameraStatus = document.getElementById("cameraStatus");
const cameraPlaceholder = document.getElementById("cameraPlaceholder");
const liveTag = document.getElementById("liveTag");
const message = document.getElementById("message");
const identityInput = document.getElementById("identity");
const resultImage = document.getElementById("resultImage");
const resultPlaceholder = document.getElementById("resultPlaceholder");

const filterButtons = document.querySelectorAll(".filter-option");

let cameraStream = null;
let selectedFilter = "none";

const filters = {
  none: "none",
  grayscale: "grayscale(100%)",
  sepia: "sepia(100%)",
  contrast: "contrast(1.35) saturate(1.15)"
};

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle("error", isError);
}

function updateCameraInterface(isOn) {
  cameraStatus.classList.toggle("active", isOn);
  cameraStatus.classList.toggle("inactive", !isOn);

  cameraStatus.innerHTML = `
    <span class="status-dot"></span>
    ${isOn ? "Ligada" : "Desligada"}
  `;

  toggleCameraButton.textContent = isOn
    ? "■ Desligar câmera"
    : "▶ Ligar câmera";

  toggleCameraButton.classList.toggle("button-primary", !isOn);
  toggleCameraButton.classList.toggle("button-secondary", isOn);

  captureButton.disabled = !isOn;
  video.style.display = isOn ? "block" : "none";
  cameraPlaceholder.style.display = isOn ? "none" : "flex";
  liveTag.style.display = isOn ? "block" : "none";
}

async function startCamera() {
  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    showMessage(
      "Seu navegador não oferece acesso à câmera. " +
      "Abra a página usando HTTPS ou um servidor local.",
      true
    );
    return;
  }

  try {
    showMessage("Solicitando permissão para acessar a câmera...");

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user"
      },
      audio: false
    });

    video.srcObject = cameraStream;
    await video.play();

    updateCameraInterface(true);

    showMessage(
      "Câmera ligada! Escolha um efeito e capture sua foto."
    );
  } catch (error) {
    cameraStream = null;
    updateCameraInterface(false);

    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    ) {
      showMessage(
        "Acesso negado. Permita o uso da câmera nas configurações do navegador.",
        true
      );
    } else if (
      error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError"
    ) {
      showMessage(
        "Nenhuma câmera foi encontrada neste dispositivo.",
        true
      );
    } else if (
      error.name === "NotReadableError" ||
      error.name === "TrackStartError"
    ) {
      showMessage(
        "A câmera pode estar sendo usada por outro aplicativo. Feche-o e tente novamente.",
        true
      );
    } else {
      showMessage(
        "Não foi possível iniciar a câmera. Verifique a permissão e tente novamente.",
        true
      );
    }
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => {
      track.stop();
    });

    cameraStream = null;
  }

  video.pause();
  video.srcObject = null;

  updateCameraInterface(false);

  showMessage(
    "Câmera desligada. O acesso ao dispositivo foi encerrado."
  );
}

function capturePhoto() {
  if (
    !cameraStream ||
    !video.videoWidth ||
    !video.videoHeight
  ) {
    showMessage(
      "Ligue a câmera e aguarde a imagem aparecer antes de capturar.",
      true
    );
    return;
  }

  const width = video.videoWidth;
  const height = video.videoHeight;

  canvas.width = width;
  canvas.height = height;

  // Aplica o efeito visual à imagem capturada.
  context.save();

  context.filter = filters[selectedFilter] || "none";

  // Espelha a imagem para combinar com a prévia da câmera frontal.
  context.translate(width, 0);
  context.scale(-1, 1);

  context.drawImage(video, 0, 0, width, height);

  context.restore();
  context.filter = "none";

  const captureDate = new Date();

  // Desenha a identificação, a data e a hora na fotografia.
  drawIdentification(captureDate);

  resultImage.src = canvas.toDataURL("image/png");
  resultImage.hidden = false;
  resultPlaceholder.hidden = true;

  downloadButton.disabled = false;
  retakeButton.disabled = false;

  showMessage(
    "Foto capturada e processada! Você já pode salvar a imagem em PNG."
  );
}

function drawIdentification(date) {
  const width = canvas.width;
  const height = canvas.height;

  const scale = Math.max(1, width / 640);
  const padding = 18 * scale;
  const titleSize = Math.max(16, 22 * scale);
  const detailSize = Math.max(12, 14 * scale);

  const identity =
    identityInput.value.trim() || "Minha captura";

  const dateText = date.toLocaleDateString("pt-BR");

  const timeText = date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const panelHeight = Math.max(
    76 * scale,
    padding * 2 + titleSize + detailSize + 10 * scale
  );

  // Cria uma faixa escura para facilitar a leitura do texto.
  context.save();

  context.fillStyle = "rgba(18, 22, 49, 0.78)";

  context.fillRect(
    0,
    height - panelHeight,
    width,
    panelHeight
  );

  context.textAlign = "left";
  context.textBaseline = "alphabetic";

  context.fillStyle = "#ffffff";
  context.font = `700 ${titleSize}px Arial, sans-serif`;

  // Evita que identificações muito longas ultrapassem a imagem.
  let safeIdentity = identity;
  const maxTextWidth = width - padding * 2;

  while (
    context.measureText(safeIdentity).width > maxTextWidth &&
    safeIdentity.length > 4
  ) {
    safeIdentity = safeIdentity.slice(0, -2) + "…";
  }

  context.fillText(
    safeIdentity,
    padding,
    height - padding - detailSize - 7 * scale
  );

  context.fillStyle = "#d9ddff";
  context.font = `400 ${detailSize}px Arial, sans-serif`;

  context.fillText(
    `Capturada em ${dateText} às ${timeText}`,
    padding,
    height - padding
  );

  context.restore();
}

function downloadPhoto() {
  if (!canvas.width || !canvas.height) {
    showMessage(
      "Faça uma captura antes de salvar a imagem.",
      true
    );
    return;
  }

  const link = document.createElement("a");

  link.download = `capturecam-${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");

  link.click();
}

function clearPreview() {
  resultImage.hidden = true;
  resultImage.removeAttribute("src");

  resultPlaceholder.hidden = false;

  downloadButton.disabled = true;
  retakeButton.disabled = true;

  showMessage(
    cameraStream
      ? "Pronto para outra captura."
      : "Ligue a câmera para fazer uma nova captura."
  );
}

// Liga ou desliga a câmera.
toggleCameraButton.addEventListener("click", () => {
  if (cameraStream) {
    stopCamera();
  } else {
    startCamera();
  }
});

// Realiza a captura.
captureButton.addEventListener("click", capturePhoto);

// Salva a imagem final.
downloadButton.addEventListener("click", downloadPhoto);

// Limpa a prévia para permitir uma nova captura.
retakeButton.addEventListener("click", clearPreview);

// Seleciona o efeito que será usado na próxima fotografia.
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedFilter = button.dataset.filter;

    filterButtons.forEach((option) => {
      const isSelected = option === button;

      option.classList.toggle("selected", isSelected);
      option.setAttribute("aria-pressed", String(isSelected));
    });

    showMessage(
      `Efeito selecionado: ${button.textContent.trim()}. ` +
      "Ele será aplicado na próxima captura."
    );
  });
});

// Encerra as faixas da câmera ao fechar ou recarregar a página.
window.addEventListener("pagehide", stopCamera);