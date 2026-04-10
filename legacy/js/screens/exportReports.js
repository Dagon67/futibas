/* ===========================
   📄 EXPORTAÇÃO DE RELATÓRIOS (Blaze Training + OnField)
   =========================== */

function exportReportsEsc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m];
    });
}

function exportReportsEnsureJsPdf() {
    return !!(window.jspdf && window.jspdf.jsPDF);
}

function exportReportsBackendUrl() {
    return (typeof window !== "undefined" && window.BACKEND_URL) ? String(window.BACKEND_URL).replace(/\/$/, "") : "";
}

function exportReportsFmtDateTimeIso(iso) {
    try {
        var d = new Date(iso);
        if (!isFinite(d.getTime())) return String(iso || "—");
        return d.toLocaleString("pt-BR");
    } catch (e) {
        return String(iso || "—");
    }
}

function exportReportsPainPartsFromText(v) {
    var raw = String(v || "").trim();
    if (!raw) return [];
    return raw
        .split(/[;,|]/)
        .map(function (x) { return String(x || "").trim(); })
        .filter(Boolean);
}

function openTrainingReportsExport() {
    state.currentScreen = "exportTrainingReports";
    setHeaderModeLabel("Exportar Treino");
    renderScreen(
        '<div class="settings-wrapper">' +
            '<div class="back-row">' +
                '<button class="back-btn" onclick="goHome()"><i data-feather="arrow-left"></i><span>Voltar</span></button>' +
                '<div><div class="screen-title">Exportar relatórios de treino</div><div class="screen-sub">Selecione os relatórios para gerar o PDF</div></div>' +
            '</div>' +
            '<div class="settings-panel-area"><div class="settings-panel-scroll">' +
                '<div id="trainingExportStatus" class="item-sub" style="margin-bottom:0.75rem;">Carregando dados…</div>' +
                '<div id="trainingExportOptions"></div>' +
                '<button class="home-btn home-btn-primary" type="button" onclick="generateTrainingReportsPdfFromSelection()" style="max-width:380px;margin-top:1rem;">' +
                    '<i data-feather="file-text"></i><div>Gerar PDF selecionado</div>' +
                '</button>' +
            '</div></div>' +
        '</div>'
    );
    feather.replace();
    loadTrainingExportOptions();
}

function loadTrainingExportOptions() {
    var statusEl = document.getElementById("trainingExportStatus");
    var optsEl = document.getElementById("trainingExportOptions");
    if (!optsEl) return;
    fetchAnalyticsData().then(function (data) {
        if (!data || !data.success) {
            if (statusEl) statusEl.textContent = "Não foi possível carregar dados de treino.";
            optsEl.innerHTML = "";
            return;
        }
        window.__EXPORT_TRAINING_DATA__ = data;
        if (statusEl) statusEl.textContent = "Escolha os relatórios abaixo.";
        optsEl.innerHTML =
            '<label class="item-row" style="cursor:pointer;"><input type="checkbox" class="training-export-opt" value="trimp" checked style="margin-right:0.6rem;">' +
                '<div class="item-main"><div class="item-title">TRIMP / Carga de treino</div><div class="item-sub">Média, monotonia, strain e atletas com maior carga</div></div></label>' +
            '<label class="item-row" style="cursor:pointer;"><input type="checkbox" class="training-export-opt" value="wellness" checked style="margin-right:0.6rem;">' +
                '<div class="item-main"><div class="item-title">Semáforo de bem-estar pré</div><div class="item-sub">Fadiga, sono, dor, estresse e humor (resumo simples)</div></div></label>' +
            '<label class="item-row" style="cursor:pointer;"><input type="checkbox" class="training-export-opt" value="body_general" checked style="margin-right:0.6rem;">' +
                '<div class="item-main"><div class="item-title">Mapa corporal geral</div><div class="item-sub">Áreas de dor mais citadas no grupo</div></div></label>' +
            '<label class="item-row" style="cursor:pointer;"><input type="checkbox" class="training-export-opt" value="body_by_athlete" checked style="margin-right:0.6rem;">' +
                '<div class="item-main"><div class="item-title">Mapa corporal por atleta</div><div class="item-sub">Atletas com maior recorrência de dor</div></div></label>' +
            '<label class="item-row" style="cursor:pointer;"><input type="checkbox" class="training-export-opt" value="decision_flags" checked style="margin-right:0.6rem;">' +
                '<div class="item-main"><div class="item-title">Sinais para decisão</div><div class="item-sub">Resumo objetivo de alertas para tomada de decisão</div></div></label>';
    }).catch(function () {
        if (statusEl) statusEl.textContent = "Erro ao carregar dados.";
        optsEl.innerHTML = "";
    });
}

