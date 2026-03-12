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
                <button class="home-btn home-btn-secondary" onclick="goBemEstarPre()" style="max-width:320px;">
                    <i data-feather="heart"></i>
                    <div>Bem-Estar Pré</div>
                    <div class="sub">Semáforo, evolução e pontos de dor</div>
                </button>
                <button class="home-btn home-btn-secondary" onclick="goInformacaoTatica()" style="max-width:320px;">
                    <i data-feather="activity"></i>
                    <div>Informação Tática</div>
                    <div class="sub">Semáforo TRIMP (carga pós-treino)</div>
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

// Rótulos anatômicos (Bem-Estar Pré) — articular 1–9, muscular A–Z
var LABEL_ARTICULAR = { "1": "Ombro", "2": "Cotovelo", "3": "Punho", "4": "Quadril", "5": "Joelho", "6": "Tornozelo", "7": "Coluna cervical", "8": "Coluna torácica", "9": "Coluna lombar" };
var LABEL_MUSCULAR = { "A": "Pescoço", "B": "Trapézio", "C": "Ombro", "D": "Peitoral", "E": "Coxa ant./med.", "F": "Panturrilha", "G": "Abdômen", "H": "Costas", "I": "Deltoide/Ombro", "J": "Bíceps", "K": "Tríceps", "L": "Antebraço", "M": "Lombar", "N": "Glúteo", "O": "Adutor", "P": "Quadríceps", "Q": "Posterior coxa", "R": "Posterior coxa", "S": "Glúteo", "T": "Panturrilha", "U": "Tornozelo", "V": "Outro", "W": "Outro", "X": "Outro", "Y": "Outro", "Z": "Outro" };

function buildBemEstarPreData(data) {
    var preH = (data.pre && data.pre.headers) ? data.pre.headers : [];
    var preRows = (data.pre && data.pre.rows) ? data.pre.rows : [];
    var byDate = {};
    preRows.forEach(function (row) {
        var r = parsePreRow(preH, row);
        var d = (r.date || "").trim();
        if (!d) return;
        if (!byDate[d]) byDate[d] = [];
        byDate[d].push(r);
    });
    var dates = Object.keys(byDate).sort();
    var last15Dates = dates.slice(-15);
    var teamAveragesByDate = last15Dates.map(function (d) {
        var rows = byDate[d] || [];
        var sum = { recuperacao: 0, fadiga: 0, sono: 0, dor: 0, estresse: 0, humor: 0 };
        var count = { recuperacao: 0, fadiga: 0, sono: 0, dor: 0, estresse: 0, humor: 0 };
        rows.forEach(function (r) {
            var a = r.answers;
            if (a.recuperacao != null) { sum.recuperacao += a.recuperacao; count.recuperacao++; }
            if (a.fadiga != null) { sum.fadiga += a.fadiga; count.fadiga++; }
            if (a.sono != null) { sum.sono += a.sono; count.sono++; }
            if (a.dor != null) { sum.dor += a.dor; count.dor++; }
            if (a.estresse != null) { sum.estresse += a.estresse; count.estresse++; }
            if (a.humor != null) { sum.humor += a.humor; count.humor++; }
        });
        return {
            date: d,
            recuperacao: count.recuperacao ? Math.round((sum.recuperacao / count.recuperacao) * 10) / 10 : null,
            fadiga: count.fadiga ? Math.round((sum.fadiga / count.fadiga) * 10) / 10 : null,
            sono: count.sono ? Math.round((sum.sono / count.sono) * 10) / 10 : null,
            dor: count.dor ? Math.round((sum.dor / count.dor) * 10) / 10 : null,
            estresse: count.estresse ? Math.round((sum.estresse / count.estresse) * 10) / 10 : null,
            humor: count.humor ? Math.round((sum.humor / count.humor) * 10) / 10 : null
        };
    });
    return { byDate: byDate, dates: dates, last15Dates: last15Dates, teamAveragesByDate: teamAveragesByDate };
}

