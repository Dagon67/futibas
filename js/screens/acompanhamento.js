/* ===========================
   📊 ACOMPANHAMENTO - Dashboard Geral e Individual
   Dados puxados do Sheets (GET /analytics)
   =========================== */

var ACOMPANHAMENTO_CHARTS = [];

function goAcompanhamento() {
    destroyAcompanhamentoCharts();
    state.currentScreen = "acompanhamento";
    setHeaderModeLabel("Acompanhamento");
    renderScreen(`
        <div class="settings-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="goHome()"><i data-feather="arrow-left"></i><span>Voltar</span></button>
                <div>
                    <div class="screen-title">Acompanhamento</div>
                    <div class="screen-sub">Visão geral do time ou por jogador</div>
                </div>
            </div>
            <div class="acompanhamento-options">
                <button class="home-btn home-btn-primary" onclick="goAcompanhamentoGeral()" style="max-width:320px;">
                    <i data-feather="trending-up"></i>
                    <div>Geral</div>
                    <div class="sub">Gráficos e KPIs do time</div>
                </button>
                <button class="home-btn home-btn-secondary" onclick="goAcompanhamentoIndividual()" style="max-width:320px;">
                    <i data-feather="user"></i>
                    <div>Individual</div>
                    <div class="sub">Evolução por jogador</div>
                </button>
            </div>
        </div>
    `);
    feather.replace();
}

function getBackendUrl() {
    return (typeof window !== "undefined" && window.BACKEND_URL) ? window.BACKEND_URL : "";
}

function fetchAnalyticsData() {
    var base = getBackendUrl();
    if (!base) return Promise.resolve({ success: false, error: "Backend não configurado" });
    return fetch(base + "/analytics", { method: "GET" })
        .then(function (r) { return r.json(); })
        .catch(function (e) { return { success: false, error: String(e.message || e) }; });
}

// Índices fixos das colunas no Sheets (pre: 0-6 fixos, 7+ perguntas; pos: 0-6 fixos, 7+ perguntas)
var PRE_ID_JOGADOR = 3, PRE_NOME = 4, PRE_DATA = 1;
var POS_ID_JOGADOR = 3, POS_NOME = 4, POS_DATA = 1;

function colIndex(headers, name) {
    for (var i = 0; i < headers.length; i++) {
        if ((headers[i] || "").trim() === (name || "").trim()) return i;
    }
    return -1;
}

function parsePreRow(headers, row) {
    var playerId = (row[PRE_ID_JOGADOR] || "").toString().trim();
    var name = (row[PRE_NOME] || "").toString().trim();
    var date = (row[PRE_DATA] || "").toString().trim();
    var answers = {};
    var recuperacao = colIndex(headers, "Qualidade Total de Recuperação");
    var fadiga = colIndex(headers, "Nível de fadiga");
    var sono = colIndex(headers, "Nível de sono");
    var dor = colIndex(headers, "Nível de dor");
    var estresse = colIndex(headers, "Nível de estresse");
    var humor = colIndex(headers, "Nível de humor");
    var pontosDor = colIndex(headers, "Pontos de dor");
    var pontosArticular = colIndex(headers, "Pontos de dor articular");
    if (recuperacao >= 0 && row[recuperacao] !== undefined) answers.recuperacao = parseNum(row[recuperacao]);
    if (fadiga >= 0 && row[fadiga] !== undefined) answers.fadiga = parseNum(row[fadiga]);
    if (sono >= 0 && row[sono] !== undefined) answers.sono = parseNum(row[sono]);
    if (dor >= 0 && row[dor] !== undefined) answers.dor = parseNum(row[dor]);
    if (estresse >= 0 && row[estresse] !== undefined) answers.estresse = parseNum(row[estresse]);
    if (humor >= 0 && row[humor] !== undefined) answers.humor = parseNum(row[humor]);
    if (pontosDor >= 0 && row[pontosDor] !== undefined) answers.pontosDor = (row[pontosDor] || "").toString();
    if (pontosArticular >= 0 && row[pontosArticular] !== undefined) answers.pontosArticular = (row[pontosArticular] || "").toString();
    return { playerId: playerId, name: name, date: date, answers: answers };
}

