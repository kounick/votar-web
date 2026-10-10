/*
    VotAR web : interface de la version navigateur.
    Le coeur de reconnaissance (C++ d'origine de Stephane Poinsart) tourne en WebAssembly.
    Licence : GNU Affero General Public License v3 ou ultérieure.
*/
import createVotar from "./votar.js";

// Photos au-delà de cette taille : dimensions divisées par 2, comme computeSampleSize
// dans l'application Android. 13 millions de pixels laissent passer un iPhone de 12 Mpx
// en pleine résolution et restent sous la limite des canvas de Safari (16,7 Mpx).
const MAX_PIXELS = 13_000_000;
const HELP_URL = "https://votar.libre-innovation.org/help/";
// Couleur d'affichage de chaque choix (a, b, c, d), identique aux barres et aux marques Android.
const COLORS = ["#00ff00", "#ff00ff", "#ffff00", "#00ffff"];

const $ = (id) => document.getElementById(id);
const stage = $("stage"), photo = $("photo"), statusEl = $("status");

let modulePromise = null;
const getModule = () => (modulePromise ??= createVotar());

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}

const nextPaint = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// Charge la photo. L'élément <img> applique lui-même l'orientation EXIF.
async function loadImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function targetSize(w, h) {
  while (w * h > MAX_PIXELS) { w = Math.floor(w / 2); h = Math.floor(h / 2); }
  return [w, h];
}

function showResults(prcount) {
  const max = Math.max(0, ...prcount);
  prcount.forEach((n, i) => {
    $(`label${i}`).textContent = `${String.fromCharCode(97 + i)}: ${n}`;
    $(`fill${i}`).style.width = max ? `${(n / max) * 100}%` : "0";
  });
}

// Dessine les marques comme la version Android : un carré de la couleur du choix,
// de côté 2 * burnradius, centré sur chaque carton reconnu.
function drawMarks(ctx, width, height, marks) {
  const r = 8 + Math.floor(Math.max(width, height) / 256);
  for (const [x, y, pr] of marks) {
    ctx.fillStyle = COLORS[pr];
    ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
}

function readMarks(m, count) {
  const base = m._votar_marks() >> 2;
  const marks = [];
  for (let i = 0; i < count; i++) marks.push([m.HEAP32[base + 3 * i], m.HEAP32[base + 3 * i + 1], m.HEAP32[base + 3 * i + 2]]);
  return marks;
}

async function analyzeFile(file) {
  document.body.classList.add("busy");
  try {
    setStatus("Chargement de la photo…");
    await nextPaint();
    const img = await loadImage(file);
    const [w, h] = targetSize(img.naturalWidth, img.naturalHeight);

    const work = document.createElement("canvas");
    work.width = w; work.height = h;
    const wctx = work.getContext("2d", { willReadFrequently: true });
    wctx.imageSmoothingQuality = "high";
    wctx.drawImage(img, 0, 0, w, h);
    const rgba = wctx.getImageData(0, 0, w, h).data;

    setStatus("Analyse en cours…");
    await nextPaint();
    const m = await getModule();
    const ptr = m._malloc(w * h * 4);
    if (!ptr) throw new Error("mémoire insuffisante");
    let count, prcount, marks;
    try {
      m.HEAPU8.set(rgba, ptr);
      count = m._votar_analyze(ptr, w, h);
      if (count < 0) throw new Error("l'analyse a échoué");
      const prBase = m._votar_prcount() >> 2;
      prcount = [0, 1, 2, 3].map((i) => m.HEAP32[prBase + i]);
      marks = readMarks(m, count);
    } finally {
      m._free(ptr);
    }

    photo.width = w; photo.height = h;
    const ctx = photo.getContext("2d");
    ctx.drawImage(work, 0, 0);
    drawMarks(ctx, w, h, marks);
    stage.classList.add("has-photo");
    showResults(prcount);
    setStatus(`${count} vote${count > 1 ? "s" : ""} détecté${count > 1 ? "s" : ""}.`);
    // Pour les tests automatiques
    window.__votarResult = { width: w, height: h, prcount, markcount: count, marks };
  } catch (err) {
    console.error(err);
    setStatus(`Impossible d'analyser cette photo (${err.message || err}).`, true);
  } finally {
    document.body.classList.remove("busy");
  }
}

for (const id of ["inputCamera", "inputGallery"]) {
  const input = $(id);
  input.addEventListener("change", () => {
    const file = input.files && input.files[0];
    input.value = ""; // permet de reprendre la même photo
    if (file) analyzeFile(file);
  });
}
$("intro").addEventListener("click", () => window.open(HELP_URL, "_blank", "noopener"));

showResults([0, 0, 0, 0]);
// Charge le module en arrière-plan pour que la première analyse démarre vite.
(window.requestIdleCallback || setTimeout)(() => getModule().catch(() => {}));

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