function semaforoClass(metric, value) {
    if (value == null || value === "") return "";
    if (metric === "recuperacao") {
        if (value >= 15) return "semaforo-verde";
        if (value >= 10) return "semaforo-amarelo";
        return "semaforo-vermelho";
    }
    if (metric === "humor") {
        if (value >= 4) return "semaforo-verde";
        if (value >= 3) return "semaforo-amarelo";
        return "semaforo-vermelho";
    }
    if (metric === "fadiga" || metric === "sono" || metric === "dor" || metric === "estresse") {
        if (value <= 2) return "semaforo-verde";
        if (value <= 3) return "semaforo-amarelo";
        return "semaforo-vermelho";
    }
    return "";
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

function goBemEstarPre() {
    state.currentScreen = "bemEstarPre";
    setHeaderModeLabel("Bem-Estar Pré");
    renderScreen(`
        <div class="settings-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="goAcompanhamento()"><i data-feather="arrow-left"></i><span>Voltar</span></button>
                <div>
                    <div class="screen-title">Bem-Estar Pré-Treino</div>
                    <div class="screen-sub">Carregando...</div>
                </div>
            </div>
            <div id="bem-estar-pre-content" class="acompanhamento-scroll"></div>
        </div>
    `);
    feather.replace();

    fetchAnalyticsData().then(function (res) {
        var content = document.getElementById("bem-estar-pre-content");
        if (!res.success || !content) {
            if (content) content.innerHTML = "<div class=\"item-sub\" style=\"padding:2rem;\">Erro: " + (res.error || "desconhecido") + "</div>";
            return;
        }
        var be = buildBemEstarPreData(res);
        var dates = be.dates;
        var last15 = be.last15Dates;
        var selectedDate = last15.length ? last15[last15.length - 1] : (dates.length ? dates[dates.length - 1] : "");
        var sub = document.querySelector(".screen-sub");
        if (sub) sub.textContent = "Semáforo do dia, evolução e pontos de dor";

        function parsePainCodes(str) {
            if (!str || (str || "").trim() === "Sem dor") return [];
            return (str || "").split(/[;,]/).map(function (s) { return s.trim(); }).filter(Boolean);
        }

        function renderBemEstarPre() {
            var rows = (be.byDate[selectedDate] || []).slice();
            rows.sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });

            var articularCount = {}, muscularCount = {};
            rows.forEach(function (r) {
                parsePainCodes(r.answers.pontosArticular).forEach(function (c) {
                    articularCount[c] = (articularCount[c] || 0) + 1;
                });
                parsePainCodes(r.answers.pontosDor).forEach(function (c) {
                    muscularCount[c] = (muscularCount[c] || 0) + 1;
                });
            });

            var dateOptions = dates.length ? dates.slice(-20).reverse().map(function (d) {
                return "<option value=\"" + d + "\"" + (d === selectedDate ? " selected" : "") + ">" + d + "</option>";
            }).join("") : "<option value=\"\">Nenhuma data</option>";

            var tableRows = rows.map(function (r) {
                var a = r.answers;
                var qtr = a.recuperacao != null ? a.recuperacao : "—";
                var qtrClass = a.recuperacao != null ? semaforoClass("recuperacao", a.recuperacao) : "";
                var fad = a.fadiga != null ? a.fadiga : "—";
                var fadClass = a.fadiga != null ? semaforoClass("fadiga", a.fadiga) : "";
                var son = a.sono != null ? a.sono : "—";
                var sonClass = a.sono != null ? semaforoClass("sono", a.sono) : "";
                var dr = a.dor != null ? a.dor : "—";
                var drClass = a.dor != null ? semaforoClass("dor", a.dor) : "";
                var est = a.estresse != null ? a.estresse : "—";
                var estClass = a.estresse != null ? semaforoClass("estresse", a.estresse) : "";
                var hum = a.humor != null ? a.humor : "—";
                var humClass = a.humor != null ? semaforoClass("humor", a.humor) : "";
                return "<tr><td>" + (r.name || r.playerId) + "</td><td class=\"" + qtrClass + "\">" + qtr + "</td><td class=\"" + fadClass + "\">" + fad + "</td><td class=\"" + sonClass + "\">" + son + "</td><td class=\"" + drClass + "\">" + dr + "</td><td class=\"" + estClass + "\">" + est + "</td><td class=\"" + humClass + "\">" + hum + "</td></tr>";
            }).join("");

            var articularList = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) {
                var key = String(n);
                var count = articularCount[key] || 0;
                var label = (LABEL_ARTICULAR[key] || key);
                return count ? "<span class=\"pain-badge\">" + key + " " + label + ": " + count + "</span>" : "";
            }).filter(Boolean).join(" ");
            var muscularList = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(function (c) {
                var count = muscularCount[c] || 0;
                var label = (LABEL_MUSCULAR[c] || c);
                return count ? "<span class=\"pain-badge\">" + c + " " + label + ": " + count + "</span>" : "";
            }).filter(Boolean).join(" ");

            var atletasComDor = rows.filter(function (r) {
                var art = parsePainCodes(r.answers.pontosArticular);
                var mus = parsePainCodes(r.answers.pontosDor);
                return art.length > 0 || mus.length > 0;
            });
            var atletasDorRows = atletasComDor.length ? atletasComDor.map(function (r) {
                var art = parsePainCodes(r.answers.pontosArticular).map(function (c) { return (LABEL_ARTICULAR[c] || c) + " (" + c + ")"; }).join(", ");
                var mus = parsePainCodes(r.answers.pontosDor).map(function (c) { return (LABEL_MUSCULAR[c] || c) + " (" + c + ")"; }).join(", ");
                return "<tr><td>" + (r.name || r.playerId) + "</td><td>" + (art || "—") + "</td><td>" + (mus || "—") + "</td></tr>";
            }).join("") : "<tr><td colspan=\"3\">Nenhum atleta com pontos de dor nesta data.</td></tr>";

            content.innerHTML =
                "<div class=\"chart-section\"><label>Data do treino: </label><select id=\"bem-estar-pre-date\" onchange=\"window._bemEstarPreSetDate(this.value);\">" + dateOptions + "</select></div>" +
                "<div class=\"chart-section\"><h3 class=\"chart-title\">Semáforo (pré-treino — " + selectedDate + ")</h3><div class=\"table-wrap\"><table class=\"bem-estar-table\"><thead><tr><th>Atleta</th><th>QTR</th><th>Fad</th><th>Sono</th><th>Dor</th><th>Est</th><th>Hum</th></tr></thead><tbody>" + tableRows + "</tbody></table></div></div>" +
                "<div class=\"chart-section\"><h3 class=\"chart-title\">Últimos 15 treinos (média do time)</h3><div class=\"chart-wrap\"><canvas id=\"chartBemEstarLinhas\"></canvas></div></div>" +
                "<div class=\"chart-section\"><h3 class=\"chart-title\">Pontos de dor (do dia)</h3><p><strong>Articular:</strong> " + (articularList || "Nenhum") + "</p><p><strong>Muscular:</strong> " + (muscularList || "Nenhum") + "</p></div>" +
                "<div class=\"chart-section\"><h3 class=\"chart-title\">Atletas com pontos de dor (" + selectedDate + ")</h3><div class=\"table-wrap\"><table class=\"bem-estar-table\"><thead><tr><th>Atleta</th><th>Articular</th><th>Muscular</th></tr></thead><tbody>" + atletasDorRows + "</tbody></table></div></div>";

            window._bemEstarPreSetDate = function (d) {
                selectedDate = d;
                renderBemEstarPre();
            };

            destroyAcompanhamentoCharts();
            if (last15.length && window.Chart) {
                var ctx = document.getElementById("chartBemEstarLinhas");
                if (ctx) {
                    var avg = be.teamAveragesByDate;
                    var labels = avg.map(function (x) { return x.date; });
                    ACOMPANHAMENTO_CHARTS.push(new Chart(ctx.getContext("2d"), {
                        type: "line",
                        data: {
                            labels: labels,
                            datasets: [
                                { label: "Recup.", yAxisID: "y", data: avg.map(function (x) { return x.recuperacao; }), borderColor: "#feec02", backgroundColor: "rgba(254,236,2,0.1)", fill: true, tension: 0.3 },
                                { label: "Fadiga", yAxisID: "y1", data: avg.map(function (x) { return x.fadiga; }), borderColor: "#ff7850", tension: 0.3 },
                                { label: "Sono", yAxisID: "y1", data: avg.map(function (x) { return x.sono; }), borderColor: "#6eb5ff", tension: 0.3 },
                                { label: "Dor", yAxisID: "y1", data: avg.map(function (x) { return x.dor; }), borderColor: "#e05050", tension: 0.3 },
                                { label: "Estresse", yAxisID: "y1", data: avg.map(function (x) { return x.estresse; }), borderColor: "#c080ff", tension: 0.3 },
                                { label: "Humor", yAxisID: "y1", data: avg.map(function (x) { return x.humor; }), borderColor: "#50c050", tension: 0.3 }
                            ]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: { mode: "index", intersect: false },
                            plugins: { legend: { labels: { color: "#e0e0e0" } } },
                            scales: {
                                x: { ticks: { color: "#e0e0e0", maxRotation: 45 } },
                                y: { type: "linear", display: true, position: "left", min: 0, max: 20, title: { display: true, text: "QTR (1-20)", color: "#feec02" }, ticks: { color: "#e0e0e0" } },
                                y1: { type: "linear", display: true, position: "right", min: 0, max: 5, title: { display: true, text: "1-5", color: "#aaa" }, ticks: { color: "#e0e0e0" }, grid: { drawOnChartArea: false } }
                            }
                        }
                    }));
                }
            }
        }

        renderBemEstarPre();
    });
}