function parsePosRow(headers, row) {
    var playerId = (row[POS_ID_JOGADOR] || "").toString().trim();
    var name = (row[POS_NOME] || "").toString().trim();
    var date = (row[POS_DATA] || "").toString().trim();
    var estado = colIndex(headers, "Estado atual");
    var tempo = colIndex(headers, "Quanto tempo de treino foi feito?");
    var answers = {};
    if (estado >= 0 && row[estado] !== undefined) answers.estado = parseNum(row[estado]);
    if (tempo >= 0 && row[tempo] !== undefined) answers.tempoMin = parseTempoMin(row[tempo]);
    return { playerId: playerId, name: name, date: date, answers: answers };
}

function parseNum(s) {
    if (s === undefined || s === null) return null;
    var n = parseFloat(String(s).replace(",", "."));
    return isNaN(n) ? null : n;
}

function parseTempoMin(s) {
    if (!s) return null;
    var str = String(s).trim();
    var m = str.match(/(\d+)\s*min/);
    if (m) return parseInt(m[1], 10);
    return parseNum(str);
}

function buildAggregates(data) {
    var preH = (data.pre && data.pre.headers) ? data.pre.headers : [];
    var preRows = (data.pre && data.pre.rows) ? data.pre.rows : [];
    var posH = (data.pos && data.pos.headers) ? data.pos.headers : [];
    var posRows = (data.pos && data.pos.rows) ? data.pos.rows : [];
    var players = (data.players && Array.isArray(data.players)) ? data.players : [];

    var byPlayer = {};
    players.forEach(function (p) {
        byPlayer[p.id] = { id: p.id, name: p.name || p.id, pre: [], pos: [] };
    });

    preRows.forEach(function (row) {
        var r = parsePreRow(preH, row);
        if (!byPlayer[r.playerId]) byPlayer[r.playerId] = { id: r.playerId, name: r.name, pre: [], pos: [] };
        byPlayer[r.playerId].pre.push(r);
        byPlayer[r.playerId].name = r.name || byPlayer[r.playerId].name;
    });
    posRows.forEach(function (row) {
        var r = parsePosRow(posH, row);
        if (!byPlayer[r.playerId]) byPlayer[r.playerId] = { id: r.playerId, name: r.name, pre: [], pos: [] };
        byPlayer[r.playerId].pos.push(r);
        byPlayer[r.playerId].name = r.name || byPlayer[r.playerId].name;
    });

    var injuryByPlayer = {};
    var injuryByZone = {};
    var somaRecuperacao = 0, countRecuperacao = 0;
    var somaDor = 0, countDor = 0;
    var somaFadiga = 0, countFadiga = 0;
    var somaSono = 0, countSono = 0;
    var somaHumor = 0, countHumor = 0;
    var somaEstado = 0, countEstado = 0;
    var somaTempoMin = 0, countTempoMin = 0;

    Object.keys(byPlayer).forEach(function (pid) {
        var p = byPlayer[pid];
        injuryByPlayer[pid] = 0;
        p.pre.forEach(function (r) {
            if (r.answers.recuperacao != null) { somaRecuperacao += r.answers.recuperacao; countRecuperacao++; }
            if (r.answers.dor != null) { somaDor += r.answers.dor; countDor++; }
            if (r.answers.fadiga != null) { somaFadiga += r.answers.fadiga; countFadiga++; }
            if (r.answers.sono != null) { somaSono += r.answers.sono; countSono++; }
            if (r.answers.humor != null) { somaHumor += r.answers.humor; countHumor++; }
            var pd = (r.answers.pontosDor || "").trim();
            var pa = (r.answers.pontosArticular || "").trim();
            if (pd && pd !== "Sem dor") {
                pd.split(/[;,]/).forEach(function (z) {
                    z = z.trim();
                    if (z) { injuryByZone[z] = (injuryByZone[z] || 0) + 1; injuryByPlayer[pid]++; }
                });
            }
            if (pa && pa !== "Sem dor") {
                pa.split(/[;,]/).forEach(function (z) {
                    z = z.trim();
                    if (z) { injuryByZone["Articular " + z] = (injuryByZone["Articular " + z] || 0) + 1; injuryByPlayer[pid]++; }
                });
            }
        });
        p.pos.forEach(function (r) {
            if (r.answers.estado != null) { somaEstado += r.answers.estado; countEstado++; }
            if (r.answers.tempoMin != null) { somaTempoMin += r.answers.tempoMin; countTempoMin++; }
        });
    });

    var topInjured = Object.keys(injuryByPlayer)
        .map(function (pid) { return { playerId: pid, name: byPlayer[pid] ? byPlayer[pid].name : pid, count: injuryByPlayer[pid] }; })
        .filter(function (x) { return x.count > 0; })
        .sort(function (a, b) { return b.count - a.count; })
        .slice(0, 10);

    var zonesSorted = Object.keys(injuryByZone)
        .map(function (z) { return { zone: z, count: injuryByZone[z] }; })
        .sort(function (a, b) { return b.count - a.count; })
        .slice(0, 12);

    return {
        byPlayer: byPlayer,
        topInjured: topInjured,
        zonesSorted: zonesSorted,
        avgRecuperacao: countRecuperacao ? Math.round((somaRecuperacao / countRecuperacao) * 10) / 10 : null,
        avgDor: countDor ? Math.round((somaDor / countDor) * 10) / 10 : null,
        avgFadiga: countFadiga ? Math.round((somaFadiga / countFadiga) * 10) / 10 : null,
        avgSono: countSono ? Math.round((somaSono / countSono) * 10) / 10 : null,
        avgHumor: countHumor ? Math.round((somaHumor / countHumor) * 10) / 10 : null,
        avgEstado: countEstado ? Math.round((somaEstado / countEstado) * 10) / 10 : null,
        avgTempoMin: countTempoMin ? Math.round(somaTempoMin / countTempoMin) : null,
        totalPre: preRows.length,
        totalPos: posRows.length,
        numPlayers: Object.keys(byPlayer).length
    };
}

