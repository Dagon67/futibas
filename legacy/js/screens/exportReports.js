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

function exportReportsClubIdentity() {
    var tenant = "";
    try { tenant = (window.__TUTEM_TENANT__ && window.__TUTEM_TENANT__.tenantId) ? String(window.__TUTEM_TENANT__.tenantId) : ""; } catch (e) {}
    if (tenant === "brazil") {
        return { name: "Seleção Brasileira", primary: [0, 104, 55], accent: [255, 223, 0], logo: "times/brfutsal.png" };
    }
    if (tenant === "magnus") {
        var base = exportReportsBackendUrl();
        return { name: "Magnus Futsal", primary: [206, 17, 38], accent: [255, 214, 10], logo: (base ? (base + "/times/logo-magnus.png") : "times/logo-magnus.png") };
    }
    return { name: "Jaraguá Futsal", primary: [0, 0, 0], accent: [254, 236, 2], logo: "Associação_Desportiva_Jaraguá.png" };
}

function exportReportsLoadLogoDataUrl(src) {
    return new Promise(function (resolve) {
        if (!src) return resolve(null);
        var img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () {
            try {
                var c = document.createElement("canvas");
                c.width = img.naturalWidth || img.width;
                c.height = img.naturalHeight || img.height;
                var ctx = c.getContext("2d");
                ctx.drawImage(img, 0, 0);
                resolve(c.toDataURL("image/png"));
            } catch (e) {
                resolve(null);
            }
        };
        img.onerror = function () { resolve(null); };
        img.src = src;
    });
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
                '<div class="q-item"><div class="q-text">Atleta (opcional)</div><select id="trainingExportPlayerSelect" class="q-input"><option value="">Todos os atletas</option></select></div>' +
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
        var playerSelect = document.getElementById("trainingExportPlayerSelect");
        if (playerSelect) {
            var pHtml = '<option value="">Todos os atletas</option>';
            var players = data.players || [];
            players.sort(function (a, b) { return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"); });
            for (var pi = 0; pi < players.length; pi++) {
                var p = players[pi] || {};
                pHtml += '<option value="' + exportReportsEsc(p.id || "") + '">' + exportReportsEsc(p.name || "Atleta") + "</option>";
            }
            playerSelect.innerHTML = pHtml;
        }
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
                '<div class="item-main"><div class="item-title">Sinais para decisão</div><div class="item-sub">Resumo objetivo de alertas para tomada de decisão</div></div></label>' +
            '<label class="item-row" style="cursor:pointer;"><input type="checkbox" class="training-export-opt" value="individual_player" style="margin-right:0.6rem;">' +
                '<div class="item-main"><div class="item-title">Relatório individual de atleta</div><div class="item-sub">Resumo simples por jogador selecionado</div></div></label>';
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
    var selectedPlayerId = "";
    var playerSelect = document.getElementById("trainingExportPlayerSelect");
    if (playerSelect) selectedPlayerId = String(playerSelect.value || "").trim();
    for (var i = 0; i < preRows.length; i++) {
        var r = parsePreRow(preH, preRows[i]);
        if (selectedPlayerId && String(r.playerId || "") !== selectedPlayerId) continue;
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
        if (selectedPlayerId && String(pr.playerId || "") !== selectedPlayerId) continue;
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
        if (selectedPlayerId && String(po.playerId || "") !== selectedPlayerId) continue;
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
        },
        selectedPlayerId: selectedPlayerId
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

function pdfDrawBarChart(doc, title, rows, y, colorRgb, maxRows) {
    y = pdfAddSectionTitle(doc, title, y);
    var list = (rows || []).slice(0, maxRows || 8);
    if (!list.length) return pdfAddTextLine(doc, "Sem dados para gráfico.", y);
    var maxV = 0;
    for (var i = 0; i < list.length; i++) if (list[i].value > maxV) maxV = list[i].value;
    var barWMax = 95;
    for (var j = 0; j < list.length; j++) {
        var r = list[j];
        y = pdfAddPageIfNeeded(doc, y, 8);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(String(r.key || "Item"), 16, y);
        var w = maxV > 0 ? Math.max(3, (Number(r.value || 0) / maxV) * barWMax) : 3;
        doc.setDrawColor(190, 190, 190);
        doc.rect(78, y - 3.8, barWMax, 3.5);
        doc.setFillColor(colorRgb[0], colorRgb[1], colorRgb[2]);
        doc.rect(78, y - 3.8, w, 3.5, "F");
        doc.text(String(r.value || 0), 178, y, { align: "right" });
        y += 5.2;
    }
    return y;
}

function pdfApplyBrandHeader(doc, title, subtitle) {
    var brand = exportReportsClubIdentity();
    var pageW = doc.internal.pageSize.getWidth();
    doc.setFillColor(brand.primary[0], brand.primary[1], brand.primary[2]);
    doc.rect(0, 0, pageW, 24, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text(title, 14, 10);
    doc.setFontSize(10);
    doc.text(brand.name + " • " + subtitle, 14, 17);
    doc.setDrawColor(brand.accent[0], brand.accent[1], brand.accent[2]);
    doc.setLineWidth(1.3);
    doc.line(14, 21, pageW - 14, 21);
    doc.setTextColor(20, 20, 20);
    return exportReportsLoadLogoDataUrl(brand.logo).then(function (logoData) {
        if (logoData) {
            try {
                doc.addImage(logoData, "PNG", pageW - 30, 4, 12, 12);
            } catch (e) {}
        }
    });
}

function buildTrainingIndividualStats(data, selectedPlayerId) {
    var preH = data.pre && data.pre.headers ? data.pre.headers : [];
    var preRows = data.pre && data.pre.rows ? data.pre.rows : [];
    var posH = data.pos && data.pos.headers ? data.pos.headers : [];
    var posRows = data.pos && data.pos.rows ? data.pos.rows : [];
    var byPlayer = {};
    function ensure(name, id) {
        var k = id || name || "atleta";
        if (!byPlayer[k]) byPlayer[k] = { id: id || "", name: name || "Atleta", preCount: 0, postCount: 0, trimp: 0, wellness: { fadiga: [], sono: [], dor: [], estresse: [], humor: [] }, pain: {} };
        return byPlayer[k];
    }
    for (var i = 0; i < preRows.length; i++) {
        var pr = parsePreRow(preH, preRows[i]);
        if (selectedPlayerId && String(pr.playerId || "") !== selectedPlayerId) continue;
        var pA = ensure(pr.name, pr.playerId);
        pA.preCount++;
        var pa = pr.answers || {};
        if (pa.fadiga != null) pA.wellness.fadiga.push(pa.fadiga);
        if (pa.sono != null) pA.wellness.sono.push(pa.sono);
        if (pa.dor != null) pA.wellness.dor.push(pa.dor);
        if (pa.estresse != null) pA.wellness.estresse.push(pa.estresse);
        if (pa.humor != null) pA.wellness.humor.push(pa.humor);
        var parts = exportReportsPainPartsFromText(pa.pontosDor || pa.pontosArticular);
        for (var x = 0; x < parts.length; x++) pA.pain[parts[x]] = (pA.pain[parts[x]] || 0) + 1;
    }
    for (var j = 0; j < posRows.length; j++) {
        var po = parsePosRow(posH, posRows[j]);
        if (selectedPlayerId && String(po.playerId || "") !== selectedPlayerId) continue;
        var pB = ensure(po.name, po.playerId);
        pB.postCount++;
        var a = po.answers || {};
        if (a.estado != null && a.tempoMin != null) pB.trimp += (a.estado * a.tempoMin);
    }
    function avg(arr) { return arr.length ? (arr.reduce(function (s, n) { return s + n; }, 0) / arr.length) : null; }
    var out = Object.keys(byPlayer).map(function (k) {
        var v = byPlayer[k];
        var painTop = Object.keys(v.pain).map(function (pk) { return { key: pk, value: v.pain[pk] }; }).sort(function (a, b) { return b.value - a.value; }).slice(0, 3);
        return {
            id: v.id,
            name: v.name,
            trimp: v.trimp,
            preCount: v.preCount,
            postCount: v.postCount,
            fadiga: avg(v.wellness.fadiga),
            sono: avg(v.wellness.sono),
            dor: avg(v.wellness.dor),
            painTop: painTop
        };
    });
    out.sort(function (a, b) { return b.trimp - a.trimp; });
    return out;
}

async function generateTrainingReportsPdfFromSelection() {
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
    await pdfApplyBrandHeader(doc, "Relatórios de Treino - Blaze Training", exportReportsFmtDateTimeIso(new Date().toISOString()));
    var y = 32;

    for (var i = 0; i < selected.length; i++) {
        var key = selected[i];
        if (key === "trimp") {
            y = pdfAddSectionTitle(doc, "1) TRIMP / Carga de treino", y + 2);
            y = pdfAddTextLine(doc, "Media de carga diaria: " + (stats.load.avgDailyLoad != null ? stats.load.avgDailyLoad.toFixed(1) : "n/d"), y);
            y = pdfAddTextLine(doc, "Monotonia: " + (stats.load.monotony != null ? stats.load.monotony.toFixed(2) : "n/d"), y);
            y = pdfAddTextLine(doc, "Strain: " + (stats.load.strain != null ? stats.load.strain.toFixed(1) : "n/d"), y);
            y = pdfDrawBarChart(doc, "Grafico - carga por atleta (top 8)", stats.trimpByAthleteTop, y + 1, [254, 236, 2], 8);
        } else if (key === "wellness") {
            y = pdfAddSectionTitle(doc, "2) Semaforo de bem-estar pre", y + 2);
            y = pdfAddTextLine(doc, "Fadiga media: " + (stats.wellnessAvg.fadiga != null ? stats.wellnessAvg.fadiga.toFixed(1) : "n/d"), y);
            y = pdfAddTextLine(doc, "Sono medio: " + (stats.wellnessAvg.sono != null ? stats.wellnessAvg.sono.toFixed(1) : "n/d"), y);
            y = pdfAddTextLine(doc, "Dor media: " + (stats.wellnessAvg.dor != null ? stats.wellnessAvg.dor.toFixed(1) : "n/d"), y);
            y = pdfAddTextLine(doc, "Estresse medio: " + (stats.wellnessAvg.estresse != null ? stats.wellnessAvg.estresse.toFixed(1) : "n/d"), y);
            y = pdfAddTextLine(doc, "Humor medio: " + (stats.wellnessAvg.humor != null ? stats.wellnessAvg.humor.toFixed(1) : "n/d"), y);
            var wellnessRows = [
                { key: "Fadiga", value: Number(stats.wellnessAvg.fadiga || 0) },
                { key: "Sono", value: Number(stats.wellnessAvg.sono || 0) },
                { key: "Dor", value: Number(stats.wellnessAvg.dor || 0) },
                { key: "Estresse", value: Number(stats.wellnessAvg.estresse || 0) },
                { key: "Humor", value: Number(stats.wellnessAvg.humor || 0) }
            ];
            y = pdfDrawBarChart(doc, "Grafico - escala media (0 a 10)", wellnessRows, y + 1, [90, 170, 255], 5);
        } else if (key === "body_general") {
            y = pdfAddSectionTitle(doc, "3) Mapa corporal geral", y + 2);
            y = pdfDrawBarChart(doc, "Grafico - areas de dor mais relatadas", stats.painTop, y + 1, [220, 80, 80], 8);
        } else if (key === "body_by_athlete") {
            y = pdfAddSectionTitle(doc, "4) Mapa corporal por atleta", y + 2);
            y = pdfDrawBarChart(doc, "Grafico - recorrencia de dor por atleta", stats.painByAthleteTop, y + 1, [230, 130, 70], 8);
        } else if (key === "decision_flags") {
            y = pdfAddSectionTitle(doc, "5) Sinais para decisao", y + 2);
            var flags = [];
            if (stats.wellnessAvg.fadiga != null && stats.wellnessAvg.fadiga >= 7) flags.push("Fadiga media alta (>= 7).");
            if (stats.wellnessAvg.dor != null && stats.wellnessAvg.dor >= 6) flags.push("Dor media elevada (>= 6).");
            if (stats.wellnessAvg.sono != null && stats.wellnessAvg.sono <= 5) flags.push("Sono medio baixo (<= 5).");
            if (stats.load.monotony != null && stats.load.monotony >= 2) flags.push("Monotonia elevada (>= 2).");
            if (!flags.length) flags.push("Sem alertas criticos no periodo analisado.");
            for (var fi = 0; fi < flags.length; fi++) y = pdfAddTextLine(doc, "- " + flags[fi], y);
        } else if (key === "individual_player") {
            y = pdfAddSectionTitle(doc, "6) Relatorio individual por atleta", y + 2);
            var playerSelect = document.getElementById("trainingExportPlayerSelect");
            var selectedPlayerId = playerSelect ? String(playerSelect.value || "").trim() : "";
            var individuals = buildTrainingIndividualStats(data, selectedPlayerId);
            if (!individuals.length) {
                y = pdfAddTextLine(doc, "Sem dados individuais para o filtro selecionado.", y);
            } else {
                for (var ri = 0; ri < individuals.length; ri++) {
                    var ind = individuals[ri];
                    y = pdfAddPageIfNeeded(doc, y, 22);
                    y = pdfAddTextLine(doc, ind.name + " - TRIMP acumulado: " + ind.trimp.toFixed(1), y);
                    y = pdfAddTextLine(doc, "Check-ins pre: " + ind.preCount + " | post: " + ind.postCount, y);
                    y = pdfAddTextLine(doc, "Fadiga: " + (ind.fadiga != null ? ind.fadiga.toFixed(1) : "n/d") + " | Sono: " + (ind.sono != null ? ind.sono.toFixed(1) : "n/d") + " | Dor: " + (ind.dor != null ? ind.dor.toFixed(1) : "n/d"), y);
                    if (ind.painTop.length) {
                        y = pdfAddTextLine(doc, "Dor mais citada: " + ind.painTop[0].key + " (" + ind.painTop[0].value + "x)", y);
                    }
                }
            }
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
                '<div class="q-item"><div class="q-text">Atleta (opcional)</div><select id="gameExportPlayerSelect" class="q-input"><option value="">Todos os atletas</option></select></div>' +
                '<div id="gameExportOptions" style="margin-top:0.65rem;">' +
                    '<label class="item-row" style="cursor:pointer;"><input type="checkbox" class="game-export-opt" value="minutes" checked style="margin-right:0.6rem;"><div class="item-main"><div class="item-title">Tempo total em quadra por atleta</div><div class="item-sub">Quem jogou mais/menos</div></div></label>' +
                    '<label class="item-row" style="cursor:pointer;"><input type="checkbox" class="game-export-opt" value="subs" checked style="margin-right:0.6rem;"><div class="item-main"><div class="item-title">Entradas e saidas</div><div class="item-sub">Quantidade e momentos de substituicao</div></div></label>' +
                    '<label class="item-row" style="cursor:pointer;"><input type="checkbox" class="game-export-opt" value="events" checked style="margin-right:0.6rem;"><div class="item-main"><div class="item-title">Eventos do jogo</div><div class="item-sub">Resumo de gols, faltas e demais eventos</div></div></label>' +
                    '<label class="item-row" style="cursor:pointer;"><input type="checkbox" class="game-export-opt" value="positions" checked style="margin-right:0.6rem;"><div class="item-main"><div class="item-title">Tempo por posicao</div><div class="item-sub">Distribuicao de minutos por funcao</div></div></label>' +
                    '<label class="item-row" style="cursor:pointer;"><input type="checkbox" class="game-export-opt" value="individual_player" style="margin-right:0.6rem;"><div class="item-main"><div class="item-title">Relatório individual de atleta</div><div class="item-sub">Resumo do jogo por jogador selecionado</div></div></label>' +
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
            var gid = String(games[0].gameId || "");
            if (gid) loadGameExportPlayers(gid);
            selectEl.addEventListener("change", function () { loadGameExportPlayers(String(this.value || "")); });
        })
        .catch(function (e) {
            if (statusEl) statusEl.textContent = "Erro ao carregar jogos: " + String(e.message || e);
            selectEl.innerHTML = '<option value="">Erro</option>';
        });
}

function loadGameExportPlayers(gameId) {
    var selectPlayer = document.getElementById("gameExportPlayerSelect");
    if (!selectPlayer || !gameId) return;
    var base = exportReportsBackendUrl();
    if (!window.__EXPORT_GAME_DETAIL_CACHE__) window.__EXPORT_GAME_DETAIL_CACHE__ = {};
    var cache = window.__EXPORT_GAME_DETAIL_CACHE__;
    function apply(detail) {
        var elenco = detail && detail.elenco ? detail.elenco : [];
        var html = '<option value="">Todos os atletas</option>';
        for (var i = 0; i < elenco.length; i++) {
            var e = elenco[i] || {};
            html += '<option value="' + exportReportsEsc(e.playerId || "") + '">' + exportReportsEsc((e.name || "Atleta") + (e.number ? (" #" + e.number) : "")) + "</option>";
        }
        selectPlayer.innerHTML = html;
    }
    if (cache[gameId]) return apply(cache[gameId]);
    fetch(base + "/games/reports/detail?gameId=" + encodeURIComponent(gameId), { method: "GET", cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(function (d) {
            if (!d || !d.success) return;
            cache[gameId] = d;
            apply(d);
        })
        .catch(function () {});
}

function collectGameExportSelection() {
    var els = document.querySelectorAll(".game-export-opt:checked");
    var out = [];
    for (var i = 0; i < els.length; i++) out.push(els[i].value);
    return out;
}

async function generateGameReportsPdfFromSelection() {
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
    try {
        var detail = null;
        if (window.__EXPORT_GAME_DETAIL_CACHE__ && window.__EXPORT_GAME_DETAIL_CACHE__[gameId]) detail = window.__EXPORT_GAME_DETAIL_CACHE__[gameId];
        if (!detail) {
            var r = await fetch(base + "/games/reports/detail?gameId=" + encodeURIComponent(gameId), { method: "GET", cache: "no-store" });
            var d = await r.json();
            if (!r.ok || !d.success) throw new Error((d && d.error) || "Jogo não encontrado");
            detail = d;
        }
        await generateGameReportsPdf(detail, selected);
    } catch (e) {
        alert("Erro ao gerar PDF: " + String(e.message || e));
    }
}

async function generateGameReportsPdf(detail, selected) {
    var jsPDF = window.jspdf.jsPDF;
    var doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    await pdfApplyBrandHeader(doc, "Relatórios de Jogo - OnField", exportReportsFmtDateTimeIso(new Date().toISOString()));
    var y = 32;
    var elenco = detail.elenco || [];
    var logs = detail.logs || [];
    doc.text("Jogo: " + (detail.date || "—") + " " + (detail.time || "") + " - " + (detail.teamName || "—"), 14, y);
    y += 7;
    var playerFilterEl = document.getElementById("gameExportPlayerSelect");
    var selectedPlayerId = playerFilterEl ? String(playerFilterEl.value || "").trim() : "";
    var filteredElenco = selectedPlayerId ? elenco.filter(function (e) { return String(e.playerId || "") === selectedPlayerId; }) : elenco;
    var filteredLogs = selectedPlayerId ? logs.filter(function (l) { return String(l.playerId || "") === selectedPlayerId; }) : logs;

    for (var i = 0; i < selected.length; i++) {
        var key = selected[i];
        if (key === "minutes") {
            y = pdfAddSectionTitle(doc, "1) Tempo total em quadra por atleta", y + 2);
            if (!filteredElenco.length) y = pdfAddTextLine(doc, "Sem dados de elenco.", y);
            var minutesRows = [];
            for (var e = 0; e < filteredElenco.length; e++) {
                var row = filteredElenco[e];
                y = pdfAddTextLine(doc, (row.name || "Atleta") + " #" + (row.number || "-") + " - " + (row.totalOnField || "0:00"), y);
                var ms = 0;
                var m = String(row.totalOnField || "").match(/^(\d{1,2}):(\d{2})$/);
                if (m) ms = (parseInt(m[1], 10) * 60) + parseInt(m[2], 10);
                minutesRows.push({ key: row.name || "Atleta", value: ms });
            }
            y = pdfDrawBarChart(doc, "Grafico - tempo total em quadra", minutesRows, y + 1, [254, 236, 2], 10);
        } else if (key === "subs") {
            y = pdfAddSectionTitle(doc, "2) Entradas e saidas", y + 2);
            if (!filteredElenco.length) y = pdfAddTextLine(doc, "Sem dados de substituicao.", y);
            for (var s = 0; s < filteredElenco.length; s++) {
                var sr = filteredElenco[s];
                y = pdfAddTextLine(doc, (sr.name || "Atleta") + " - entradas: " + (sr.entryCount || "0"), y);
                var stints = String(sr.stintsDetail || "").split("|").map(function (x) { return x.trim(); }).filter(Boolean);
                for (var st = 0; st < stints.length; st++) y = pdfAddTextLine(doc, "   • " + stints[st], y, 9);
            }
        } else if (key === "events") {
            y = pdfAddSectionTitle(doc, "3) Eventos do jogo", y + 2);
            var countByEvent = {};
            for (var lg = 0; lg < filteredLogs.length; lg++) {
                var ev = String((filteredLogs[lg] || {}).event || "Sem evento");
                countByEvent[ev] = (countByEvent[ev] || 0) + 1;
            }
            var topEv = Object.keys(countByEvent).map(function (k) { return { key: k, value: countByEvent[k] }; });
            topEv.sort(function (a, b) { return b.value - a.value; });
            y = pdfAddTopList(doc, topEv, y, "x");
            y = pdfDrawBarChart(doc, "Grafico - distribuicao de eventos", topEv, y + 1, [90, 170, 255], 10);
        } else if (key === "positions") {
            y = pdfAddSectionTitle(doc, "4) Tempo por posicao", y + 2);
            if (!filteredElenco.length) y = pdfAddTextLine(doc, "Sem dados de posicao.", y);
            for (var p = 0; p < filteredElenco.length; p++) {
                var pr = filteredElenco[p];
                y = pdfAddTextLine(doc, (pr.name || "Atleta") + " - " + (pr.positionBreakdown || "Sem dados"), y);
            }
        } else if (key === "individual_player") {
            y = pdfAddSectionTitle(doc, "5) Relatorio individual de atleta", y + 2);
            if (!selectedPlayerId) {
                y = pdfAddTextLine(doc, "Selecione um atleta no filtro para gerar o relatório individual.", y);
            } else if (!filteredElenco.length) {
                y = pdfAddTextLine(doc, "Atleta sem dados no jogo selecionado.", y);
            } else {
                var aRow = filteredElenco[0];
                y = pdfAddTextLine(doc, (aRow.name || "Atleta") + " #" + (aRow.number || "-"), y);
                y = pdfAddTextLine(doc, "Tempo total em quadra: " + (aRow.totalOnField || "0:00"), y);
                y = pdfAddTextLine(doc, "Entradas: " + (aRow.entryCount || "0"), y);
                y = pdfAddTextLine(doc, "Tempo por posicao: " + (aRow.positionBreakdown || "Sem dados"), y);
                var st = String(aRow.stintsDetail || "").split("|").map(function (x) { return x.trim(); }).filter(Boolean);
                for (var sx = 0; sx < st.length; sx++) y = pdfAddTextLine(doc, "   • " + st[sx], y, 9);
                var events = filteredLogs.filter(function (l) {
                    var evn = String(l.event || "").toLowerCase();
                    return evn !== "entrada" && evn !== "saída" && evn !== "saida";
                });
                y = pdfAddTextLine(doc, "Eventos registrados: " + events.length, y);
                for (var ex = 0; ex < events.slice(0, 15).length; ex++) {
                    var evr = events[ex];
                    y = pdfAddTextLine(doc, "   • " + (evr.minuteLabel || "—") + " - " + (evr.event || "Evento"), y, 9);
                }
            }
        }
    }

    doc.save("relatorios_jogo_onfield.pdf");
}
