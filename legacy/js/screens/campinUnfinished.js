/* ===========================
   📂 JOGOS INACABADOS (Campin → planilha depois)
   =========================== */

function campinUnfinishedEsc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m];
  });
}

function campinUnfinishedFmtMs(ms) {
  ms = Math.max(0, Math.floor(Number(ms) || 0));
  var totalSec = Math.floor(ms / 1000);
  var m = Math.floor(totalSec / 60);
  var sec = totalSec % 60;
  return (m < 10 ? "0" : "") + m + ":" + (sec < 10 ? "0" : "") + sec;
}

function campinUnfinishedBackend() {
  return (typeof window !== "undefined" && window.BACKEND_URL) ? String(window.BACKEND_URL).replace(/\/$/, "") : "";
}

function campinUnfinishedIsMagnusTenant() {
  try {
    var t = window.__TUTEM_TENANT__ && window.__TUTEM_TENANT__.tenantId;
    return String(t || "").toLowerCase() === "magnus";
  } catch (e) {
    return false;
  }
}

function campinUnfinishedSend(idx) {
  if (typeof tutemCampinUnfinished === "undefined") return;
  var list = tutemCampinUnfinished.read();
  var item = list[idx];
  if (!item || !item.sheetsPayload) return;
  var storeId = item.storeId;

  var base = campinUnfinishedBackend();
  if (!base) {
    alert("Defina o servidor (BACKEND_URL) no index para enviar à planilha.");
    return;
  }
  if (campinUnfinishedIsMagnusTenant()) {
    alert("Neste ambiente (Magnus) o relatório não é enviado à planilha Google.");
    return;
  }

  var btn = document.querySelector('[data-unf-idx="' + idx + '"][data-unf-action="send"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Enviando…";
  }

  fetch(base + "/games", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item.sheetsPayload)
  })
    .then(function (r) {
      return r.json().then(function (data) {
        return { ok: r.ok, data: data };
      });
    })
    .then(function (res) {
      if (res.data && res.data.success) {
        tutemCampinUnfinished.update(storeId, { sheetSynced: true, lastError: null });
        if (typeof showSyncToast === "function") showSyncToast("Jogo enviado à planilha.", "success");
        else alert("Jogo enviado à planilha.");
        goCampinUnfinishedGames();
      } else {
        var err = (res.data && res.data.error) || "Resposta inválida do servidor";
        tutemCampinUnfinished.update(storeId, { lastError: err });
        alert("Não foi possível enviar: " + err);
        goCampinUnfinishedGames();
      }
    })
    .catch(function (err) {
      var msg = err && err.message ? err.message : String(err);
      tutemCampinUnfinished.update(storeId, { lastError: msg });
      alert("Erro de rede ao enviar. Tente de novo quando a internet melhorar.\n" + msg);
      goCampinUnfinishedGames();
    });
}

function campinUnfinishedRemove(storeId) {
  if (typeof tutemCampinUnfinished === "undefined") return;
  if (!confirm("Remover este registro da lista? (Não apaga dados já gravados na planilha.)")) return;
  tutemCampinUnfinished.remove(storeId);
  goCampinUnfinishedGames();
}

