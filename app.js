// Julia's Pups - swipe-to-save puppy lookbook

const TOTAL_PUPS = 100;
const STORAGE_KEY = "juliasPups.album";

const PUP_NAMES = [
  "Bella", "Luna", "Daisy", "Lucy", "Lily", "Molly", "Sadie", "Stella", "Maggie", "Rosie",
  "Coco", "Nala", "Pepper", "Hazel", "Willow", "Ruby", "Penny", "Olive", "Zoe", "Mia",
  "Charlie", "Max", "Buddy", "Cooper", "Milo", "Rocky", "Bear", "Teddy", "Finn", "Oliver",
  "Toby", "Leo", "Murphy", "Duke", "Jack", "Louie", "Ollie", "Rusty", "Biscuit", "Waffles",
  "Mochi", "Peanut", "Pumpkin", "Marshmallow", "Cookie", "Noodle", "Pickle", "Banjo", "Scout", "Winston",
];

const state = {
  pups: [],           // queue of remaining {id, url}
  history: [],        // [{pup, action}] for undo
  album: loadAlbum(), // saved urls (array of strings, ordered newest first)
};

// ---------- Boot ----------
floatHearts();
wireTabs();
wireButtons();
loadPuppies();
renderAlbum();
updateBadge();

// ---------- Data ----------
async function loadPuppies() {
  try {
    // Dog CEO API - free, no key, plenty of puppy/golden/etc breeds.
    // Mix sources for variety: some puppy-tagged, some popular cute breeds.
    const queries = [
      `https://dog.ceo/api/breed/retriever/golden/images/random/30`,
      `https://dog.ceo/api/breed/pomeranian/images/random/15`,
      `https://dog.ceo/api/breed/corgi/images/random/15`,
      `https://dog.ceo/api/breed/samoyed/images/random/10`,
      `https://dog.ceo/api/breed/husky/images/random/10`,
      `https://dog.ceo/api/breed/maltese/images/random/10`,
      `https://dog.ceo/api/breeds/image/random/${TOTAL_PUPS}`, // filler for variety
    ];
    const results = await Promise.all(
      queries.map(u =>
        fetch(u)
          .then(r => r.json())
          .catch(err => { console.warn("Pup fetch failed:", u, err); return { message: [] }; })
      )
    );
    let urls = results.flatMap(r => Array.isArray(r.message) ? r.message : []);
    console.log(`Fetched ${urls.length} pup urls from ${results.length} queries`);
    urls = shuffle(unique(urls)).slice(0, TOTAL_PUPS);

    if (urls.length === 0) {
      // Fallback: try the simplest endpoint one more time
      const fallback = await fetch(`https://dog.ceo/api/breeds/image/random/${TOTAL_PUPS}`)
        .then(r => r.json())
        .catch(() => ({ message: [] }));
      if (Array.isArray(fallback.message) && fallback.message.length > 0) {
        urls = shuffle(unique(fallback.message)).slice(0, TOTAL_PUPS);
      } else {
        throw new Error("No images returned");
      }
    }

    state.pups = urls.map((url, i) => ({ id: `pup-${i}-${hash(url)}`, url, breed: breedFromUrl(url), age: ageFromUrl(url), name: nameFromUrl(url) }));
    renderStack();
    updateCounter();
  } catch (err) {
    console.error(err);
    document.getElementById("cardStack").innerHTML = `
      <div class="no-more">
        <div class="big-heart">😿</div>
        <p>Couldn't fetch pups. Check your internet & try again.</p>
        <button onclick="location.reload()">Retry</button>
      </div>`;
  }
}

function breedFromUrl(url) {
  // Dog CEO urls look like: https://images.dog.ceo/breeds/retriever-golden/n02099601_123.jpg
  const m = url.match(/\/breeds\/([^/]+)\//);
  if (!m) return "Mystery Pup";
  const parts = m[1].split("-");
  // "retriever-golden" -> "Golden Retriever", "bulldog-french" -> "French Bulldog"
  const ordered = parts.length > 1 ? [parts[1], parts[0]] : parts;
  return ordered.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

// 32-bit unsigned integer hash of a string. Stable, well-distributed, safe for `%`.
function intHash(s) {
  let h = 2166136261 >>> 0; // FNV-1a basis
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function nameFromUrl(url) {
  const h = intHash("name:" + url);
  return PUP_NAMES[h % PUP_NAMES.length];
}

// Deterministic cute age based on the image url, so a given pup always has the same age.
function ageFromUrl(url) {
  const h = intHash("age:" + url);
  // 70% are puppies (weeks/months), 30% are older dogs (years)
  if (h % 10 < 7) {
    const months = (h % 11) + 2; // 2–12 months
    if (months < 4) {
      const weeks = (h % 6) + 6; // 6–11 weeks
      return `${weeks} weeks old`;
    }
    return `${months} months old`;
  }
  const years = (h % 12) + 1; // 1–12 years
  return years === 1 ? `1 year old` : `${years} years old`;
}

function unique(arr) { return [...new Set(arr)]; }
function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

// ---------- Album persistence ----------
function loadAlbum() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}
function saveAlbum() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.album));
}

