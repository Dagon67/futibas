/**
 * Firebase Auth + Firestore (perfil users/{uid}).
 * Após login Firebase → app direto (sem tela de senha do painel), exceto fluxos legados que ainda usem o lock inline.
 * Tenants sem Google Sheets (ex.: brazil, magnus): mesmo bundle que Jaraguá + Firestore; só `jaragua-futsal` usa Sheets.
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

/**
 * POLÍTICA DE TENANTS (regra fixa)
 * - Google Sheets: APENAS o tenant legado Jaraguá (`jaragua-futsal`).
 * - Qualquer outro tenant (ex.: brazil, magnus) NÃO usa Sheets; persistência via Firestore
 *   (roster/current, trainingExports) com o mesmo `app.js` + `storage-jaragua-firestore.js`.
 * - Ao alinhar funcionalidades, use o app Jaraguá (app.js + storage.js) como modelo; desative só Sheets.
 */
export const TUTEM_LEGACY_GOOGLE_SHEETS_TENANT_ID = "jaragua-futsal";

export function tutemTenantUsesGoogleSheets(tenantId) {
  return String(tenantId || "") === TUTEM_LEGACY_GOOGLE_SHEETS_TENANT_ID;
}

if (typeof window !== "undefined") {
  window.__TUTEM_LEGACY_GOOGLE_SHEETS_TENANT_ID__ = TUTEM_LEGACY_GOOGLE_SHEETS_TENANT_ID;
  window.tutemTenantUsesGoogleSheets = tutemTenantUsesGoogleSheets;
}

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
  if (tenantId === "brazil") {
    // Sempre relativo ao HTML (legacy/): o backend Flask usa /times na raiz do repo e pode não ter o ficheiro no deploy.
    const brLogo = "times/brfutsal.png";
    return {
      lockLogoSrc: brLogo,
      lockLogoAlt: "Seleção Brasileira de Futsal",
      lockTitle: "Seleção Brasileira de Futsal",
      lockSubtitle: "Painel de Treino • Digite a senha para continuar",
      cssVars: {
        "--white": "#fffefe",
        "--bg-main": "radial-gradient(circle at 22% 18%, #039c55 0%, #345ca8 42%, #29285b 100%)",
        "--card-bg": "#141428",
        "--card-stroke": "rgba(255,210,7,0.42)",
        "--accent": "#ffd207",
        "--accent-secondary": "#039c55",
        "--accent-soft": "rgba(255,210,7,0.18)",
        "--text-main": "#fffefe",
        "--text-dim": "rgba(255,254,254,0.72)",
        "--text-bright": "#ffd207",
        "--pre-color": "#039c55",
        "--pre-glow": "rgba(3,156,85,0.35)",
        "--post-color": "#ffd207",
        "--post-glow": "rgba(255,210,7,0.35)"
      }
    };
  }
  if (tenantId === "magnus") {
                const magnusLogo = backendBase ? backendBase + "/times/logo-magnus.png" : "times/logo-magnus.png";
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

function mapTenantToAppMode(_tenantId) {
  // Um único bundle de UI (app.js + screens). Diferença Sheets vs Firestore: `tutemTenantUsesGoogleSheets(tenantId)`.
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
  window.__TUTEM_SHEETS_MODE__ = tutemTenantUsesGoogleSheets(tenantId) ? "sheets" : "none";

  await loadScriptOnce("js/storage.js");
  if (!tutemTenantUsesGoogleSheets(tenantId)) {
    await loadScriptOnce("js/storage-jaragua-firestore.js");
  }
  await loadScriptOnce("js/app.js");
  await loadScriptOnce("js/sheets_sync.js");
}

/** Brasil/outros sem Sheets: hidrata cache Firestore antes do startTutemApp (lista de jogadores em vários fluxos). */
async function bootstrapJaraguaAppFirestoreIfNeeded() {
  try {
    if (window.__TUTEM_APP_MODE__ !== "jaragua") return;
    if (window.__TUTEM_SHEETS_MODE__ !== "none") return;
    if (typeof window.initJaraguaFirestoreStorage === "function") {
      await window.initJaraguaFirestoreStorage(true);
    }
    if (typeof window.loadPlayers === "function") {
      var pl = window.loadPlayers() || [];
      if (pl.length === 0 && typeof window.__tutemFirestoreJaraguaDefaultPlayers === "function") {
        var defs = window.__tutemFirestoreJaraguaDefaultPlayers();
        if (defs && defs.length && typeof window.savePlayers === "function") {
          window.savePlayers(defs);
        }
      }
    }
  } catch (e) {
    console.warn("bootstrapJaraguaAppFirestoreIfNeeded:", e);
  }
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
      window.__tutemAppStarted = false;
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

    await bootstrapJaraguaAppFirestoreIfNeeded();

    setTenantSelectVisible(false);
    setAuthLoadingVisible(false);
    setFirebaseScreenVisible(false);
    setLockVisible(false);
    setAppShellVisible(true);
    if (typeof window.startTutemApp === "function") {
      try {
        window.startTutemApp();
      } catch (e) {
        console.warn(e);
      }
    }
    if (typeof window.fetchPlayersFromSheets === "function") {
      window.fetchPlayersFromSheets().catch(function () {});
    }
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

  window.tutemFirebaseSignOut = async function () {
    try {
      if (window.dateTimeInterval) clearInterval(window.dateTimeInterval);
    } catch (e) {}
    try {
      await signOut(auth);
    } catch (e) {
      console.warn(e);
    }
    const passClear = $("firebase-password");
    if (passClear) passClear.value = "";
  };

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

      await bootstrapJaraguaAppFirestoreIfNeeded();

      setLockVisible(false);
      setAppShellVisible(true);
      if (typeof window.startTutemApp === "function") {
        try {
          window.startTutemApp();
        } catch (e) {
          console.warn(e);
        }
      }
      if (typeof window.fetchPlayersFromSheets === "function") {
        window.fetchPlayersFromSheets().catch(function () {});
      }
      setAuthLoadingVisible(false);
    } catch (e) {
      console.error("chooseTenantFromAdmin falhou:", e);
    }
  };
})();