function collectTrainingExportSelection() {
    var els = document.querySelectorAll(".training-export-opt:checked");
    var out = [];
    for (var i = 0; i < els.length; i++) out.push(els[i].value);
    return out;
}

function buildTrainingReportStats(data) {
    var preH = data.pre && data.pre.headers ? data.pre.headers : [];
    var preRows = data.pre && data.pre.rows ? data.pre.rows : [];
    var posH = data.pos && data.pos.headers ? data.pos.headers : [];
    var posRows = data.pos && data.pos.rows ? data.pos.rows : [];
    var load = buildTeamLoadMetrics(data);

    var wellness = { fadiga: [], sono: [], dor: [], estresse: [], humor: [] };
    for (var i = 0; i < preRows.length; i++) {
        var r = parsePreRow(preH, preRows[i]);
        var a = r.answers || {};
        if (a.fadiga != null) wellness.fadiga.push(a.fadiga);
        if (a.sono != null) wellness.sono.push(a.sono);
        if (a.dor != null) wellness.dor.push(a.dor);
        if (a.estresse != null) wellness.estresse.push(a.estresse);
        if (a.humor != null) wellness.humor.push(a.humor);
    }
    function avg(arr) {
        if (!arr.length) return null;
        return arr.reduce(function (s, x) { return s + x; }, 0) / arr.length;
    }
    var wellnessAvg = {
        fadiga: avg(wellness.fadiga),
        sono: avg(wellness.sono),
        dor: avg(wellness.dor),
        estresse: avg(wellness.estresse),
        humor: avg(wellness.humor),
    };

    var painCount = {};
    var painByAthlete = {};
    for (var j = 0; j < preRows.length; j++) {
        var pr = parsePreRow(preH, preRows[j]);
        var parts = exportReportsPainPartsFromText(pr.answers && (pr.answers.pontosDor || pr.answers.pontosArticular));
        if (!parts.length) continue;
        var athleteName = pr.name || "Atleta";
        if (!painByAthlete[athleteName]) painByAthlete[athleteName] = 0;
        for (var p = 0; p < parts.length; p++) {
            var part = parts[p];
            painCount[part] = (painCount[part] || 0) + 1;
            painByAthlete[athleteName]++;
        }
    }
    function topEntries(obj, limit) {
        var rows = Object.keys(obj).map(function (k) { return { key: k, value: obj[k] }; });
        rows.sort(function (a, b) { return b.value - a.value; });
        return rows.slice(0, limit || 10);
    }

    var trimpByAthlete = {};
    for (var k = 0; k < posRows.length; k++) {
        var po = parsePosRow(posH, posRows[k]);
        var st = po.answers || {};
        if (st.estado == null || st.tempoMin == null) continue;
        var athlete = po.name || "Atleta";
        trimpByAthlete[athlete] = (trimpByAthlete[athlete] || 0) + (st.estado * st.tempoMin);
    }

    return {
        load: load,
        wellnessAvg: wellnessAvg,
        painTop: topEntries(painCount, 8),
        painByAthleteTop: topEntries(painByAthlete, 8),
        trimpByAthleteTop: topEntries(trimpByAthlete, 8),
        totals: {
            preRows: preRows.length,
            posRows: posRows.length
        }
    };
}

function pdfAddPageIfNeeded(doc, y, needSpace) {
    var pageH = doc.internal.pageSize.getHeight();
    if (y + needSpace <= pageH - 16) return y;
    doc.addPage();
    return 20;
}