function goCampinUnfinishedGames() {
  if (typeof clearResumeState === "function") clearResumeState();
  if (typeof destroyAcompanhamentoCharts === "function") destroyAcompanhamentoCharts();
  state.currentScreen = "campinUnfinished";
  setHeaderModeLabel("Jogos inacabados");

  renderScreen(
    '<div class="settings-wrapper">' +
      '<div class="back-row">' +
      '<button class="back-btn" onclick="goHome()"><i data-feather="arrow-left"></i><span>Voltar</span></button>' +
      '<div>' +
      '<div class="screen-title">Jogos inacabados</div>' +
      '<div class="screen-sub">Campin — enviar relatório à planilha depois</div>' +
      "</div>" +
      "</div>" +
      '<div id="campin-unf-content" class="acompanhamento-scroll" style="padding-top:0.5rem;"></div>' +
      "</div>"
  );
  try {
    if (window.feather && feather.replace) feather.replace();
  } catch (e) {}

  var content = document.getElementById("campin-unf-content");
  if (!content) return;

  if (typeof tutemCampinUnfinished === "undefined") {
    content.innerHTML =
      '<p class="item-sub" style="padding:1rem;">Armazenamento indisponível.</p>';
    return;
  }

  var list = tutemCampinUnfinished.read();
  if (!list.length) {
    content.innerHTML =
      '<p class="item-sub" style="padding:1rem;line-height:1.5;">Nenhum jogo guardado.<br/>' +
      "No Campin, se encerrar o jogo antes do fim do tempo, o relatório aparece aqui para enviar à planilha quando a rede estiver estável.</p>";
    return;
  }

  var magnus = campinUnfinishedIsMagnusTenant();
  var base = campinUnfinishedBackend();
  var html = "";

  for (var i = 0; i < list.length; i++) {
    var it = list[i];
    var title = campinUnfinishedEsc(it.teamName || "Partida");
    var when = campinUnfinishedEsc(it.savedAt || "");
    var elapsed = campinUnfinishedFmtMs(it.elapsedMs);
    var total = campinUnfinishedFmtMs(it.totalLenMs);
    var gid = it.sheetsPayload && it.sheetsPayload.gameId ? campinUnfinishedEsc(it.sheetsPayload.gameId) : "—";
    var synced = it.sheetSynced ? '<span style="color:#4ade80;font-weight:700;">Enviado</span>' : '<span style="color:#fbbf24;font-weight:700;">Pendente</span>';
    var err = it.lastError ? '<div class="item-sub" style="margin-top:6px;color:#fb7185;">' + campinUnfinishedEsc(it.lastError) + "</div>" : "";

    var sendDisabled = magnus || !base;
    var sendLabel = magnus ? "Sem planilha (Magnus)" : !base ? "Configure o servidor" : it.sheetSynced ? "Enviar de novo" : "Enviar à planilha";

    html +=
      '<div class="card" style="margin-bottom:12px;padding:14px;border-radius:var(--radius-md);border:1px solid rgba(255,255,255,0.12);background:rgba(0,0,0,0.25);">' +
      '<div style="font-weight:800;font-size:1.05rem;">' +
      title +
      "</div>" +
      '<div class="item-sub" style="margin-top:6px;">Guardado: ' +
      when +
      "</div>" +
      '<div class="item-sub" style="margin-top:4px;">Tempo no apito: <strong>' +
      elapsed +
      "</strong> de <strong>" +
      total +
      "</strong> • gameId: <code style=\"font-size:0.75rem;\">" +
      gid +
      "</code></div>" +
      '<div class="item-sub" style="margin-top:6px;">Estado: ' +
      synced +
      "</div>" +
      err +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;">' +
      '<button type="button" class="small-solid-btn" data-unf-idx="' +
      i +
      '" data-unf-action="send" ' +
      (sendDisabled ? "disabled " : "") +
      ">" +
      sendLabel +
      "</button>" +
      '<button type="button" class="small-outline-btn" data-unf-idx="' +
      i +
      '" data-unf-action="remove">Remover</button>' +
      "</div>" +
      "</div>";
  }

  content.innerHTML = html;
  content.onclick = function (ev) {
    var b = ev.target.closest("[data-unf-action]");
    if (!b) return;
    var idx = parseInt(b.getAttribute("data-unf-idx"), 10);
    var fresh = tutemCampinUnfinished.read();
    var row = fresh[idx];
    if (!row || !row.storeId) return;
    if (b.getAttribute("data-unf-action") === "send") campinUnfinishedSend(idx);
    else campinUnfinishedRemove(row.storeId);
  };
  try {
    if (window.feather && feather.replace) feather.replace();
  } catch (e2) {}
}