function destroyAcompanhamentoCharts() {
    ACOMPANHAMENTO_CHARTS.forEach(function (c) { try { if (c && c.destroy) c.destroy(); } catch (e) {} });
    ACOMPANHAMENTO_CHARTS = [];
}

function chartOptions(title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: "#e0e0e0", font: { size: 12 } } },
            title: { display: !!title, text: title || "", color: "#feec02", font: { size: 14 } }
        },
        scales: (title ? {} : undefined)
    };
}

var CHART_COLORS = ["#feec02", "#ffcc01", "#e6d600", "#b3a800", "#807600", "#4d4700", "#9c9200", "#c9bf00", "#fff056", "#e0d84d", "#c4b82e", "#a8980f"];

function goAcompanhamentoGeral() {
    state.currentScreen = "acompanhamentoGeral";
    setHeaderModeLabel("Acompanhamento Geral");
    renderScreen(`
        <div class="settings-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="goAcompanhamento()"><i data-feather="arrow-left"></i><span>Voltar</span></button>
                <div>
                    <div class="screen-title">Visão Geral</div>
                    <div class="screen-sub">Carregando dados do Sheets...</div>
                </div>
            </div>
            <div id="acompanhamento-geral-content" class="acompanhamento-scroll"></div>
        </div>
    `);
    feather.replace();

    fetchAnalyticsData().then(function (res) {
        var content = document.getElementById("acompanhamento-geral-content");
        if (!res.success || !content) {
            if (content) content.innerHTML = "<div class=\"item-sub\" style=\"padding:2rem;text-align:center;\">Erro ao carregar: " + (res.error || "desconhecido") + ".</div>";
            return;
        }
        var agg = buildAggregates(res);
        var sub = document.querySelector(".screen-sub");
        if (sub) sub.textContent = agg.totalPre + " respostas pré • " + agg.totalPos + " respostas pós";

        var kpiHtml = "<div class=\"kpi-grid\">";
        if (agg.avgRecuperacao != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + agg.avgRecuperacao + "</div><div class=\"kpi-label\">Recuperação média (1-20)</div></div>";
        if (agg.avgDor != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + agg.avgDor + "</div><div class=\"kpi-label\">Dor média (1-5)</div></div>";
        if (agg.avgTempoMin != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + agg.avgTempoMin + " min</div><div class=\"kpi-label\">Tempo médio de treino</div></div>";
        if (agg.avgEstado != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + agg.avgEstado + "</div><div class=\"kpi-label\">Estado pós-treino (0-10)</div></div>";
        if (agg.totalPre != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + agg.totalPre + "</div><div class=\"kpi-label\">Total respostas pré</div></div>";
        if (agg.totalPos != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + agg.totalPos + "</div><div class=\"kpi-label\">Total respostas pós</div></div>";
        kpiHtml += "</div>";

        content.innerHTML = kpiHtml +
            "<div class=\"chart-section\"><h3 class=\"chart-title\">Jogadores com mais relatos de dor/lesão</h3><div class=\"chart-wrap\"><canvas id=\"chartTopInjured\"></canvas></div></div>" +
            "<div class=\"chart-section\"><h3 class=\"chart-title\">Zonas de dor mais frequentes</h3><div class=\"chart-wrap\"><canvas id=\"chartZones\"></canvas></div></div>" +
            "<div class=\"chart-section\"><h3 class=\"chart-title\">Médias de bem-estar (pré-treino)</h3><div class=\"chart-wrap\"><canvas id=\"chartWellbeing\"></canvas></div></div>" +
            "<div class=\"chart-section\"><h3 class=\"chart-title\">Comparativo recuperação x dor</h3><div class=\"chart-wrap\"><canvas id=\"chartRecupDor\"></canvas></div></div>" +
            "<div class=\"chart-section\"><h3 class=\"chart-title\">Distribuição tempo de treino (pós)</h3><div class=\"chart-wrap\"><canvas id=\"chartTempo\"></canvas></div></div>";

        destroyAcompanhamentoCharts();

        if (agg.topInjured.length > 0 && window.Chart) {
            var ctx1 = document.getElementById("chartTopInjured");
            if (ctx1) ACOMPANHAMENTO_CHARTS.push(new Chart(ctx1.getContext("2d"), {
                type: "bar",
                data: {
                    labels: agg.topInjured.map(function (x) { return x.name || x.playerId; }),
                    datasets: [{ label: "Relatos de dor", data: agg.topInjured.map(function (x) { return x.count; }), backgroundColor: CHART_COLORS[0], borderColor: "#fff", borderWidth: 1 }]
                },
                options: chartOptions()
            }));
        }
        if (agg.zonesSorted.length > 0 && window.Chart) {
            var ctx2 = document.getElementById("chartZones");
            if (ctx2) ACOMPANHAMENTO_CHARTS.push(new Chart(ctx2.getContext("2d"), {
                type: "doughnut",
                data: {
                    labels: agg.zonesSorted.map(function (x) { return x.zone; }),
                    datasets: [{ data: agg.zonesSorted.map(function (x) { return x.count; }), backgroundColor: CHART_COLORS, borderColor: "#1a1a1a", borderWidth: 2 }]
                },
                options: chartOptions()
            }));
        }
        if (window.Chart) {
            var ctx3 = document.getElementById("chartWellbeing");
            if (ctx3) {
                var wbLabels = [];
                var wbData = [];
                if (agg.avgRecuperacao != null) { wbLabels.push("Recuperação"); wbData.push(agg.avgRecuperacao); }
                if (agg.avgFadiga != null) { wbLabels.push("Fadiga"); wbData.push(agg.avgFadiga); }
                if (agg.avgSono != null) { wbLabels.push("Sono"); wbData.push(agg.avgSono); }
                if (agg.avgDor != null) { wbLabels.push("Dor"); wbData.push(agg.avgDor); }
                if (agg.avgHumor != null) { wbLabels.push("Humor"); wbData.push(agg.avgHumor); }
                if (wbData.length) ACOMPANHAMENTO_CHARTS.push(new Chart(ctx3.getContext("2d"), {
                    type: "radar",
                    data: {
                        labels: wbLabels,
                        datasets: [{ label: "Média", data: wbData, backgroundColor: "rgba(254,236,2,0.3)", borderColor: "#feec02", borderWidth: 2, pointBackgroundColor: "#feec02" }]
                    },
                    options: chartOptions()
                }));
            }
        }
        if (agg.topInjured.length > 0 && window.Chart) {
            var recupByPlayer = [];
            var dorByPlayer = [];
            agg.topInjured.slice(0, 6).forEach(function (x) {
                var p = agg.byPlayer[x.playerId];
                if (p && p.pre.length) {
                    var r = 0, d = 0, nr = 0, nd = 0;
                    p.pre.forEach(function (row) {
                        if (row.answers.recuperacao != null) { r += row.answers.recuperacao; nr++; }
                        if (row.answers.dor != null) { d += row.answers.dor; nd++; }
                    });
                    recupByPlayer.push(nr ? Math.round((r / nr) * 10) / 10 : 0);
                    dorByPlayer.push(nd ? Math.round((d / nd) * 10) / 10 : 0);
                } else { recupByPlayer.push(0); dorByPlayer.push(0); }
            });
            var ctx4 = document.getElementById("chartRecupDor");
            if (ctx4 && recupByPlayer.length) ACOMPANHAMENTO_CHARTS.push(new Chart(ctx4.getContext("2d"), {
                type: "bar",
                data: {
                    labels: agg.topInjured.slice(0, 6).map(function (x) { return x.name || x.playerId; }),
                    datasets: [
                        { label: "Recuperação média", data: recupByPlayer, backgroundColor: "rgba(254,236,2,0.8)", borderColor: "#feec02", borderWidth: 1 },
                        { label: "Dor média", data: dorByPlayer, backgroundColor: "rgba(255,120,80,0.8)", borderColor: "#ff7850", borderWidth: 1 }
                    ]
                },
                options: { ...chartOptions(), scales: { y: { beginAtZero: true, ticks: { color: "#e0e0e0" } }, x: { ticks: { color: "#e0e0e0" } } } }
            }));
        }
        if (res.pos && res.pos.rows && res.pos.rows.length > 0 && window.Chart) {
            var tempoIdx = colIndex(res.pos.headers, "Quanto tempo de treino foi feito?");
            var buckets = { "10-30": 0, "40-60": 0, "70-90": 0, "100-120": 0 };
            res.pos.rows.forEach(function (row) {
                if (tempoIdx >= 0 && row[tempoIdx] !== undefined) {
                    var min = parseTempoMin(row[tempoIdx]);
                    if (min != null) {
                        if (min <= 30) buckets["10-30"]++;
                        else if (min <= 60) buckets["40-60"]++;
                        else if (min <= 90) buckets["70-90"]++;
                        else buckets["100-120"]++;
                    }
                }
            });
            var ctx5 = document.getElementById("chartTempo");
            if (ctx5) ACOMPANHAMENTO_CHARTS.push(new Chart(ctx5.getContext("2d"), {
                type: "pie",
                data: {
                    labels: ["10-30 min", "40-60 min", "70-90 min", "100-120 min"],
                    datasets: [{ data: [buckets["10-30"], buckets["40-60"], buckets["70-90"], buckets["100-120"]], backgroundColor: CHART_COLORS.slice(0, 4), borderColor: "#1a1a1a", borderWidth: 2 }]
                },
                options: chartOptions()
            }));
        }
    });
}

function goAcompanhamentoIndividual() {
    state.currentScreen = "acompanhamentoIndividual";
    setHeaderModeLabel("Acompanhamento Individual");
    renderScreen(`
        <div class="settings-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="goAcompanhamento()"><i data-feather="arrow-left"></i><span>Voltar</span></button>
                <div>
                    <div class="screen-title">Por Jogador</div>
                    <div class="screen-sub">Carregando...</div>
                </div>
            </div>
            <div id="acompanhamento-individual-list" class="acompanhamento-scroll"></div>
        </div>
    `);
    feather.replace();

    fetchAnalyticsData().then(function (res) {
        var listEl = document.getElementById("acompanhamento-individual-list");
        var sub = document.querySelector(".screen-sub");
        if (!res.success || !listEl) {
            if (listEl) listEl.innerHTML = "<div class=\"item-sub\" style=\"padding:2rem;\">Erro: " + (res.error || "desconhecido") + "</div>";
            return;
        }
        var agg = buildAggregates(res);
        if (sub) sub.textContent = "Clique em um jogador para ver gráficos e evolução.";
        var players = Object.keys(agg.byPlayer).map(function (id) { return agg.byPlayer[id]; }).filter(function (p) { return p.name || p.id; }).sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
        listEl.innerHTML = "<div class=\"acompanhamento-player-list\">" +
            players.map(function (p) {
                var preCount = (p.pre && p.pre.length) || 0;
                var posCount = (p.pos && p.pos.length) || 0;
                return "<button type=\"button\" class=\"acompanhamento-player-btn\" onclick=\"goAcompanhamentoPlayer('" + (p.id || "").replace(/'/g, "\\'") + "')\"><span class=\"player-name\">" + (p.name || p.id) + "</span><span class=\"player-stats\">" + preCount + " pré • " + posCount + " pós</span></button>";
            }).join("") +
            "</div>";
    });
}

function goAcompanhamentoPlayer(playerId) {
    state.currentScreen = "acompanhamentoPlayer";
    state.currentAcompanhamentoPlayerId = playerId;
    renderScreen(`
        <div class="settings-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="goAcompanhamentoIndividual()"><i data-feather="arrow-left"></i><span>Voltar</span></button>
                <div>
                    <div class="screen-title" id="acompanhamento-player-title">Jogador</div>
                    <div class="screen-sub">Carregando...</div>
                </div>
            </div>
            <div id="acompanhamento-player-content" class="acompanhamento-scroll"></div>
        </div>
    `);
    feather.replace();

    fetchAnalyticsData().then(function (res) {
        var content = document.getElementById("acompanhamento-player-content");
        var titleEl = document.getElementById("acompanhamento-player-title");
        var subEl = document.querySelector(".screen-sub");
        if (!res.success || !content) {
            if (content) content.innerHTML = "<div class=\"item-sub\" style=\"padding:2rem;\">Erro ao carregar dados.</div>";
            return;
        }
        var agg = buildAggregates(res);
        var p = agg.byPlayer[playerId];
        if (!p) {
            content.innerHTML = "<div class=\"item-sub\" style=\"padding:2rem;\">Jogador não encontrado nos dados.</div>";
            return;
        }
        if (titleEl) titleEl.textContent = p.name || playerId;
        if (subEl) subEl.textContent = p.pre.length + " respostas pré • " + p.pos.length + " respostas pós";

        var recuperacaoValues = [];
        var dorValues = [];
        var labels = [];
        p.pre.forEach(function (r, i) {
            labels.push(r.date || "Pré " + (i + 1));
            recuperacaoValues.push(r.answers.recuperacao != null ? r.answers.recuperacao : null);
            dorValues.push(r.answers.dor != null ? r.answers.dor : null);
        });
        var avgRec = 0, nRec = 0;
        p.pre.forEach(function (r) { if (r.answers.recuperacao != null) { avgRec += r.answers.recuperacao; nRec++; } });
        avgRec = nRec ? Math.round((avgRec / nRec) * 10) / 10 : null;
        var avgDor = 0, nDor = 0;
        p.pre.forEach(function (r) { if (r.answers.dor != null) { avgDor += r.answers.dor; nDor++; } });
        avgDor = nDor ? Math.round((avgDor / nDor) * 10) / 10 : null;
        var tempoMedio = 0, nTempo = 0;
        p.pos.forEach(function (r) { if (r.answers.tempoMin != null) { tempoMedio += r.answers.tempoMin; nTempo++; } });
        tempoMedio = nTempo ? Math.round(tempoMedio / nTempo) : null;
        var estadoMedio = 0, nEst = 0;
        p.pos.forEach(function (r) { if (r.answers.estado != null) { estadoMedio += r.answers.estado; nEst++; } });
        estadoMedio = nEst ? Math.round((estadoMedio / nEst) * 10) / 10 : null;

        var kpiHtml = "<div class=\"kpi-grid\">";
        if (avgRec != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + avgRec + "</div><div class=\"kpi-label\">Recuperação média</div></div>";
        if (avgDor != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + avgDor + "</div><div class=\"kpi-label\">Dor média</div></div>";
        if (tempoMedio != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + tempoMedio + " min</div><div class=\"kpi-label\">Tempo médio treino</div></div>";
        if (estadoMedio != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + estadoMedio + "</div><div class=\"kpi-label\">Estado pós (média)</div></div>";
        kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + p.pre.length + "</div><div class=\"kpi-label\">Respostas pré</div></div>";
        kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + p.pos.length + "</div><div class=\"kpi-label\">Respostas pós</div></div></div>";

        content.innerHTML = kpiHtml +
            "<div class=\"chart-section\"><h3 class=\"chart-title\">Evolução Recuperação (pré)</h3><div class=\"chart-wrap\"><canvas id=\"chartPlayerRecup\"></canvas></div></div>" +
            "<div class=\"chart-section\"><h3 class=\"chart-title\">Evolução Dor (pré)</h3><div class=\"chart-wrap\"><canvas id=\"chartPlayerDor\"></canvas></div></div>" +
            "<div class=\"chart-section\"><h3 class=\"chart-title\">Estado pós-treino ao longo do tempo</h3><div class=\"chart-wrap\"><canvas id=\"chartPlayerEstado\"></canvas></div></div>";

        destroyAcompanhamentoCharts();

        if (labels.length > 0 && window.Chart) {
            var ctxR = document.getElementById("chartPlayerRecup");
            if (ctxR) ACOMPANHAMENTO_CHARTS.push(new Chart(ctxR.getContext("2d"), {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [{ label: "Recuperação", data: recuperacaoValues, borderColor: "#feec02", backgroundColor: "rgba(254,236,2,0.2)", fill: true, tension: 0.3 }]
                },
                options: chartOptions()
            }));
            var ctxD = document.getElementById("chartPlayerDor");
            if (ctxD) ACOMPANHAMENTO_CHARTS.push(new Chart(ctxD.getContext("2d"), {
                type: "line",
                data: {
                    labels: labels,
                    datasets: [{ label: "Dor", data: dorValues, borderColor: "#ff7850", backgroundColor: "rgba(255,120,80,0.2)", fill: true, tension: 0.3 }]
                },
                options: chartOptions()
            }));
        }
        if (p.pos.length > 0 && window.Chart) {
            var posLabels = p.pos.map(function (r, i) { return r.date || "Pós " + (i + 1); });
            var estadoData = p.pos.map(function (r) { return r.answers.estado != null ? r.answers.estado : null; });
            var ctxE = document.getElementById("chartPlayerEstado");
            if (ctxE) ACOMPANHAMENTO_CHARTS.push(new Chart(ctxE.getContext("2d"), {
                type: "line",
                data: {
                    labels: posLabels,
                    datasets: [{ label: "Estado", data: estadoData, borderColor: "#4ade80", backgroundColor: "rgba(74,222,128,0.2)", fill: true, tension: 0.3 }]
                },
                options: chartOptions()
            }));
        }
    });
}