/** TRIMP (Foster sRPE) = duração (min) × RPE (0–10). Semáforo: verde < limite inf, amarelo entre limites, vermelho > limite sup. Limites = média ± 0,5 × dp. */
function buildTrimpSemaforo(data) {
    var posH = (data.pos && data.pos.headers) ? data.pos.headers : [];
    var posRows = (data.pos && data.pos.rows) ? data.pos.rows : [];
    var agg = buildAggregates(data);
    var byPlayer = agg.byPlayer;

    var allTrimps = [];
    var trimpByPlayer = {};

    posRows.forEach(function (row) {
        var r = parsePosRow(posH, row);
        var tempo = r.answers.tempoMin != null ? r.answers.tempoMin : null;
        var estado = r.answers.estado != null ? r.answers.estado : null;
        if (tempo != null && estado != null && tempo >= 0 && estado >= 0) {
            var trimp = Math.round(tempo * estado);
            allTrimps.push(trimp);
            var pid = r.playerId;
            if (!trimpByPlayer[pid]) trimpByPlayer[pid] = [];
            trimpByPlayer[pid].push(trimp);
        }
    });

    var mean = 0, std = 0;
    if (allTrimps.length > 0) {
        mean = allTrimps.reduce(function (a, b) { return a + b; }, 0) / allTrimps.length;
        var variance = allTrimps.reduce(function (sum, x) { return sum + (x - mean) * (x - mean); }, 0) / allTrimps.length;
        std = Math.sqrt(variance) || 0;
    }

    // Foster sRPE: limite inferior = média − (0,5 × dp), limite superior = média + (0,5 × dp)
    var low = mean - 0.5 * std;
    var high = mean + 0.5 * std;
    var list = [];
    Object.keys(byPlayer).forEach(function (pid) {
        var p = byPlayer[pid];
        var arr = trimpByPlayer[pid];
        if (!arr || arr.length === 0) return;
        var avgTrimp = arr.reduce(function (a, b) { return a + b; }, 0) / arr.length;
        var status = "yellow";
        if (std > 0) {
            if (avgTrimp < low) status = "green";
            else if (avgTrimp > high) status = "red";
        }
        list.push({
            playerId: pid,
            name: p.name || pid,
            avgTrimp: Math.round(avgTrimp * 10) / 10,
            count: arr.length,
            status: status
        });
    });
    list.sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
    return { list: list, mean: Math.round(mean * 10) / 10, std: Math.round(std * 10) / 10, low: Math.round(low * 10) / 10, high: Math.round(high * 10) / 10, totalResponses: allTrimps.length };
}

