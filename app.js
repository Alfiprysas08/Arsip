// =========================================================
// ARSIP — app.js (Firebase Auth Email/Password + Realtime DB)
// Data disimpan per auth.uid (aman)
// =========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  get,
  set,
  update
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

// ---- Firebase Config ----
const firebaseConfig = {
  apiKey: "AIzaSyC6X0rtygaPB-kKjdi04TBFk2uOi_-8Y10",
  authDomain: "arsip-1f759.firebaseapp.com",
  databaseURL: "https://arsip-1f759-default-rtdb.firebaseio.com",
  projectId: "arsip-1f759",
  storageBucket: "arsip-1f759.firebasestorage.app",
  messagingSenderId: "682994193804",
  appId: "1:682994193804:web:df495b0d3b2dae602ab2a9",
  measurementId: "G-QNRP7M63B2"
};

// ---- Init ----
const app = initializeApp(firebaseConfig);
try { getAnalytics(app); } catch (_) {}

const auth = getAuth(app);
const db = getDatabase(app);

// Persist login
setPersistence(auth, browserLocalPersistence).catch(() => {});

// ---- Constants ----
const YEAR_REFLECTION = 2025;
const DEADLINE_MS = 1769533200000; // 2026-01-28

// ---- DOM helpers ----
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// ---- Elements ----
const authGate = $("#authGate");
const appEl = $("#app");

const tabLogin = $("#tabLogin");
const tabRegister = $("#tabRegister");
const panelLogin = $("#panelLogin");
const panelRegister = $("#panelRegister");
const goRegister = $("#goRegister");
const goLogin = $("#goLogin");

const loginForm = $("#loginForm");
const registerForm = $("#registerForm");
const authMessage = $("#authMessage");

const currentUserEl = $("#currentUser");
const logoutBtn = $("#logoutBtn");

const navBtns = $$(".nav-btn");
const viewUmum = $("#viewUmum");
const viewPersonal = $("#viewPersonal");

const subtabBtns = $$(".subtab-btn");
const subMiraz = $("#subMiraz");
const subIsra = $("#subIsra");

const saveMirazBtn = $("#saveMirazBtn");
const saveIsraBtn = $("#saveIsraBtn");
const savePersonalBtn = $("#savePersonalBtn");

const mirazStatus = $("#mirazStatus");
const israStatus = $("#israStatus");
const personalStatus = $("#personalStatus");

// ---- UI helpers ----
function setAuthMessage(text = "") {
  if (authMessage) authMessage.textContent = text;
}

function setStatus(el, text = "") {
  if (el) el.textContent = text;
}

function showAuth() {
  authGate.hidden = false;
  appEl.hidden = true;
}

function showApp() {
  authGate.hidden = true;
  appEl.hidden = false;
}

function nowISO() {
  return new Date().toISOString();
}

function isDeadlinePassed() {
  return Date.now() > DEADLINE_MS;
}

// ---- Navigation ----
function activateAuthTab(which) {
  const isLogin = which === "login";

  tabLogin.classList.toggle("is-active", isLogin);
  tabRegister.classList.toggle("is-active", !isLogin);

  tabLogin.setAttribute("aria-selected", String(isLogin));
  tabRegister.setAttribute("aria-selected", String(!isLogin));

  if (isLogin) {
    panelLogin.hidden = false;
    panelRegister.hidden = true;
    panelLogin.classList.add("is-active");
    panelRegister.classList.remove("is-active");
  } else {
    panelLogin.hidden = true;
    panelRegister.hidden = false;
    panelLogin.classList.remove("is-active");
    panelRegister.classList.add("is-active");
  }

  setAuthMessage("");
}

function setMainView(view) {
  navBtns.forEach(btn => btn.classList.toggle("is-active", btn.dataset.view === view));

  if (view === "personal") {
    viewUmum.hidden = true;
    viewPersonal.hidden = false;
    viewUmum.classList.remove("is-active");
    viewPersonal.classList.add("is-active");
  } else {
    viewUmum.hidden = false;
    viewPersonal.hidden = true;
    viewUmum.classList.add("is-active");
    viewPersonal.classList.remove("is-active");
  }
}

function setSubView(sub) {
  subtabBtns.forEach(btn => {
    const active = btn.dataset.subview === sub;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", String(active));
  });

  if (sub === "isra") {
    subMiraz.hidden = true;
    subIsra.hidden = false;
    subMiraz.classList.remove("is-active");
    subIsra.classList.add("is-active");
  } else {
    subMiraz.hidden = false;
    subIsra.hidden = true;
    subMiraz.classList.add("is-active");
    subIsra.classList.remove("is-active");
  }
}

// ---- DB paths (per uid) ----
function profilePath(uid) {
  return `users/${uid}`;
}

function reflectionsRootPath(uid) {
  return `reflections/${uid}/${YEAR_REFLECTION}`;
}

// ---- Reflections: collect/fill ----
function collectGroupAnswers(groupName) {
  const els = $$(`textarea[data-group="${groupName}"]`);
  const data = {};
  for (const el of els) {
    const key = el.dataset.key;
    data[key] = (el.value || "").trim();
  }
  return data;
}

function fillGroupAnswers(groupName, values) {
  const els = $$(`textarea[data-group="${groupName}"]`);
  for (const el of els) {
    const key = el.dataset.key;
    if (Object.prototype.hasOwnProperty.call(values || {}, key)) {
      el.value = values[key] ?? "";
    }
  }
}

