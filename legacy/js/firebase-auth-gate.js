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

  const form = $("firebase-auth-form");
  const emailIn = $("firebase-email");
  const passIn = $("firebase-password");
  const submitBtn = $("firebase-auth-submit");

  async function loadUserProfile(user) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error("Este utilizador não tem perfil no Firestore. Peça ao administrador para criar users/" + user.uid);
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
    return data;
  }

  onAuthStateChanged(auth, async function (user) {
    showFirebaseError("");

    if (!user) {
      window.__TUTEM_TENANT__ = null;
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
      setFirebaseScreenVisible(true);
      setLockVisible(false);
      setAppShellVisible(false);
      return;
    }

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
})();