function goInformacaoTatica() {
    state.currentScreen = "informacaoTatica";
    setHeaderModeLabel("Informação Tática");
    renderScreen(`
        <div class="settings-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="goAcompanhamento()"><i data-feather="arrow-left"></i><span>Voltar</span></button>
                <div>
                    <div class="screen-title">Informação Tática</div>
                    <div class="screen-sub">TRIMP ou Prontidão</div>
                </div>
            </div>
            <div class="acompanhamento-options" style="padding:1rem 0;">
                <button class="home-btn home-btn-primary" onclick="goTrimpMenu()" style="max-width:320px;">
                    <i data-feather="activity"></i>
                    <div>TRIMP</div>
                    <div class="sub">Geral ou últimos 3 treinos</div>
                </button>
                <button class="home-btn home-btn-secondary" onclick="goProntidao()" style="max-width:320px;">
                    <i data-feather="zap"></i>
                    <div>Prontidão</div>
                    <div class="sub">Sono, fadiga, dor e TRIMP</div>
                </button>
            </div>
        </div>
    `);
    feather.replace();
}

function goTrimpMenu() {
    state.currentScreen = "trimpMenu";
    setHeaderModeLabel("TRIMP");
    renderScreen(`
        <div class="settings-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="goInformacaoTatica()"><i data-feather="arrow-left"></i><span>Voltar</span></button>
                <div>
                    <div class="screen-title">TRIMP</div>
                    <div class="screen-sub">Foster sRPE = duração (min) × RPE (0–10)</div>
                </div>
            </div>
            <div class="acompanhamento-options" style="padding:1rem 0;">
                <button class="home-btn home-btn-primary" onclick="goTrimpGeral()" style="max-width:320px;">
                    <i data-feather="bar-chart-2"></i>
                    <div>TRIMP Geral</div>
                    <div class="sub">Média de todos os treinos</div>
                </button>
                <button class="home-btn home-btn-secondary" onclick="goTrimpRecente()" style="max-width:320px;">
                    <i data-feather="clock"></i>
                    <div>TRIMP Recente</div>
                    <div class="sub">Média dos últimos 3 treinos</div>
                </button>
            </div>
        </div>
    `);
    feather.replace();
}