async function saveGroup(uid, groupName, statusEl) {
  if (isDeadlinePassed()) {
    setStatus(statusEl, "Masa pengisian sudah berakhir ⛔");
    return;
  }

  const data = collectGroupAnswers(groupName);
  const root = ref(db, reflectionsRootPath(uid));

  setStatus(statusEl, "Menyimpan...");
  await update(root, {
    [groupName]: { ...data, updatedAt: nowISO() }
  });
  setStatus(statusEl, "Tersimpan ✅");
  setTimeout(() => setStatus(statusEl, ""), 2500);
}

async function loadAllReflections(uid) {
  const snap = await get(ref(db, reflectionsRootPath(uid)));
  if (!snap.exists()) return;

  const all = snap.val() || {};
  if (all.miraz) fillGroupAnswers("miraz", all.miraz);
  if (all.isra) fillGroupAnswers("isra", all.isra);
  if (all.personal) fillGroupAnswers("personal", all.personal);
}

// ---- Enter app ----
async function enterApp(user) {
  showApp();
  setMainView("umum");
  setSubView("miraz");

  // Tampilkan email / atau nama profil kalau ada
  let label = user.email || "User";
  try {
    const profSnap = await get(ref(db, profilePath(user.uid)));
    if (profSnap.exists() && profSnap.val()?.displayName) {
      label = profSnap.val().displayName;
    }
  } catch (_) {}

  currentUserEl.textContent = label;

  // Load existing answers
  await loadAllReflections(user.uid);
}

async function leaveApp() {
  await signOut(auth);
  showAuth();
  activateAuthTab("login");
}

// ---- Auth actions ----
async function registerWithEmail(email, password) {
  if (isDeadlinePassed()) throw new Error("Pendaftaran sudah ditutup.");
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // optional: simpan profil user
  await set(ref(db, profilePath(cred.user.uid)), {
    email,
    createdAt: nowISO()
  });

  return cred.user;
}

async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// ---- Bindings ----
function bindAuthUI() {
  tabLogin?.addEventListener("click", () => activateAuthTab("login"));
  tabRegister?.addEventListener("click", () => activateAuthTab("register"));
  goRegister?.addEventListener("click", () => activateAuthTab("register"));
  goLogin?.addEventListener("click", () => activateAuthTab("login"));
}

function bindMainNavUI() {
  navBtns.forEach(btn => btn.addEventListener("click", () => setMainView(btn.dataset.view)));
  subtabBtns.forEach(btn => btn.addEventListener("click", () => setSubView(btn.dataset.subview)));
}

function bindAuthForms() {
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setAuthMessage("");

    const email = ($("#loginEmail")?.value || "").trim();
    const password = $("#loginPassword")?.value || "";

    if (!email.includes("@")) return setAuthMessage("Masukkan email yang valid.");
    if (password.length < 6) return setAuthMessage("Password minimal 6 karakter.");

    try {
      setAuthMessage("Memproses login...");
      await loginWithEmail(email, password);
      setAuthMessage("");
    } catch (err) {
      const code = err?.code || "";
      if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password")) {
        setAuthMessage("Email atau password salah.");
      } else if (code.includes("auth/user-not-found")) {
        setAuthMessage("Akun tidak ditemukan. Silakan daftar dulu.");
      } else {
        setAuthMessage(err?.message || "Login gagal.");
      }
    }
  });

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    setAuthMessage("");

    const email = ($("#regEmail")?.value || "").trim();
    const pass1 = $("#regPassword")?.value || "";
    const pass2 = $("#regPassword2")?.value || "";

    if (!email.includes("@")) return setAuthMessage("Masukkan email yang valid.");
    if (pass1.length < 6) return setAuthMessage("Password minimal 6 karakter.");
    if (pass1 !== pass2) return setAuthMessage("Konfirmasi password tidak sama.");

    try {
      setAuthMessage("Membuat akun...");
      await registerWithEmail(email, pass1);
      setAuthMessage("");
    } catch (err) {
      const code = err?.code || "";
      if (code.includes("auth/email-already-in-use")) {
        setAuthMessage("Email sudah terdaftar. Silakan login.");
      } else {
        setAuthMessage(err?.message || "Daftar gagal.");
      }
    }
  });
}

function bindSaveButtons() {
  saveMirazBtn?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;
    try { await saveGroup(user.uid, "miraz", mirazStatus); }
    catch (e) { setStatus(mirazStatus, "Gagal menyimpan ❌"); console.warn(e); }
  });

  saveIsraBtn?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;
    try { await saveGroup(user.uid, "isra", israStatus); }
    catch (e) { setStatus(israStatus, "Gagal menyimpan ❌"); console.warn(e); }
  });

  savePersonalBtn?.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return;
    try { await saveGroup(user.uid, "personal", personalStatus); }
    catch (e) { setStatus(personalStatus, "Gagal menyimpan ❌"); console.warn(e); }
  });
}

function bindLogout() {
  logoutBtn?.addEventListener("click", () => {
    leaveApp().catch(console.warn);
  });
}

// ---- Boot ----
document.addEventListener("DOMContentLoaded", () => {
  activateAuthTab("login");
  bindAuthUI();
  bindMainNavUI();
  bindAuthForms();
  bindSaveButtons();
  bindLogout();

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await enterApp(user);
    } else {
      showAuth();
      setAuthMessage("");
    }
  });
});