function pdfAddSectionTitle(doc, title, y) {
    y = pdfAddPageIfNeeded(doc, y, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(title, 14, y);
    return y + 7;
}

function pdfAddTextLine(doc, text, y, size) {
    y = pdfAddPageIfNeeded(doc, y, 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size || 10);
    doc.text(String(text || ""), 16, y);
    return y + 5.2;
}

function pdfAddTopList(doc, rows, y, unitLabel) {
    var list = rows || [];
    if (!list.length) return pdfAddTextLine(doc, "Sem dados suficientes.", y);
    for (var i = 0; i < list.length; i++) {
        y = pdfAddPageIfNeeded(doc, y, 7);
        var row = list[i];
        var label = (i + 1) + ". " + row.key + ": " + row.value + (unitLabel || "");
        y = pdfAddTextLine(doc, label, y);
    }
    return y;
}

function generateTrainingReportsPdfFromSelection() {
    var selected = collectTrainingExportSelection();
    if (!selected.length) {
        alert("Selecione pelo menos um relatório.");
        return;
    }
    if (!exportReportsEnsureJsPdf()) {
        alert("Biblioteca de PDF não carregada.");
        return;
    }
    var data = window.__EXPORT_TRAINING_DATA__;
    if (!data || !data.success) {
        alert("Dados de treino indisponíveis.");
        return;
    }
    var stats = buildTrainingReportStats(data);
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    var y = 18;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Relatórios de Treino - Blaze Training", 14, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Gerado em " + exportReportsFmtDateTimeIso(new Date().toISOString()), 14, y);
    y += 7;

    for (var i = 0; i < selected.length; i++) {
        var key = selected[i];
        if (key === "trimp") {
            y = pdfAddSectionTitle(doc, "1) TRIMP / Carga de treino", y + 2);
            y = pdfAddTextLine(doc, "Media de carga diaria: " + (stats.load.avgDailyLoad != null ? stats.load.avgDailyLoad.toFixed(1) : "n/d"), y);
            y = pdfAddTextLine(doc, "Monotonia: " + (stats.load.monotony != null ? stats.load.monotony.toFixed(2) : "n/d"), y);
            y = pdfAddTextLine(doc, "Strain: " + (stats.load.strain != null ? stats.load.strain.toFixed(1) : "n/d"), y);
            y = pdfAddTextLine(doc, "Atletas com maior carga acumulada:", y + 1);
            y = pdfAddTopList(doc, stats.trimpByAthleteTop, y, " pts");
        } else if (key === "wellness") {
            y = pdfAddSectionTitle(doc, "2) Semaforo de bem-estar pre", y + 2);
            y = pdfAddTextLine(doc, "Fadiga media: " + (stats.wellnessAvg.fadiga != null ? stats.wellnessAvg.fadiga.toFixed(1) : "n/d"), y);
            y = pdfAddTextLine(doc, "Sono medio: " + (stats.wellnessAvg.sono != null ? stats.wellnessAvg.sono.toFixed(1) : "n/d"), y);
            y = pdfAddTextLine(doc, "Dor media: " + (stats.wellnessAvg.dor != null ? stats.wellnessAvg.dor.toFixed(1) : "n/d"), y);
            y = pdfAddTextLine(doc, "Estresse medio: " + (stats.wellnessAvg.estresse != null ? stats.wellnessAvg.estresse.toFixed(1) : "n/d"), y);
            y = pdfAddTextLine(doc, "Humor medio: " + (stats.wellnessAvg.humor != null ? stats.wellnessAvg.humor.toFixed(1) : "n/d"), y);
        } else if (key === "body_general") {
            y = pdfAddSectionTitle(doc, "3) Mapa corporal geral", y + 2);
            y = pdfAddTextLine(doc, "Areas de dor mais relatadas:", y);
            y = pdfAddTopList(doc, stats.painTop, y, " relatos");
        } else if (key === "body_by_athlete") {
            y = pdfAddSectionTitle(doc, "4) Mapa corporal por atleta", y + 2);
            y = pdfAddTextLine(doc, "Atletas com maior recorrencia de dor:", y);
            y = pdfAddTopList(doc, stats.painByAthleteTop, y, " pontos");
        } else if (key === "decision_flags") {
            y = pdfAddSectionTitle(doc, "5) Sinais para decisao", y + 2);
            var flags = [];
            if (stats.wellnessAvg.fadiga != null && stats.wellnessAvg.fadiga >= 7) flags.push("Fadiga media alta (>= 7).");
            if (stats.wellnessAvg.dor != null && stats.wellnessAvg.dor >= 6) flags.push("Dor media elevada (>= 6).");
            if (stats.wellnessAvg.sono != null && stats.wellnessAvg.sono <= 5) flags.push("Sono medio baixo (<= 5).");
            if (stats.load.monotony != null && stats.load.monotony >= 2) flags.push("Monotonia elevada (>= 2).");
            if (!flags.length) flags.push("Sem alertas criticos no periodo analisado.");
            for (var fi = 0; fi < flags.length; fi++) y = pdfAddTextLine(doc, "- " + flags[fi], y);
        }
    }

    doc.save("relatorios_treino_blaze.pdf");
}