function renderTrimpScreen(sem, subtitle, emptyMsg, contentId) {
    var content = document.getElementById(contentId);
    var sub = document.querySelector(".screen-sub");
    if (!content) return;
    if (sub) sub.textContent = subtitle;
    if (!sem || sem.list.length === 0) {
        content.innerHTML = "<div class=\"item-sub\" style=\"padding:2rem;text-align:center;\">" + (emptyMsg || "Sem dados para exibir.") + "</div>";
        return;
    }
    var legendHtml = "<div class=\"trimp-legend\">" +
        "<span class=\"trimp-legend-item\"><span class=\"semaforo-dot semaforo-green\"></span> Verde: &lt; limite inferior (baixa carga)</span>" +
        "<span class=\"trimp-legend-item\"><span class=\"semaforo-dot semaforo-yellow\"></span> Amarelo: carga normal</span>" +
        "<span class=\"trimp-legend-item\"><span class=\"semaforo-dot semaforo-red\"></span> Vermelho: &gt; limite superior (carga alta)</span>" +
        "</div>";
    var kpiHtml = "<div class=\"kpi-grid\" style=\"margin-bottom:1.5rem;\">" +
        "<div class=\"kpi-card\"><div class=\"kpi-value\">" + sem.mean + "</div><div class=\"kpi-label\">TRIMP médio</div></div>" +
        "<div class=\"kpi-card\"><div class=\"kpi-value\">" + sem.std + "</div><div class=\"kpi-label\">Desvio padrão</div></div>" +
        "<div class=\"kpi-card\"><div class=\"kpi-value\">" + sem.low + "</div><div class=\"kpi-label\">Limite inferior</div></div>" +
        "<div class=\"kpi-card\"><div class=\"kpi-value\">" + sem.high + "</div><div class=\"kpi-label\">Limite superior</div></div>" +
        "</div>";
    var listHtml = "<div class=\"trimp-table-wrap\"><table class=\"trimp-table\">" +
        "<thead><tr><th>Atleta</th><th>TRIMP</th><th>Classificação</th></tr></thead>" +
        "<tbody>" + sem.list.map(function (item) {
            var label = item.status === "green" ? "Verde" : item.status === "red" ? "Vermelho" : "Amarelo";
            return "<tr class=\"trimp-status-" + item.status + "\">" +
                "<td><span class=\"trimp-player-name\">" + (item.name || item.playerId) + "</span></td>" +
                "<td><span class=\"trimp-value\">" + item.avgTrimp + "</span></td>" +
                "<td><span class=\"semaforo-dot semaforo-" + item.status + "\"></span> " + label + "</td>" +
                "</tr>";
        }).join("") + "</tbody></table></div>";
    content.innerHTML = legendHtml + kpiHtml + listHtml;
}

function goTrimpGeral() {
    state.currentScreen = "trimpGeral";
    setHeaderModeLabel("TRIMP Geral");
    renderScreen(`
        <div class="settings-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="goTrimpMenu()"><i data-feather="arrow-left"></i><span>Voltar</span></button>
                <div>
                    <div class="screen-title">TRIMP Geral</div>
                    <div class="screen-sub">Carregando...</div>
                </div>
            </div>
            <div id="informacao-tatica-content" class="acompanhamento-scroll"></div>
        </div>
    `);
    feather.replace();
    fetchAnalyticsData().then(function (res) {
        if (!res.success) {
            var c = document.getElementById("informacao-tatica-content");
            if (c) c.innerHTML = "<div class=\"item-sub\" style=\"padding:2rem;\">Erro: " + (res.error || "desconhecido") + "</div>";
            return;
        }
        var sem = buildTrimpSemaforo(res);
        renderTrimpScreen(sem, "Média de todos os treinos. Limites: média ± 0,5 × dp.", "Ainda não há dados de pós-treino com tempo e RPE para calcular o TRIMP.", "informacao-tatica-content");
    });
}

