const $ = (id) => document.getElementById(id);
const welcomeStep = $("welcomeStep");
const photoStep = $("photoStep");
const partyStep = $("partyStep");
const mediaInput = $("mediaInput");
const chooseBtn = $("chooseBtn");
const uploadBtn = $("uploadBtn");
const consentCheck = $("consentCheck");
const fileList = $("fileList");
const progressPanel = $("progressPanel");
const progressFill = $("progressFill");
const progressPercent = $("progressPercent");
const progressStatus = $("progressStatus");
const progressCount = $("progressCount");
const progressSize = $("progressSize");
const uploadError = $("uploadError");
const MAX_FILE_BYTES = 4 * 1024 * 1024;
let selectedFiles = [];
let uploadedFiles = new Set();
let currentPreviewUrl = null;
let isUploading = false;

$("startBtn").addEventListener("click", () => {
  welcomeStep.classList.add("hidden");
  photoStep.classList.remove("hidden");
  $("nameInput").focus();
});

chooseBtn.addEventListener("click", () => mediaInput.click());
mediaInput.addEventListener("change", () => {
  selectedFiles = Array.from(mediaInput.files || []);
  uploadedFiles.clear();
  renderFileList();
  updateUploadButton();
  if (selectedFiles.length) {
    progressPanel.classList.add("hidden");
    uploadError.classList.add("hidden");
    setProgress(0);
  }
});

consentCheck.addEventListener("change", updateUploadButton);

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function renderFileList() {
  fileList.replaceChildren();
  if (!selectedFiles.length) {
    fileList.classList.add("hidden");
    $("selectionHint").textContent = "Choose at least one file and confirm consent to continue.";
    return;
  }
  fileList.classList.remove("hidden");
  $("selectionHint").textContent = selectedFiles.length + " file(s) selected · Review the list before sending.";
  selectedFiles.forEach((file, index) => {
    const row = document.createElement("div");
    row.className = "file-item";
    const icon = document.createElement("span");
    icon.className = "file-type";
    icon.textContent = file.type.startsWith("video/") ? "▶" : "▧";
    const meta = document.createElement("span");
    meta.className = "file-meta";
    const name = document.createElement("strong");
    name.textContent = file.name;
    const size = document.createElement("small");
    size.textContent = formatBytes(file.size) + (uploadedFiles.has(file) ? " · Sent ✓" : "");
    meta.append(name, size);
    const remove = document.createElement("button");
    remove.className = "file-remove";
    remove.type = "button";
    remove.setAttribute("aria-label", "Remove " + file.name);
    remove.textContent = "×";
    remove.disabled = isUploading;
    remove.addEventListener("click", () => {
      selectedFiles.splice(index, 1);
      uploadedFiles.delete(file);
      const transfer = new DataTransfer();
      selectedFiles.forEach(item => transfer.items.add(item));
      mediaInput.files = transfer.files;
      renderFileList();
      updateUploadButton();
    });
    row.append(icon, meta, remove);
    fileList.append(row);
  });
}

function updateUploadButton() {
  const tooLarge = selectedFiles.some(file => file.size > MAX_FILE_BYTES);
  uploadBtn.disabled = isUploading || !selectedFiles.length || !consentCheck.checked || tooLarge;
  if (tooLarge) $("selectionHint").textContent = "One or more files exceed 4 MB. Remove them or choose smaller files.";
  else if (selectedFiles.length && !consentCheck.checked) $("selectionHint").textContent = "Please confirm consent before sending files to the Telegram bot.";
}

function setProgress(percent) {
  const value = Math.max(0, Math.min(100, percent));
  progressFill.style.width = value + "%";
  progressPercent.textContent = Math.round(value) + "%";
}

function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read " + file.name));
    reader.readAsDataURL(file);
  });
}

function uploadOne(file, onProgress) {
  return readAsBase64(file).then(base64 => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/.netlify/functions/upload");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.upload.addEventListener("progress", event => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    });
    xhr.addEventListener("load", () => {
      let response = {};
      try { response = JSON.parse(xhr.responseText || "{}"); } catch (_) {}
      if (xhr.status >= 200 && xhr.status < 300 && response.success === true) resolve();
      else reject(new Error(response.error || "Telegram upload failed (HTTP " + xhr.status + ")."));
    });
    xhr.addEventListener("error", () => reject(new Error("Network error while sending " + file.name + ".")));
    xhr.addEventListener("timeout", () => reject(new Error("Upload timed out for " + file.name + ".")));
    xhr.timeout = 120000;
    const userName = $("nameInput").value.trim() || "Birthday guest";
    xhr.send(JSON.stringify({
      fileData: base64,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      caption: "Birthday memory shared with consent · From: " + userName
    }));
  }));
}