// ---------- Render swipe stack ----------
function renderStack() {
  const stack = document.getElementById("cardStack");
  stack.innerHTML = "";

  if (state.pups.length === 0) {
    stack.innerHTML = `
      <div class="no-more">
        <div class="big-heart">💕🐾💕</div>
        <p><strong>That's all the pups!</strong><br/>You've seen every one.</p>
        <button onclick="switchView('album')">View My Album</button>
      </div>`;
    return;
  }

  // Render top 3 cards (top first in DOM order = topmost interactable)
  const top = state.pups.slice(0, 3);
  // Render in reverse so the first one ends up on top
  top.slice().reverse().forEach((pup, idx) => {
    const reverseIndex = top.length - 1 - idx; // 0 = topmost
    const card = document.createElement("div");
    card.className = "card";
    card.dataset.id = pup.id;
    const offset = reverseIndex * 6;
    const scale = 1 - reverseIndex * 0.04;
    card.style.transform = `translateY(${offset}px) scale(${scale})`;
    card.style.zIndex = String(10 - reverseIndex);
    card.innerHTML = `
      <img src="${pup.url}" alt="${escapeHtml(pup.breed)}" loading="eager" />
      <div class="breed-label">🐾 <span class="pup-name">${escapeHtml(pup.name)}</span> <span class="age">· ${escapeHtml(pup.breed)} · ${escapeHtml(pup.age)}</span></div>
      <div class="stamp like">Love</div>
      <div class="stamp nope">Nope</div>
    `;
    stack.appendChild(card);
    if (reverseIndex === 0) attachDrag(card, pup);
  });
}