/** Ordena por data (string DD/MM/YYYY ou YYYY-MM-DD); se falhar, mantém ordem. Retorna cópia ordenada (mais recente por último). */
function sortRowsByDate(rows, getDate) {
    function parseDate(d) {
        if (!d) return 0;
        var s = String(d).trim();
        var m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (m) return new Date(parseInt(m[3],10), parseInt(m[2],10)-1, parseInt(m[1],10)).getTime();
        m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (m) return new Date(parseInt(m[1],10), parseInt(m[2],10)-1, parseInt(m[3],10)).getTime();
        return 0;
    }
    var copy = rows.slice();
    copy.sort(function (a, b) { return parseDate(getDate(a)) - parseDate(getDate(b)); });
    return copy;
}

/** TRIMP Recente: média dos últimos 3 treinos por atleta. Mesmo semáforo (média ± 0,5×dp). */
function buildTrimpRecenteSemaforo(data) {
    var posH = (data.pos && data.pos.headers) ? data.pos.headers : [];
    var posRows = (data.pos && data.pos.rows) ? data.pos.rows : [];
    var agg = buildAggregates(data);
    var byPlayer = agg.byPlayer;

    var posByPlayer = {};
    posRows.forEach(function (row) {
        var r = parsePosRow(posH, row);
        var tempo = r.answers.tempoMin != null ? r.answers.tempoMin : null;
        var estado = r.answers.estado != null ? r.answers.estado : null;
        if (tempo != null && estado != null && tempo >= 0 && estado >= 0) {
            var pid = r.playerId;
            if (!posByPlayer[pid]) posByPlayer[pid] = [];
            posByPlayer[pid].push({ date: r.date, trimp: tempo * estado });
        }
    });

    var list = [];
    Object.keys(byPlayer).forEach(function (pid) {
        var p = byPlayer[pid];
        var arr = posByPlayer[pid];
        if (!arr || arr.length === 0) return;
        var sorted = sortRowsByDate(arr, function (x) { return x.date; });
        var last3 = sorted.slice(-3);
        var avgTrimp = last3.reduce(function (a, b) { return a + b.trimp; }, 0) / last3.length;
        list.push({ playerId: pid, name: p.name || pid, avgTrimp: Math.round(avgTrimp * 10) / 10, count: last3.length });
    });
    if (list.length === 0) return { list: [], mean: 0, std: 0, low: 0, high: 0 };

    var avgTrimpList = list.map(function (x) { return x.avgTrimp; });
    var mean = avgTrimpList.reduce(function (a, b) { return a + b; }, 0) / avgTrimpList.length;
    var variance = avgTrimpList.reduce(function (sum, x) { return sum + (x - mean) * (x - mean); }, 0) / avgTrimpList.length;
    var std = Math.sqrt(variance) || 0;
    var low = mean - 0.5 * std;
    var high = mean + 0.5 * std;

    list.forEach(function (item) {
        item.status = std > 0 ? (item.avgTrimp < low ? "green" : item.avgTrimp > high ? "red" : "yellow") : "yellow";
    });
    list.sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
    return { list: list, mean: Math.round(mean * 10) / 10, std: Math.round(std * 10) / 10, low: Math.round(low * 10) / 10, high: Math.round(high * 10) / 10 };
}

function goTrimpRecente() {
    state.currentScreen = "trimpRecente";
    setHeaderModeLabel("TRIMP Recente");
    renderScreen(`
        <div class="settings-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="goTrimpMenu()"><i data-feather="arrow-left"></i><span>Voltar</span></button>
                <div>
                    <div class="screen-title">TRIMP Recente</div>
                    <div class="screen-sub">Carregando...</div>
                </div>
            </div>
            <div id="informacao-tatica-content" class="acompanhamento-scroll"></div>
        </div>
    `);
    feather.replace();
    fetchAnalyticsData().then(function (res) {
        if (!res.success) {
            var c = document.getElementById("informacao-tatica-content");
            if (c) c.innerHTML = "<div class=\"item-sub\" style=\"padding:2rem;\">Erro: " + (res.error || "desconhecido") + "</div>";
            return;
        }
        var sem = buildTrimpRecenteSemaforo(res);
        renderTrimpScreen(sem, "Média dos últimos 3 treinos. Limites: média ± 0,5 × dp.", "Sem dados dos últimos 3 treinos com tempo e RPE.", "informacao-tatica-content");
    });
}

