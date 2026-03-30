/**
 * Firebase Auth + Firestore (perfil users/{uid}).
 * Ordem: login Firebase → tela de senha do painel → app (startTutemApp).
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

function $(id) {
  return document.getElementById(id);
}

function show(el, showIt) {
  if (!el) return;
  el.hidden = !showIt;
  el.setAttribute("aria-hidden", showIt ? "false" : "true");
}

function setLockVisible(visible) {
  const lock = $("lock-screen");
  if (!lock) return;
  if (visible) {
    lock.removeAttribute("data-unlocked");
  } else {
    lock.setAttribute("data-unlocked", "true");
  }
}

function setFirebaseScreenVisible(visible) {
  const wrap = $("firebase-auth-screen");
  show(wrap, visible);
}

function setAuthLoadingVisible(visible) {
  const el = $("firebase-auth-loading");
  show(el, visible);
  if (el) {
    el.setAttribute("aria-busy", visible ? "true" : "false");
  }
}

function setAppShellVisible(visible) {
  const shell = $("app-shell");
  if (!shell) return;
  shell.style.display = visible ? "flex" : "none";
}

function showFirebaseError(msg) {
  const el = $("firebase-auth-error");
  if (el) {
    el.textContent = msg || "";
    el.hidden = !msg;
  }
}

function setTenantSelectVisible(visible) {
  const el = $("tenant-select-screen");
  if (!el) return;
  el.hidden = !visible;
}

function getTenantTheme(tenantId) {
  // Ajuste de temas por tenant (cores para legibilidade + logo do time).
  const backendBase = (typeof window !== "undefined" && window.BACKEND_URL) ? window.BACKEND_URL : "";
  if (tenantId === "magnus") {
    const magnusLogo = backendBase ? backendBase + "/times/logo-magnus.jpg" : "times/logo-magnus.jpg";
    return {
      lockLogoSrc: magnusLogo,
      lockLogoAlt: "Magnus Futsal",
      lockTitle: "Magnus Futsal",
      lockSubtitle: "Painel de Treino • Digite a senha para continuar",
      cssVars: {
        "--white": "#ffffff",
        "--bg-main": "radial-gradient(circle at 20% 15%, #FA9E06 0%, #EB8839 35%, #A05B48 55%, #100B08 100%)",
        "--card-bg": "#0F0904",
        "--card-stroke": "rgba(250,158,6,0.35)",
        "--accent": "#FA9E06",
        "--accent-secondary": "#EE151B",
        "--accent-soft": "rgba(250,158,6,0.15)",
        "--text-main": "#ffffff",
        "--text-dim": "#5D4F54",
        "--text-bright": "#FA9E06",
        "--pre-color": "#EE151B",
        "--pre-glow": "rgba(238,21,27,0.35)",
        "--post-color": "#FA9E06",
        "--post-glow": "rgba(250,158,6,0.35)"
      }
    };
  }

  // Default: Jaraguá (mantém o comportamento atual)
  return {
    lockLogoSrc: "Associação_Desportiva_Jaraguá.png",
    lockLogoAlt: "Associação Desportiva Jaraguá",
    lockTitle: "Associação Desportiva Jaraguá",
    lockSubtitle: "Painel de Treino • Digite a senha para continuar",
    cssVars: {
      "--bg-main": "radial-gradient(circle at 50% 50%, #feec02 0%, #ffcc01 100%)",
      "--card-bg": "#000000",
      "--card-stroke": "rgba(254,236,2,0.35)",
      "--accent": "#feec02",
      "--accent-secondary": "#ffcc01",
      "--accent-soft": "rgba(254,236,2,0.15)",
      "--text-main": "#ffffff",
      "--text-dim": "#e0e0e0",
      "--text-bright": "#feec02",
      "--pre-color": "#feec02",
      "--pre-glow": "rgba(254,236,2,0.35)",
      "--post-color": "#ffcc01",
      "--post-glow": "rgba(255,204,1,0.35)"
    }
  };
}

function applyTenantTheme(tenantId) {
  const theme = getTenantTheme(tenantId);
  try {
    Object.keys(theme.cssVars || {}).forEach(function (k) {
      document.documentElement.style.setProperty(k, theme.cssVars[k]);
    });
  } catch (e) {}

  const logo = $("lock-logo-img");
  if (logo) {
    logo.src = theme.lockLogoSrc;
    logo.alt = theme.lockLogoAlt;
  }
  const title = $("lock-title-text");
  if (title) title.textContent = theme.lockTitle || "";
  const subtitle = $("lock-subtitle-text");
  if (subtitle) subtitle.textContent = theme.lockSubtitle || "";

  // Atualizar logos da tela de seleção de tenant (imagens com data-tenant-logo)
  try {
    const imgs = document.querySelectorAll('img[data-tenant-logo]');
    imgs.forEach(function (img) {
      const t = img.getAttribute("data-tenant-logo");
      if (!t) return;
      const tTheme = getTenantTheme(t);
      const src = tTheme && tTheme.lockLogoSrc ? tTheme.lockLogoSrc : "";
      if (src) img.src = src;
    });
  } catch (e) {}
}

function mapTenantToAppMode(tenantId) {
  if (tenantId === "magnus") return "magnus";
  return "jaragua";
}

function loadScriptOnce(src) {
  return new Promise(function (resolve, reject) {
    try {
      // evita duplicar scripts
      const existing = document.querySelector('script[data-dyn-src="' + src + '"]') || document.querySelector('script[src="' + src + '"]');
      if (existing) return resolve();
      const s = document.createElement("script");
      s.type = "text/javascript";
      s.src = src;
      s.setAttribute("data-dyn-src", src);
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("Falha ao carregar " + src)); };
      document.head.appendChild(s);
    } catch (e) {
      reject(e);
    }
  });
}

async function activateTenant(tenantId) {
  if (!tenantId) return;
  window.__TUTEM_TENANT__ = window.__TUTEM_TENANT__ || {};
  window.__TUTEM_TENANT__.tenantId = tenantId;

  applyTenantTheme(tenantId);

  const mode = mapTenantToAppMode(tenantId);
  window.__TUTEM_APP_MODE__ = mode;
  // UI/funcionalidades: no Magnus não existe Sheets
  window.__TUTEM_SHEETS_MODE__ = mode === "magnus" ? "none" : "sheets";

  if (mode === "magnus") {
    await loadScriptOnce("js/storage-magnus.js");
    await loadScriptOnce("js/app-magnus.js");
    return;
  }

  // Jaraguá: precisa das funções de Sheets
  await loadScriptOnce("js/storage.js");
  await loadScriptOnce("js/app.js");
  await loadScriptOnce("js/sheets_sync.js");
}

(function boot() {
  try {
    if (typeof window !== "undefined" && window.location && window.location.search.indexOf("firebaseLogout=1") !== -1) {
      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);
      signOut(auth).finally(function () {
        try {
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, "", window.location.pathname || "index.html");
          }
        } catch (e) {}
        window.location.reload();
      });
      return;
    }
  } catch (e) {
    console.warn(e);
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  /** Usado por `sheets_sync.js` para gravar snapshot no Firestore após sync ao Sheets */
  if (typeof window !== "undefined") {
    window.__TUTEM_FIREBASE_DB__ = db;
  }

  const form = $("firebase-auth-form");
  const emailIn = $("firebase-email");
  const passIn = $("firebase-password");
  const submitBtn = $("firebase-auth-submit");

  async function loadUserProfile(user) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error(
        "O documento users/" +
          user.uid +
          " não existe. No Firestore, o ID do documento na coleção \"users\" tem de ser EXATAMENTE o UID do Authentication (copiar da consola), não \"admin\" nem \"jaragua\" — só os campos email, role e tenantId."
      );
    }
    const data = snap.data();
    if (!data.tenantId) {
      throw new Error("Perfil sem tenantId.");
    }
    window.__TUTEM_TENANT__ = {
      tenantId: data.tenantId,
      role: data.role || "staff",
      email: user.email || data.email || null
    };

    // Admin pode trocar tenant via URL (?tenant=magnus ou ?tenantId=magnus).
    // Isto permite que a mesma conta admin controle Jaraguá e Magnus sem mudar o documento em users/{uid}.
    try {
      const params = new URLSearchParams(window.location.search || "");
      const override = params.get("tenant") || params.get("tenantId");
      if (override && window.__TUTEM_TENANT__ && window.__TUTEM_TENANT__.role === "admin") {
        window.__TUTEM_TENANT__.tenantId = override;
      }
    } catch (e) {}
    return data;
  }

  onAuthStateChanged(auth, async function (user) {
    showFirebaseError("");

    if (!user) {
      window.__TUTEM_TENANT__ = null;
      setAuthLoadingVisible(false);
      setFirebaseScreenVisible(true);
      setLockVisible(false);
      setAppShellVisible(false);
      if (emailIn) emailIn.disabled = false;
      if (passIn) passIn.disabled = false;
      if (submitBtn) submitBtn.disabled = false;
      return;
    }

    try {
      await loadUserProfile(user);
    } catch (err) {
      console.error(err);
      showFirebaseError(err.message || String(err));
      try {
        await signOut(auth);
      } catch (e) {}
      setAuthLoadingVisible(false);
      setFirebaseScreenVisible(true);
      setLockVisible(false);
      setAppShellVisible(false);
      return;
    }

    // Decide tenant/app e mostra (ou não) o seletor para admin.
    const role = window.__TUTEM_TENANT__ && window.__TUTEM_TENANT__.role ? window.__TUTEM_TENANT__.role : "staff";
    const tenantIdFromProfile = window.__TUTEM_TENANT__ ? window.__TUTEM_TENANT__.tenantId : null;

    // Se admin e não forneceu tenant por URL, então mostra seleção.
    let urlHasTenantOverride = false;
    try {
      const params = new URLSearchParams(window.location.search || "");
      urlHasTenantOverride = params.has("tenant") || params.has("tenantId");
    } catch (e) {}

    if (role === "admin" && !urlHasTenantOverride) {
      // mantém tema por padrão do tenant do perfil até escolher
      applyTenantTheme(tenantIdFromProfile);
      setAuthLoadingVisible(false);
      setFirebaseScreenVisible(false);
      setAppShellVisible(false);
      setLockVisible(false);
      setTenantSelectVisible(true);
      return;
    }

    try {
      await activateTenant(tenantIdFromProfile);
    } catch (e) {
      console.warn("activateTenant falhou (seguimos com tema aplicado):", e);
    }

    setTenantSelectVisible(false);
    setAuthLoadingVisible(false);
    setFirebaseScreenVisible(false);
    setLockVisible(true);
    setAppShellVisible(false);
  });

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      showFirebaseError("");
      const email = (emailIn && emailIn.value) ? emailIn.value.trim() : "";
      const password = (passIn && passIn.value) ? passIn.value : "";
      if (!email || !password) {
        showFirebaseError("Preencha e-mail e senha.");
        return;
      }
      if (submitBtn) submitBtn.disabled = true;
      if (emailIn) emailIn.disabled = true;
      if (passIn) passIn.disabled = true;
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        var code = err && err.code ? err.code : "";
        var msg = "Não foi possível entrar.";
        if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
          msg = "E-mail ou senha incorretos.";
        } else if (code === "auth/too-many-requests") {
          msg = "Muitas tentativas. Tente mais tarde.";
        } else if (err && err.message) {
          msg = err.message;
        }
        showFirebaseError(msg);
        if (submitBtn) submitBtn.disabled = false;
        if (emailIn) emailIn.disabled = false;
        if (passIn) passIn.disabled = false;
      }
    });
  }

  // API global para os botões de seleção (admin)
  window.chooseTenantFromAdmin = async function (tenantId) {
    try {
      if (!window.__TUTEM_TENANT__ || window.__TUTEM_TENANT__.role !== "admin") return;
      if (!tenantId) return;

      window.__TUTEM_TENANT__.tenantId = tenantId;
      setTenantSelectVisible(false);

      // Aplica tema imediatamente (logo + variáveis)
      applyTenantTheme(tenantId);

      // Carrega storage/app certo
      await activateTenant(tenantId);

      // Agora sim mostra o lock-screen
      setLockVisible(true);
      setAppShellVisible(false);
      setAuthLoadingVisible(false);
    } catch (e) {
      console.error("chooseTenantFromAdmin falhou:", e);
    }
  };
})();