// ---------- Drag / swipe ----------
function attachDrag(card, pup) {
  let startX = 0, startY = 0, currentX = 0, currentY = 0, dragging = false;

  const onDown = (e) => {
    dragging = true;
    const p = pointer(e);
    startX = p.x; startY = p.y;
    card.style.transition = "none";
  };
  const onMove = (e) => {
    if (!dragging) return;
    const p = pointer(e);
    currentX = p.x - startX;
    currentY = p.y - startY;
    const rot = currentX / 18;
    card.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rot}deg)`;
    const likeStamp = card.querySelector(".stamp.like");
    const nopeStamp = card.querySelector(".stamp.nope");
    likeStamp.style.opacity = Math.max(0, Math.min(1, currentX / 100));
    nopeStamp.style.opacity = Math.max(0, Math.min(1, -currentX / 100));
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    card.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    const threshold = 110;
    if (currentX > threshold) {
      swipe("right", pup, card);
    } else if (currentX < -threshold) {
      swipe("left", pup, card);
    } else {
      card.style.transform = "";
      card.querySelector(".stamp.like").style.opacity = 0;
      card.querySelector(".stamp.nope").style.opacity = 0;
    }
  };

  card.addEventListener("pointerdown", (e) => { card.setPointerCapture(e.pointerId); onDown(e); });
  card.addEventListener("pointermove", onMove);
  card.addEventListener("pointerup", onUp);
  card.addEventListener("pointercancel", onUp);
}

function pointer(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

// ---------- Swipe action ----------
function swipe(direction, pup, cardEl) {
  if (!pup) return;
  // Find the corresponding pup at top of queue (cardEl may not match if user clicked button)
  const top = state.pups[0];
  if (!top) return;
  const actualPup = top;
  const topCard = document.querySelector(`.card[data-id="${actualPup.id}"]`);
  const el = topCard || cardEl;
  if (!el) return;

  el.classList.add(direction === "right" ? "gone-right" : "gone-left");

  if (direction === "right") {
    if (!state.album.includes(actualPup.url)) {
      state.album.unshift(actualPup.url);
      saveAlbum();
      updateBadge();
      renderAlbum();
      heartBurst();
    }
  }
  state.history.push({ pup: actualPup, action: direction });
  state.pups.shift();

  setTimeout(() => {
    renderStack();
    updateCounter();
  }, 280);
}

function undo() {
  const last = state.history.pop();
  if (!last) return;
  state.pups.unshift(last.pup);
  if (last.action === "right") {
    state.album = state.album.filter(u => u !== last.pup.url);
    saveAlbum();
    updateBadge();
    renderAlbum();
  }
  renderStack();
  updateCounter();
}

function updateCounter() {
  const seen = TOTAL_PUPS - state.pups.length;
  document.getElementById("counter").textContent =
    state.pups.length === 0
      ? `All ${TOTAL_PUPS} pups seen! 🎉`
      : `${seen + 1} / ${TOTAL_PUPS} · ${state.album.length} saved 💖`;
}

// ---------- Buttons + tabs ----------
function wireButtons() {
  document.getElementById("likeBtn").addEventListener("click", () => {
    const top = state.pups[0]; if (top) swipe("right", top);
  });
  document.getElementById("nopeBtn").addEventListener("click", () => {
    const top = state.pups[0]; if (top) swipe("left", top);
  });
  document.getElementById("undoBtn").addEventListener("click", undo);
  document.getElementById("clearBtn").addEventListener("click", () => {
    if (state.album.length === 0) return;
    if (confirm("Clear all saved pups from your album?")) {
      state.album = [];
      saveAlbum();
      renderAlbum();
      updateBadge();
    }
  });
}

function wireTabs() {
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
}

function switchView(view) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === view));
  document.getElementById("swipeView").classList.toggle("active", view === "swipe");
  document.getElementById("albumView").classList.toggle("active", view === "album");
}
window.switchView = switchView;

// ---------- Album rendering ----------
function renderAlbum() {
  const grid = document.getElementById("albumGrid");
  const empty = document.getElementById("emptyAlbum");
  grid.innerHTML = "";
  if (state.album.length === 0) {
    empty.style.display = "block";
    grid.style.display = "none";
    return;
  }
  empty.style.display = "none";
  grid.style.display = "grid";
  state.album.forEach(url => {
    const breed = breedFromUrl(url);
    const age = ageFromUrl(url);
    const name = nameFromUrl(url);
    const item = document.createElement("div");
    item.className = "album-item";
    item.title = `${name} · ${breed} · ${age}`;
    item.innerHTML = `
      <img src="${url}" alt="${escapeHtml(name)} the ${escapeHtml(breed)}" loading="lazy" />
      <div class="breed-label small">🐾 <span class="pup-name">${escapeHtml(name)}</span> <span class="age">· ${escapeHtml(breed)} · ${escapeHtml(age)}</span></div>
      <span class="corner-heart">💖</span>
      <button class="remove" title="Remove">✕</button>
    `;
    item.querySelector(".remove").addEventListener("click", () => {
      state.album = state.album.filter(u => u !== url);
      saveAlbum();
      renderAlbum();
      updateBadge();
    });
    grid.appendChild(item);
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function updateBadge() {
  document.getElementById("albumBadge").textContent = state.album.length;
}

// ---------- Eye candy ----------
function floatHearts() {
  const bg = document.getElementById("heartsBg");
  const emojis = ["💕", "💖", "💗", "🩷", "🐾", "💞"];
  for (let i = 0; i < 18; i++) {
    const h = document.createElement("span");
    h.className = "heart";
    h.textContent = emojis[i % emojis.length];
    h.style.left = Math.random() * 100 + "vw";
    h.style.fontSize = (16 + Math.random() * 22) + "px";
    h.style.animationDuration = (10 + Math.random() * 14) + "s";
    h.style.animationDelay = (-Math.random() * 20) + "s";
    bg.appendChild(h);
  }
}

function heartBurst() {
  for (let i = 0; i < 8; i++) {
    const h = document.createElement("span");
    h.textContent = "💖";
    h.style.position = "fixed";
    h.style.left = (50 + (Math.random() - 0.5) * 30) + "vw";
    h.style.top = "55vh";
    h.style.fontSize = (20 + Math.random() * 20) + "px";
    h.style.pointerEvents = "none";
    h.style.zIndex = "9999";
    h.style.transition = "all 1s ease-out";
    document.body.appendChild(h);
    requestAnimationFrame(() => {
      h.style.transform = `translate(${(Math.random() - 0.5) * 300}px, ${-200 - Math.random() * 150}px) scale(1.4)`;
      h.style.opacity = "0";
    });
    setTimeout(() => h.remove(), 1100);
  }
}