/** Prontidão = (sono×0,2) + (fadiga×0,3) + (dor×0,2) + (TRIMP_norm×0,3). Sono, fadiga, dor = último pré; TRIMP = média últimos 3. TRIMP_norm = TRIMP normalizado 0–10. */
function buildProntidaoSemaforo(data) {
    var preH = (data.pre && data.pre.headers) ? data.pre.headers : [];
    var preRows = (data.pre && data.pre.rows) ? data.pre.rows : [];
    var posH = (data.pos && data.pos.headers) ? data.pos.headers : [];
    var posRows = (data.pos && data.pos.rows) ? data.pos.rows : [];
    var agg = buildAggregates(data);
    var byPlayer = agg.byPlayer;

    var preByPlayer = {};
    preRows.forEach(function (row) {
        var r = parsePreRow(preH, row);
        var pid = r.playerId;
        if (!preByPlayer[pid]) preByPlayer[pid] = [];
        preByPlayer[pid].push(r);
    });
    var posByPlayer = {};
    posRows.forEach(function (row) {
        var r = parsePosRow(posH, row);
        var tempo = r.answers.tempoMin != null ? r.answers.tempoMin : null;
        var estado = r.answers.estado != null ? r.answers.estado : null;
        if (tempo != null && estado != null) {
            var pid = r.playerId;
            if (!posByPlayer[pid]) posByPlayer[pid] = [];
            posByPlayer[pid].push({ date: r.date, trimp: tempo * estado });
        }
    });

    var trimpRecentes = [];
    var list = [];
    Object.keys(byPlayer).forEach(function (pid) {
        var p = byPlayer[pid];
        var lastPre = null;
        var preArr = preByPlayer[pid];
        if (preArr && preArr.length > 0) {
            var sortedPre = sortRowsByDate(preArr, function (x) { return x.date; });
            lastPre = sortedPre[sortedPre.length - 1];
        }
        var sono = lastPre && lastPre.answers.sono != null ? lastPre.answers.sono : null;
        var fadiga = lastPre && lastPre.answers.fadiga != null ? lastPre.answers.fadiga : null;
        var dor = lastPre && lastPre.answers.dor != null ? lastPre.answers.dor : null;
        var posArr = posByPlayer[pid];
        var trimpMed = null;
        if (posArr && posArr.length > 0) {
            var sortedPos = sortRowsByDate(posArr, function (x) { return x.date; });
            var last3 = sortedPos.slice(-3);
            trimpMed = last3.reduce(function (a, b) { return a + b.trimp; }, 0) / last3.length;
            trimpRecentes.push(trimpMed);
        }
        if (sono == null && fadiga == null && dor == null && trimpMed == null) return;
        list.push({
            playerId: pid,
            name: p.name || pid,
            sono: sono,
            fadiga: fadiga,
            dor: dor,
            trimpMed: trimpMed
        });
    });

    var validTrimp = trimpRecentes.filter(function (x) { return x != null; });
    var minT = validTrimp.length ? Math.min.apply(null, validTrimp) : 0;
    var maxT = validTrimp.length ? Math.max.apply(null, validTrimp) : 100;
    var rangeT = maxT - minT || 1;
    list.forEach(function (item) {
        var trimpNorm = item.trimpMed != null && validTrimp.length ? 10 * (item.trimpMed - minT) / rangeT : 5;
        var s = (item.sono != null ? item.sono : 0) * 0.2;
        var f = (item.fadiga != null ? item.fadiga : 0) * 0.3;
        var d = (item.dor != null ? item.dor : 0) * 0.2;
        var t = trimpNorm * 0.3;
        item.prontidao = Math.round((s + f + d + t) * 100) / 100;
        var total = s + f + d + t || 1;
        item.pctSono = total ? Math.round((s / total) * 100) : 0;
        item.pctFadiga = total ? Math.round((f / total) * 100) : 0;
        item.pctDor = total ? Math.round((d / total) * 100) : 0;
        item.pctTrimp = total ? Math.round((t / total) * 100) : 0;
    });
    var valores = list.map(function (x) { return x.prontidao; });
    var mean = valores.reduce(function (a, b) { return a + b; }, 0) / valores.length;
    var variance = valores.reduce(function (sum, x) { return sum + (x - mean) * (x - mean); }, 0) / valores.length;
    var std = Math.sqrt(variance) || 0;
    var low = mean - 0.5 * std;
    var high = mean + 0.5 * std;
    list.forEach(function (item) {
        item.status = std > 0 ? (item.prontidao < low ? "green" : item.prontidao > high ? "red" : "yellow") : "yellow";
    });
    list.sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
    return {
        list: list,
        mean: Math.round(mean * 100) / 100,
        std: Math.round(std * 100) / 100,
        low: Math.round(low * 100) / 100,
        high: Math.round(high * 100) / 100
    };
}