function openGameReportsExport() {
    state.currentScreen = "exportGameReports";
    setHeaderModeLabel("Exportar Jogos");
    renderScreen(
        '<div class="settings-wrapper">' +
            '<div class="back-row">' +
                '<button class="back-btn" onclick="goHome()"><i data-feather="arrow-left"></i><span>Voltar</span></button>' +
                '<div><div class="screen-title">Exportar relatórios de jogos</div><div class="screen-sub">Escolha o jogo e os relatórios para PDF</div></div>' +
            '</div>' +
            '<div class="settings-panel-area"><div class="settings-panel-scroll">' +
                '<div id="gameExportStatus" class="item-sub" style="margin-bottom:0.75rem;">Carregando jogos…</div>' +
                '<div class="q-item">' +
                    '<div class="q-text">Jogo</div>' +
                    '<select id="gameExportSelect" class="q-input"></select>' +
                '</div>' +
                '<div id="gameExportOptions" style="margin-top:0.65rem;">' +
                    '<label class="item-row" style="cursor:pointer;"><input type="checkbox" class="game-export-opt" value="minutes" checked style="margin-right:0.6rem;"><div class="item-main"><div class="item-title">Tempo total em quadra por atleta</div><div class="item-sub">Quem jogou mais/menos</div></div></label>' +
                    '<label class="item-row" style="cursor:pointer;"><input type="checkbox" class="game-export-opt" value="subs" checked style="margin-right:0.6rem;"><div class="item-main"><div class="item-title">Entradas e saidas</div><div class="item-sub">Quantidade e momentos de substituicao</div></div></label>' +
                    '<label class="item-row" style="cursor:pointer;"><input type="checkbox" class="game-export-opt" value="events" checked style="margin-right:0.6rem;"><div class="item-main"><div class="item-title">Eventos do jogo</div><div class="item-sub">Resumo de gols, faltas e demais eventos</div></div></label>' +
                    '<label class="item-row" style="cursor:pointer;"><input type="checkbox" class="game-export-opt" value="positions" checked style="margin-right:0.6rem;"><div class="item-main"><div class="item-title">Tempo por posicao</div><div class="item-sub">Distribuicao de minutos por funcao</div></div></label>' +
                '</div>' +
                '<button class="home-btn home-btn-primary" type="button" onclick="generateGameReportsPdfFromSelection()" style="max-width:380px;margin-top:1rem;">' +
                    '<i data-feather="file-text"></i><div>Gerar PDF selecionado</div>' +
                '</button>' +
            '</div></div>' +
        '</div>'
    );
    feather.replace();
    loadGameExportOptions();
}