uploadBtn.addEventListener("click", async () => {
  if (isUploading || !selectedFiles.length || !consentCheck.checked) return;
  if (selectedFiles.some(file => file.size > MAX_FILE_BYTES)) {
    showError("Please remove files larger than 4 MB before uploading.");
    return;
  }
  isUploading = true;
  uploadBtn.disabled = true;
  chooseBtn.disabled = true;
  consentCheck.disabled = true;
  renderFileList();
  progressPanel.classList.remove("hidden");
  uploadError.classList.add("hidden");
  const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  let completedBytes = selectedFiles.filter(file => uploadedFiles.has(file)).reduce((sum, file) => sum + file.size, 0);
  setProgress(totalBytes ? completedBytes / totalBytes * 100 : 0);
  progressStatus.textContent = "Connecting to Telegram…";
  progressCount.textContent = uploadedFiles.size + " of " + selectedFiles.length + " files sent";
  progressSize.textContent = formatBytes(completedBytes) + " of " + formatBytes(totalBytes);

  try {
    for (const file of selectedFiles) {
      if (uploadedFiles.has(file)) continue;
      progressStatus.textContent = "Sending " + file.name;
      await uploadOne(file, fraction => {
        const liveBytes = completedBytes + file.size * fraction;
        setProgress(totalBytes ? liveBytes / totalBytes * 100 : 0);
        progressSize.textContent = formatBytes(liveBytes) + " of " + formatBytes(totalBytes);
      });
      uploadedFiles.add(file);
      completedBytes += file.size;
      setProgress(totalBytes ? completedBytes / totalBytes * 100 : 100);
      progressCount.textContent = uploadedFiles.size + " of " + selectedFiles.length + " files sent";
      progressSize.textContent = formatBytes(completedBytes) + " of " + formatBytes(totalBytes);
      renderFileList();
    }
    setProgress(100);
    progressStatus.textContent = "All files delivered successfully ✓";
    progressCount.textContent = selectedFiles.length + " of " + selectedFiles.length + " files sent";
    progressSize.textContent = formatBytes(totalBytes) + " sent";
    if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
    currentPreviewUrl = URL.createObjectURL(selectedFiles.find(file => file.type.startsWith("image/")) || selectedFiles[0]);
    $("cardPhoto").src = currentPreviewUrl;
    $("cardName").textContent = $("nameInput").value.trim() || "Happy Birthday";
    window.setTimeout(() => {
      photoStep.classList.add("hidden");
      partyStep.classList.remove("hidden");
    }, 650);
  } catch (error) {
    progressStatus.textContent = "Upload paused";
    showError(error.message + " Your successfully sent files are marked above. Tap retry to send the remaining files.");
  } finally {
    isUploading = false;
    chooseBtn.disabled = false;
    consentCheck.disabled = false;
    uploadBtn.textContent = uploadedFiles.size ? "Retry / send remaining files ↗" : "Send files & continue ↗";
    updateUploadButton();
    renderFileList();
  }
});

function showError(message) {
  uploadError.textContent = message;
  uploadError.classList.remove("hidden");
}

$("revealBtn").addEventListener("click", () => $("cakePopup").classList.remove("hidden"));
$("closeBtn").addEventListener("click", () => $("cakePopup").classList.add("hidden"));
$("cutBtn").addEventListener("click", () => {
  $("cake-glow");
  document.querySelector(".cake-glow").textContent = "🍰";
  $("cakeTitle").textContent = "Happy Birthday!";
  $("cakeMessage").classList.add("hidden");
  $("cutBtn").classList.add("hidden");
  $("finalWish").classList.remove("hidden");
  playBirthdayTune();
});
$("shareBtn").addEventListener("click", async () => {
  const shareData = { title: "A Birthday Surprise ✨", text: "I made a little birthday surprise for you!", url: window.location.href };
  try {
    if (navigator.share) await navigator.share(shareData);
    else if (navigator.clipboard) { await navigator.clipboard.writeText(window.location.href); toast("Link copied to clipboard!"); }
    else toast("Copy this page link from your browser.");
  } catch (error) {
    if (error.name !== "AbortError") toast("Couldn't open the share menu.");
  }
});

function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  window.setTimeout(() => element.classList.remove("show"), 2600);
}

function playBirthdayTune() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const notes = [[392,.28],[392,.28],[440,.55],[392,.55],[523,.55],[494,.9],[392,.28],[392,.28],[440,.55],[392,.55],[587,.55],[523,.9]];
  let start = context.currentTime;
  notes.forEach(([frequency,duration]) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001,start);
    gain.gain.exponentialRampToValueAtTime(.16,start+.04);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start+duration);
    start += duration+.04;
  });
  window.setTimeout(() => context.close(), 9000);
}