function goProntidao() {
    state.currentScreen = "prontidao";
    setHeaderModeLabel("Prontidão");
    renderScreen(`
        <div class="settings-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="goInformacaoTatica()"><i data-feather="arrow-left"></i><span>Voltar</span></button>
                <div>
                    <div class="screen-title">Prontidão</div>
                    <div class="screen-sub">Carregando...</div>
                </div>
            </div>
            <div id="informacao-tatica-content" class="acompanhamento-scroll"></div>
        </div>
    `);
    feather.replace();
    fetchAnalyticsData().then(function (res) {
        var content = document.getElementById("informacao-tatica-content");
        var sub = document.querySelector(".screen-sub");
        if (!res.success || !content) {
            if (content) content.innerHTML = "<div class=\"item-sub\" style=\"padding:2rem;\">Erro: " + (res.error || "desconhecido") + "</div>";
            if (sub) sub.textContent = "";
            return;
        }
        var sem = buildProntidaoSemaforo(res);
        if (sub) sub.textContent = "Prontidão = (sono×0,2)+(fadiga×0,3)+(dor×0,2)+(TRIMP_norm×0,3). Último pré + média últimos 3 TRIMPs. Limites: média ± 0,5×dp.";
        if (!sem || sem.list.length === 0) {
            content.innerHTML = "<div class=\"item-sub\" style=\"padding:2rem;text-align:center;\">Sem dados suficientes (pré: sono/fadiga/dor; pós: tempo e RPE para TRIMP).</div>";
            return;
        }
        var legendHtml = "<div class=\"trimp-legend\">" +
            "<span class=\"trimp-legend-item\"><span class=\"semaforo-dot semaforo-green\"></span> Verde: &lt; limite inferior</span>" +
            "<span class=\"trimp-legend-item\"><span class=\"semaforo-dot semaforo-yellow\"></span> Amarelo: normal</span>" +
            "<span class=\"trimp-legend-item\"><span class=\"semaforo-dot semaforo-red\"></span> Vermelho: &gt; limite superior</span>" +
            "</div>";
        var kpiHtml = "<div class=\"kpi-grid\" style=\"margin-bottom:1.5rem;\">" +
            "<div class=\"kpi-card\"><div class=\"kpi-value\">" + sem.mean + "</div><div class=\"kpi-label\">Prontidão média</div></div>" +
            "<div class=\"kpi-card\"><div class=\"kpi-value\">" + sem.std + "</div><div class=\"kpi-label\">Desvio padrão</div></div>" +
            "<div class=\"kpi-card\"><div class=\"kpi-value\">" + sem.low + "</div><div class=\"kpi-label\">Limite inferior</div></div>" +
            "<div class=\"kpi-card\"><div class=\"kpi-value\">" + sem.high + "</div><div class=\"kpi-label\">Limite superior</div></div>" +
            "</div>";
        var listHtml = "<div class=\"trimp-table-wrap\"><table class=\"trimp-table\">" +
            "<thead><tr><th>Atleta</th><th>Prontidão</th><th>Classificação</th></tr></thead>" +
            "<tbody>" + sem.list.map(function (item) {
                var label = item.status === "green" ? "Verde" : item.status === "red" ? "Vermelho" : "Amarelo";
                var contrib = "<div class=\"prontidao-contrib\">sono " + (item.pctSono || 0) + "% · fadiga " + (item.pctFadiga || 0) + "% · dor " + (item.pctDor || 0) + "% · TRIMP " + (item.pctTrimp || 0) + "%</div>";
                return "<tr class=\"trimp-status-" + item.status + "\">" +
                    "<td><span class=\"trimp-player-name\">" + (item.name || item.playerId) + "</span>" + contrib + "</td>" +
                    "<td><span class=\"trimp-value\">" + item.prontidao + "</span></td>" +
                    "<td><span class=\"semaforo-dot semaforo-" + item.status + "\"></span> " + label + "</td>" +
                    "</tr>";
            }).join("") + "</tbody></table></div>";
        content.innerHTML = legendHtml + kpiHtml + listHtml;
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