function loadGameExportOptions() {
    var base = exportReportsBackendUrl();
    var statusEl = document.getElementById("gameExportStatus");
    var selectEl = document.getElementById("gameExportSelect");
    if (!selectEl) return;
    if (!base) {
        if (statusEl) statusEl.textContent = "Backend não configurado para listar jogos.";
        return;
    }
    fetch(base + "/games/reports?limit=120", { method: "GET", cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (res) {
            if (!res.success) throw new Error(res.error || "Falha ao listar jogos");
            var games = res.games || [];
            if (!games.length) {
                if (statusEl) statusEl.textContent = "Nenhum jogo encontrado.";
                selectEl.innerHTML = '<option value="">Sem jogos</option>';
                return;
            }
            var html = "";
            for (var i = 0; i < games.length; i++) {
                var g = games[i];
                var label = (g.date || "—") + " " + (g.time || "") + " - " + (g.teamName || "Jogo");
                html += '<option value="' + exportReportsEsc(g.gameId) + '">' + exportReportsEsc(label) + "</option>";
            }
            selectEl.innerHTML = html;
            if (statusEl) statusEl.textContent = "Selecione os relatórios desejados.";
        })
        .catch(function (e) {
            if (statusEl) statusEl.textContent = "Erro ao carregar jogos: " + String(e.message || e);
            selectEl.innerHTML = '<option value="">Erro</option>';
        });
}

function collectGameExportSelection() {
    var els = document.querySelectorAll(".game-export-opt:checked");
    var out = [];
    for (var i = 0; i < els.length; i++) out.push(els[i].value);
    return out;
}

function generateGameReportsPdfFromSelection() {
    var selected = collectGameExportSelection();
    if (!selected.length) {
        alert("Selecione pelo menos um relatório.");
        return;
    }
    if (!exportReportsEnsureJsPdf()) {
        alert("Biblioteca de PDF não carregada.");
        return;
    }
    var selectEl = document.getElementById("gameExportSelect");
    var gameId = selectEl ? String(selectEl.value || "").trim() : "";
    if (!gameId) {
        alert("Selecione um jogo.");
        return;
    }
    var base = exportReportsBackendUrl();
    fetch(base + "/games/reports/detail?gameId=" + encodeURIComponent(gameId), { method: "GET", cache: "no-store" })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (ctx) {
            if (!ctx.ok || !ctx.data.success) throw new Error((ctx.data && ctx.data.error) || "Jogo não encontrado");
            generateGameReportsPdf(ctx.data, selected);
        })
        .catch(function (e) {
            alert("Erro ao gerar PDF: " + String(e.message || e));
        });
}

function generateGameReportsPdf(detail, selected) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    var y = 18;
    var elenco = detail.elenco || [];
    var logs = detail.logs || [];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Relatórios de Jogo - OnField", 14, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Jogo: " + (detail.date || "—") + " " + (detail.time || "") + " - " + (detail.teamName || "—"), 14, y);
    y += 6;
    doc.text("Gerado em " + exportReportsFmtDateTimeIso(new Date().toISOString()), 14, y);
    y += 7;

    for (var i = 0; i < selected.length; i++) {
        var key = selected[i];
        if (key === "minutes") {
            y = pdfAddSectionTitle(doc, "1) Tempo total em quadra por atleta", y + 2);
            if (!elenco.length) y = pdfAddTextLine(doc, "Sem dados de elenco.", y);
            for (var e = 0; e < elenco.length; e++) {
                var row = elenco[e];
                y = pdfAddTextLine(doc, (row.name || "Atleta") + " #" + (row.number || "-") + " - " + (row.totalOnField || "0:00"), y);
            }
        } else if (key === "subs") {
            y = pdfAddSectionTitle(doc, "2) Entradas e saidas", y + 2);
            if (!elenco.length) y = pdfAddTextLine(doc, "Sem dados de substituicao.", y);
            for (var s = 0; s < elenco.length; s++) {
                var sr = elenco[s];
                y = pdfAddTextLine(doc, (sr.name || "Atleta") + " - entradas: " + (sr.entryCount || "0"), y);
                var stints = String(sr.stintsDetail || "").split("|").map(function (x) { return x.trim(); }).filter(Boolean);
                for (var st = 0; st < stints.length; st++) y = pdfAddTextLine(doc, "   • " + stints[st], y, 9);
            }
        } else if (key === "events") {
            y = pdfAddSectionTitle(doc, "3) Eventos do jogo", y + 2);
            var countByEvent = {};
            for (var lg = 0; lg < logs.length; lg++) {
                var ev = String((logs[lg] || {}).event || "Sem evento");
                countByEvent[ev] = (countByEvent[ev] || 0) + 1;
            }
            var topEv = Object.keys(countByEvent).map(function (k) { return { key: k, value: countByEvent[k] }; });
            topEv.sort(function (a, b) { return b.value - a.value; });
            y = pdfAddTopList(doc, topEv, y, "x");
        } else if (key === "positions") {
            y = pdfAddSectionTitle(doc, "4) Tempo por posicao", y + 2);
            if (!elenco.length) y = pdfAddTextLine(doc, "Sem dados de posicao.", y);
            for (var p = 0; p < elenco.length; p++) {
                var pr = elenco[p];
                y = pdfAddTextLine(doc, (pr.name || "Atleta") + " - " + (pr.positionBreakdown || "Sem dados"), y);
            }
        }
    }

    doc.save("relatorios_jogo_onfield.pdf");
}
