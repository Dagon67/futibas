/* ===========================
   📊 ACOMPANHAMENTO - Dashboard Geral e Individual
   Com Google Sheets: GET /analytics (backend lê a planilha).
   Sem Sheets (Firestore / app local): mesmo formato, montado a partir de treinos e respostas no dispositivo.
   =========================== */

var ACOMPANHAMENTO_CHARTS = [];

/** Rótulo curto do time para botões (não confundir tenants). */
function getAcompanhamentoTeamLabel() {
    try {
        var tid = window.__TUTEM_TENANT__ && window.__TUTEM_TENANT__.tenantId;
        if (tid === "brazil") return "Seleção Brasileira";
        if (tid === "jaragua-futsal") return "Jaraguá Futsal";
        if (tid === "magnus") return "Magnus Futsal";
        return tid ? String(tid) : "Time";
    } catch (e) {
        return "Time";
    }
}

/**
 * Replica o formato da aba pre/pos do Sheets a partir dos treinos em memória
 * (compatível com buildAggregates / parsePreRow / parsePosRow).
 */
function buildAnalyticsDataFromLocalApp() {
    var qs = typeof loadQuestions === "function" ? loadQuestions() : { pre: [], post: [] };
    var pre_questions = (qs.pre || []).map(function (q) {
        return (q && q.texto) ? String(q.texto) : "";
    }).filter(Boolean);
    var post_questions = (qs.post || []).map(function (q) {
        return (q && q.texto) ? String(q.texto) : "";
    }).filter(Boolean);

    var header_pre = ["ID Treino", "Data Treino", "Modo", "ID Jogador", "Nome Jogador", "Data/Hora", "Comentário"].concat(pre_questions);
    var header_post = ["ID Treino", "Data Treino", "Modo", "ID Jogador", "Nome Jogador", "Data/Hora", "Comentário"].concat(post_questions);

    var pre_rows = [];
    var pos_rows = [];
    var trainings = typeof loadTrainings === "function" ? loadTrainings() : [];

    trainings.forEach(function (t) {
        var trainingId = t.id != null ? String(t.id) : "";
        var trainingDate = t.dateFormatted || t.date || "";
        (t.responses || []).forEach(function (r) {
            if (!r || !r.mode) return;
            var mode = r.mode;
            var row = [
                trainingId,
                trainingDate,
                mode === "pre" ? "Pré" : "Pós",
                r.playerId != null ? String(r.playerId) : "",
                r.playerName != null ? String(r.playerName) : "",
                r.timestamp != null ? String(r.timestamp) : "",
                r.comment != null ? String(r.comment) : ""
            ];
            var qlist = mode === "pre" ? pre_questions : post_questions;
            qlist.forEach(function (qText) {
                var v = r.answers && r.answers[qText] != null ? r.answers[qText] : "";
                if (Array.isArray(v)) {
                    v = v.join("; ");
                }
                row.push(v != null ? String(v) : "");
            });
            if (mode === "pre") {
                pre_rows.push(row);
            } else if (mode === "post") {
                pos_rows.push(row);
            }
        });
    });

    var players = typeof loadPlayers === "function" ? loadPlayers() : [];
    return {
        success: true,
        players: Array.isArray(players) ? players : [],
        pre: { headers: header_pre, rows: pre_rows },
        pos: { headers: header_post, rows: pos_rows }
    };
}

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
                    <div>${getAcompanhamentoTeamLabel()}</div>
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
                <button class="home-btn home-btn-secondary" onclick="goAreasDeDor()" style="max-width:320px;">
                    <i data-feather="map-pin"></i>
                    <div>Áreas de dor</div>
                    <div class="sub">Mapa corporal por atleta</div>
                </button>
                <button class="home-btn home-btn-secondary" onclick="goInformacaoTatica()" style="max-width:320px;">
                    <i data-feather="activity"></i>
                    <div>Informação Tática</div>
                    <div class="sub">Semáforo TRIMP (carga pós-treino)</div>
                </button>
                <button class="home-btn home-btn-secondary" type="button" onclick="abrirInsightsComSenha()" style="max-width:320px;">
                    <i data-feather="zap"></i>
                    <div>Insights</div>
                    <div class="sub">Análise e tendências</div>
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
    try {
        if (typeof window !== "undefined" && window.__TUTEM_SHEETS_MODE__ === "none") {
            return Promise.resolve(buildAnalyticsDataFromLocalApp());
        }
    } catch (e) {
        return Promise.resolve({ success: false, error: String(e && e.message ? e.message : e) });
    }
    var base = getBackendUrl();
    if (!base) return Promise.resolve({ success: false, error: "Backend não configurado" });
    return fetch(base + "/analytics", { method: "GET" })
        .then(function (r) { return r.json(); })
        .catch(function (e) { return { success: false, error: String(e.message || e) }; });
}

if (typeof window !== "undefined") {
    window.fetchAnalyticsData = fetchAnalyticsData;
    window.buildAnalyticsDataFromLocalApp = buildAnalyticsDataFromLocalApp;
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

function parseDateToLocalDate(str) {
    if (!str) return null;
    var s = String(str).trim();
    if (!s) return null;
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    var d = new Date(s);
    if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return null;
}

function dateKeyFromDate(d) {
    if (!d || isNaN(d.getTime())) return "";
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
}

function dateLabelPtBrFromKey(k) {
    var m = String(k || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return k || "";
    return m[3] + "/" + m[2] + "/" + m[1];
}

/** Ordenação cronológica para strings de data (DD/MM/AAAA ou YYYY-MM-DD). Não usar .sort() direto: em DD/MM/AAAA a ordem lexicográfica não é a temporal (ex.: 01/04/2026 < 31/03/2026). */
function sortDateStringsChronologically(dateStrings) {
    function ts(s) {
        var d = parseDateToLocalDate(s);
        return d && !isNaN(d.getTime()) ? d.getTime() : 0;
    }
    var arr = (dateStrings || []).slice();
    arr.sort(function (a, b) { return ts(a) - ts(b); });
    return arr;
}

function stdDev(values) {
    var arr = (values || []).filter(function (x) { return x != null && isFinite(x); });
    if (!arr.length) return 0;
    var mean = arr.reduce(function (a, b) { return a + b; }, 0) / arr.length;
    var variance = arr.reduce(function (sum, x) { return sum + Math.pow(x - mean, 2); }, 0) / arr.length;
    return Math.sqrt(variance) || 0;
}

function buildTeamLoadMetrics(data) {
    var posH = (data.pos && data.pos.headers) ? data.pos.headers : [];
    var posRows = (data.pos && data.pos.rows) ? data.pos.rows : [];
    var preH = (data.pre && data.pre.headers) ? data.pre.headers : [];
    var preRows = (data.pre && data.pre.rows) ? data.pre.rows : [];

    var byDate = {};
    var maxDateObj = null;
    var sumRpe = 0, countRpe = 0;
    posRows.forEach(function (row) {
        var r = parsePosRow(posH, row);
        var rpe = r.answers.estado;
        var min = r.answers.tempoMin;
        var dObj = parseDateToLocalDate(r.date);
        if (!dObj) return;
        var dKey = dateKeyFromDate(dObj);
        if (!dKey) return;
        if (!byDate[dKey]) byDate[dKey] = { load: 0, rpeVals: [] };
        if (rpe != null && min != null && rpe >= 0 && min >= 0) {
            var load = rpe * min;
            byDate[dKey].load += load;
            byDate[dKey].rpeVals.push(rpe);
        }
        if (rpe != null && rpe >= 0) {
            sumRpe += rpe;
            countRpe++;
        }
        if (!maxDateObj || dObj > maxDateObj) maxDateObj = dObj;
    });

    var sumWellness = { fadiga: 0, sono: 0, dor: 0, estresse: 0, humor: 0 };
    var cntWellness = { fadiga: 0, sono: 0, dor: 0, estresse: 0, humor: 0 };
    preRows.forEach(function (row) {
        var pr = parsePreRow(preH, row);
        var a = pr.answers || {};
        ["fadiga", "sono", "dor", "estresse", "humor"].forEach(function (k) {
            if (a[k] != null && isFinite(a[k])) {
                sumWellness[k] += a[k];
                cntWellness[k]++;
            }
        });
    });
    var wellnessAvg = {};
    ["fadiga", "sono", "dor", "estresse", "humor"].forEach(function (k) {
        wellnessAvg[k] = cntWellness[k] ? Math.round((sumWellness[k] / cntWellness[k]) * 100) / 100 : null;
    });
    var readiness = null;
    if (wellnessAvg.fadiga != null || wellnessAvg.sono != null || wellnessAvg.dor != null || wellnessAvg.estresse != null || wellnessAvg.humor != null) {
        var bads = [];
        if (wellnessAvg.fadiga != null) bads.push(wellnessAvg.fadiga);
        if (wellnessAvg.dor != null) bads.push(wellnessAvg.dor);
        if (wellnessAvg.estresse != null) bads.push(wellnessAvg.estresse);
        var badAvg = bads.length ? (bads.reduce(function (a, b) { return a + b; }, 0) / bads.length) : 3;
        var sleep = wellnessAvg.sono != null ? wellnessAvg.sono : 3;
        var humor = wellnessAvg.humor != null ? wellnessAvg.humor : 3;
        // 0-10: menor é melhor prontidão para escala 1-5 de wellness.
        readiness = (sleep * 0.3 + humor * 0.2 + (6 - badAvg) * 0.5) * 2;
        readiness = Math.round(readiness * 100) / 100;
    }

    if (!maxDateObj) {
        return {
            avgRpe: null, acute: null, chronic: null, acwr: null, monotony: null, strain: null,
            trendPct: null, loadsLast14: [], labelsLast14: [], wellnessAvg: wellnessAvg, readiness: readiness
        };
    }

    var dailyLast28 = [];
    for (var i = 27; i >= 0; i--) {
        var d = new Date(maxDateObj.getFullYear(), maxDateObj.getMonth(), maxDateObj.getDate() - i);
        var key = dateKeyFromDate(d);
        dailyLast28.push((byDate[key] && isFinite(byDate[key].load)) ? byDate[key].load : 0);
    }
    var acute = dailyLast28.slice(21).reduce(function (a, b) { return a + b; }, 0);
    var chronic = dailyLast28.reduce(function (a, b) { return a + b; }, 0) / 4;
    var acwr = chronic > 0 ? acute / chronic : null;

    var weekLoads = dailyLast28.slice(21);
    var meanWeek = weekLoads.length ? (weekLoads.reduce(function (a, b) { return a + b; }, 0) / weekLoads.length) : 0;
    var sdWeek = stdDev(weekLoads);
    var monotony = sdWeek > 0 ? meanWeek / sdWeek : null;
    var strain = (monotony != null) ? acute * monotony : null;

    var prevWeek = dailyLast28.slice(14, 21).reduce(function (a, b) { return a + b; }, 0);
    var trendPct = prevWeek > 0 ? ((acute - prevWeek) / prevWeek) * 100 : null;

    var labelsLast14 = [];
    var loadsLast14 = [];
    for (var j = 13; j >= 0; j--) {
        var d2 = new Date(maxDateObj.getFullYear(), maxDateObj.getMonth(), maxDateObj.getDate() - j);
        var k2 = dateKeyFromDate(d2);
        labelsLast14.push(dateLabelPtBrFromKey(k2));
        loadsLast14.push((byDate[k2] && isFinite(byDate[k2].load)) ? byDate[k2].load : 0);
    }

    return {
        avgRpe: countRpe ? Math.round((sumRpe / countRpe) * 100) / 100 : null,
        acute: Math.round(acute),
        chronic: Math.round(chronic),
        acwr: acwr != null ? Math.round(acwr * 100) / 100 : null,
        monotony: monotony != null ? Math.round(monotony * 100) / 100 : null,
        strain: strain != null ? Math.round(strain) : null,
        trendPct: trendPct != null ? Math.round(trendPct * 10) / 10 : null,
        loadsLast14: loadsLast14,
        labelsLast14: labelsLast14,
        wellnessAvg: wellnessAvg,
        readiness: readiness
    };
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
            var pa = (r.answers.pontosArticular || "").trim();
            parseMuscularDorForCharts(r.answers.pontosDor).forEach(function (z) {
                if (z) { injuryByZone[z] = (injuryByZone[z] || 0) + 1; injuryByPlayer[pid]++; }
            });
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

function parseMuscularDorForCharts(str) {
    if (typeof parsePontosDorMuscularValue === "function") return parsePontosDorMuscularValue(str);
    if (!str || (str || "").trim() === "Sem dor") return [];
    return (str || "").split(/[;,]/).map(function (s) { return s.trim(); }).filter(Boolean);
}

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
    var dates = sortDateStringsChronologically(Object.keys(byDate));
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
        var load = buildTeamLoadMetrics(res);
        var sub = document.querySelector(".screen-sub");
        if (sub) sub.textContent = agg.totalPre + " respostas pré • " + agg.totalPos + " respostas pós";

        var kpiHtml = "<div class=\"kpi-grid\">";
        if (agg.avgRecuperacao != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + agg.avgRecuperacao + "</div><div class=\"kpi-label\">Recuperação média (1-20)</div></div>";
        if (agg.avgDor != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + agg.avgDor + "</div><div class=\"kpi-label\">Dor média (1-5)</div></div>";
        if (agg.avgTempoMin != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + agg.avgTempoMin + " min</div><div class=\"kpi-label\">Tempo médio de treino</div></div>";
        if (agg.avgEstado != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + agg.avgEstado + "</div><div class=\"kpi-label\">Estado pós-treino (0-10)</div></div>";
        if (load.acute != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + load.acute + "</div><div class=\"kpi-label\">Carga aguda (7d)</div></div>";
        if (load.chronic != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + load.chronic + "</div><div class=\"kpi-label\">Carga crônica (4 sem)</div></div>";
        if (load.acwr != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + load.acwr + "</div><div class=\"kpi-label\">ACWR</div></div>";
        if (load.monotony != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + load.monotony + "</div><div class=\"kpi-label\">Monotonia</div></div>";
        if (load.strain != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + load.strain + "</div><div class=\"kpi-label\">Strain semanal</div></div>";
        if (load.readiness != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + load.readiness + "</div><div class=\"kpi-label\">Prontidão (0-10)</div></div>";
        if (agg.totalPre != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + agg.totalPre + "</div><div class=\"kpi-label\">Total respostas pré</div></div>";
        if (agg.totalPos != null) kpiHtml += "<div class=\"kpi-card\"><div class=\"kpi-value\">" + agg.totalPos + "</div><div class=\"kpi-label\">Total respostas pós</div></div>";
        kpiHtml += "</div>";

        var acwrClass = "";
        var acwrHint = "Sem dados suficientes para ACWR.";
        if (load.acwr != null) {
            if (load.acwr > 1.5) { acwrClass = "semaforo-vermelho"; acwrHint = "ACWR alto (>1,5): risco elevado."; }
            else if (load.acwr < 0.8) { acwrClass = "semaforo-amarelo"; acwrHint = "ACWR baixo (<0,8): possível subcarga."; }
            else { acwrClass = "semaforo-verde"; acwrHint = "ACWR equilibrado (0,8 a 1,5)."; }
        }
        var trendText = load.trendPct == null ? "Sem tendência disponível" : ((load.trendPct >= 0 ? "+" : "") + load.trendPct + "% vs semana anterior");
        var wellnessText =
            "Fadiga: " + (load.wellnessAvg.fadiga != null ? load.wellnessAvg.fadiga : "—") +
            " · Sono: " + (load.wellnessAvg.sono != null ? load.wellnessAvg.sono : "—") +
            " · Dor: " + (load.wellnessAvg.dor != null ? load.wellnessAvg.dor : "—") +
            " · Estresse: " + (load.wellnessAvg.estresse != null ? load.wellnessAvg.estresse : "—") +
            " · Humor: " + (load.wellnessAvg.humor != null ? load.wellnessAvg.humor : "—");

        content.innerHTML = kpiHtml +
            "<div class=\"chart-section\"><h3 class=\"chart-title\">Métricas de Carga (Jaraguá do Sul)</h3>" +
            "<p class=\"item-sub\">PSE (RPE) central: " + (load.avgRpe != null ? load.avgRpe : "—") + " · Carga = PSE × duração.</p>" +
            "<p class=\"item-sub " + acwrClass + "\" style=\"padding:.35rem .55rem;border-radius:8px;display:inline-block;\">" + acwrHint + "</p>" +
            "<p class=\"item-sub\" style=\"margin-top:.35rem;\">Tendência: " + trendText + "</p>" +
            "<p class=\"item-sub\">Wellness médio (1-5): " + wellnessText + "</p>" +
            "</div>" +
            "<div class=\"chart-section\"><h3 class=\"chart-title\">Carga diária (últimos 14 dias)</h3><div class=\"chart-wrap\"><canvas id=\"chartCargaDiaria14\"></canvas></div></div>" +
            "<div class=\"chart-section\"><h3 class=\"chart-title\">Jogadores com mais relatos de dor/lesão</h3><div class=\"chart-wrap\"><canvas id=\"chartTopInjured\"></canvas></div></div>" +
            "<div class=\"chart-section\"><h3 class=\"chart-title\">Zonas de dor mais frequentes</h3><div class=\"chart-wrap\"><canvas id=\"chartZones\"></canvas></div></div>" +
            "<div class=\"chart-section\"><h3 class=\"chart-title\">Médias de bem-estar (pré-treino)</h3><div class=\"chart-wrap\"><canvas id=\"chartWellbeing\"></canvas></div></div>" +
            "<div class=\"chart-section\"><h3 class=\"chart-title\">Comparativo recuperação x dor</h3><div class=\"chart-wrap\"><canvas id=\"chartRecupDor\"></canvas></div></div>" +
            "<div class=\"chart-section\"><h3 class=\"chart-title\">Distribuição tempo de treino (pós)</h3><div class=\"chart-wrap\"><canvas id=\"chartTempo\"></canvas></div></div>";

        destroyAcompanhamentoCharts();

        if (window.Chart && load.loadsLast14 && load.loadsLast14.length > 0) {
            var ctx0 = document.getElementById("chartCargaDiaria14");
            if (ctx0) ACOMPANHAMENTO_CHARTS.push(new Chart(ctx0.getContext("2d"), {
                type: "line",
                data: {
                    labels: load.labelsLast14,
                    datasets: [{ label: "Carga diária (PSE × min)", data: load.loadsLast14, borderColor: "#feec02", backgroundColor: "rgba(254,236,2,0.18)", fill: true, tension: 0.25 }]
                },
                options: {
                    ...chartOptions(),
                    scales: { y: { beginAtZero: true, ticks: { color: "#e0e0e0" } }, x: { ticks: { color: "#e0e0e0", maxRotation: 45 } } }
                }
            }));
        }

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
                parseMuscularDorForCharts(r.answers.pontosDor).forEach(function (c) {
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
            var muscularList = Object.keys(muscularCount).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); }).map(function (key) {
                var count = muscularCount[key] || 0;
                if (!count) return "";
                var label = key.length === 1 ? (LABEL_MUSCULAR[key] || key) : key;
                var prefix = key.length === 1 ? key + " " : "";
                return "<span class=\"pain-badge\">" + prefix + label + ": " + count + "</span>";
            }).filter(Boolean).join(" ");

            var atletasComDor = rows.filter(function (r) {
                var art = parsePainCodes(r.answers.pontosArticular);
                var mus = parseMuscularDorForCharts(r.answers.pontosDor);
                return art.length > 0 || mus.length > 0;
            });
            var atletasDorRows = atletasComDor.length ? atletasComDor.map(function (r) {
                var art = parsePainCodes(r.answers.pontosArticular).map(function (c) { return (LABEL_ARTICULAR[c] || c) + " (" + c + ")"; }).join(", ");
                var mus = parseMuscularDorForCharts(r.answers.pontosDor).map(function (c) {
                    return c.length === 1 ? ((LABEL_MUSCULAR[c] || c) + " (" + c + ")") : c;
                }).join(", ");
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

// ===========================
// ÁREAS DE DOR (Jaraguá)
// ===========================

var PAIN_AREAS_SVG_CACHE_TEXT = null;
var PAIN_AREAS_ANALYTICS = null;

function getKnownBodyMapPartsSet() {
    try {
        if (typeof bodyMapPartNamesSet === "function") return bodyMapPartNamesSet();
    } catch (e) {}
    return {};
}

function dedupeArray(arr) {
    var seen = {};
    var out = [];
    for (var i = 0; i < arr.length; i++) {
        var x = arr[i];
        if (x == null) continue;
        x = String(x).trim();
        if (!x) continue;
        if (seen[x]) continue;
        seen[x] = true;
        out.push(x);
    }
    return out;
}

// Apenas pontos de dor com NOME (tags do corpo). Ignora qualquer coisa que vire "letras" na lógica antiga.
function parseNamedMuscularPainParts(str) {
    var known = getKnownBodyMapPartsSet();
    if (!known) known = {};
    if (!str) return [];
    var t = String(str).trim();
    if (!t || /^sem dor$/i.test(t) || /^nenhuma$/i.test(t)) return [];

    var parts = [];
    try {
        if (typeof parsePontosDorMuscularValue === "function") {
            parts = parsePontosDorMuscularValue(t);
        } else {
            parts = t.split(/[;,]/).map(function (s) { return s.trim(); }).filter(Boolean);
        }
    } catch (e) {
        parts = [];
    }

    // Garantia: só conta se o token bater com um nome real do mapa corporal.
    parts = parts.filter(function (p) { return known[p]; });
    return dedupeArray(parts);
}

function painPctToStyle(pct) {
    // pct: 0..1
    if (!isFinite(pct) || pct <= 0) return { fill: "rgba(34,197,94,0.35)", stroke: "#22c55e", strokeWidth: 1.2 };
    if (pct <= 0.33) return { fill: "rgba(250,204,21,0.35)", stroke: "#facc15", strokeWidth: 1.2 };
    if (pct <= 0.66) return { fill: "rgba(249,115,22,0.38)", stroke: "#f97316", strokeWidth: 1.2 };
    return { fill: "rgba(239,68,68,0.42)", stroke: "#ef4444", strokeWidth: 1.25 };
}

function buildPartsFrequencyByPart(trainings) {
    // trainings: [{parts:[...]}] onde parts já vem deduplicado
    var counts = {};
    var den = Array.isArray(trainings) ? trainings.length : 0;
    if (!den) return { den: 0, counts: counts };

    (trainings || []).forEach(function (t) {
        var parts = t && Array.isArray(t.parts) ? t.parts : [];
        parts.forEach(function (p) {
            counts[p] = (counts[p] || 0) + 1; // presença nessa "resposta"
        });
    });

    return { den: den, counts: counts };
}

async function loadPainBodySvgText() {
    if (PAIN_AREAS_SVG_CACHE_TEXT) return PAIN_AREAS_SVG_CACHE_TEXT;
    var url = "corpo/body-interactive.svg";
    var res = await fetch(url);
    if (!res.ok) throw new Error("Falha ao carregar SVG de corpo");
    PAIN_AREAS_SVG_CACHE_TEXT = await res.text();
    return PAIN_AREAS_SVG_CACHE_TEXT;
}

async function renderPainBodySvgInto(hostEl, frequencyByPart) {
    if (!hostEl) return;
    var svgText = await loadPainBodySvgText();
    hostEl.innerHTML = svgText;

    // Remover interação do mapa.
    var muscles = hostEl.querySelectorAll("g.muscle[data-part]");
    for (var i = 0; i < muscles.length; i++) {
        var g = muscles[i];
        var part = g.getAttribute("data-part") || "";
        var pct = 0;
        if (frequencyByPart && isFinite(frequencyByPart.den) && frequencyByPart.den > 0) {
            pct = (frequencyByPart.counts && isFinite(frequencyByPart.counts[part]) ? (frequencyByPart.counts[part] / frequencyByPart.den) : 0);
        }
        var st = painPctToStyle(pct);
        var paths = g.querySelectorAll("path");
        for (var p = 0; p < paths.length; p++) {
            paths[p].style.fill = st.fill;
            paths[p].style.stroke = st.stroke;
            paths[p].style.strokeWidth = String(st.strokeWidth);
        }
        g.style.pointerEvents = "none";
    }
}

function buildTopPartsBadges(partsCounts, limit) {
    limit = limit == null ? 3 : limit;
    var entries = Object.keys(partsCounts || {}).map(function (k) { return { part: k, count: partsCounts[k] || 0 }; });
    entries.sort(function (a, b) { return b.count - a.count; });
    entries = entries.slice(0, limit);
    if (!entries.length) return "dados insuficientes";
    return entries.map(function (e) { return "<span class=\"pain-badge\" style=\"margin-right:.35rem;\">" + e.part + ": " + e.count + "</span>"; }).join(" ");
}

function goAreasDeDorPlayer(playerId) {
    if (!PAIN_AREAS_ANALYTICS || !PAIN_AREAS_ANALYTICS.byPlayer) return;
    var player = PAIN_AREAS_ANALYTICS.byPlayer[playerId];
    if (!player) return;

    var detailEl = document.getElementById("pain-areas-detail");
    if (!detailEl) return;

    var trainingsAll = sortRowsByDate(player.trainings || [], function (x) { return x.date; });

    // Períodos
    var last1 = trainingsAll.length ? [trainingsAll[trainingsAll.length - 1]] : [];
    var last3 = trainingsAll.length ? trainingsAll.slice(Math.max(0, trainingsAll.length - 3)) : [];
    var geral = trainingsAll;

    function renderPeriod(title, trainings, sectionId) {
        var namedTrainingsCount = (trainings || []).filter(function (t) { return t && t.parts && t.parts.length > 0; }).length;
        var areaMsg = namedTrainingsCount ? "" : "<div class=\"item-sub\" style=\"padding:1.25rem;text-align:center;color:var(--text-dim);\">sem dados suficientes</div>";
        var den = trainings.length || 0;

        // Container para o SVG (carregamento assíncrono)
        var html = areaMsg;
        if (namedTrainingsCount) {
            html =
                "<div style=\"display:flex;flex-direction:column;gap:.75rem;\">" +
                "  <div class=\"item-title\" style=\"margin:0;\">" + title + "</div>" +
                "  <div class=\"item-sub\">Base: " + den + " resposta(s)</div>" +
                "  <div id=\"" + sectionId + "\" style=\"background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.08);border-radius:var(--radius-md);padding:.75rem;\"></div>" +
                "  <div class=\"item-sub\" style=\"color:var(--text-dim);font-size:.9rem;\" id=\"" + sectionId + "_legend\"></div>" +
                "</div>";
        }
        return html;
    }

    detailEl.innerHTML =
        "<div class=\"settings-wrapper\" style=\"padding:0;\">" +
        "  <div class=\"back-row\" style=\"margin-bottom:1rem;\">" +
        "    <button class=\"back-btn\" onclick=\"goAreasDeDor()\"><i data-feather=\"arrow-left\"></i><span>Voltar</span></button>" +
        "    <div>" +
        "      <div class=\"screen-title\">Áreas de dor</div>" +
        "      <div class=\"screen-sub\">" + (player.name || player.id) + "</div>" +
        "    </div>" +
        "  </div>" +
        "  <div style=\"display:flex;flex-direction:column;gap:1rem;\">" +
        renderPeriod("Último treino", last1, "pain-svg-last1") +
        renderPeriod("Agregado últimos 3 treinos", last3, "pain-svg-last3") +
        renderPeriod("Agregado geral", geral, "pain-svg-geral") +
        "  </div>" +
        "</div>";

    try { if (window.feather && feather.replace) feather.replace(); } catch (e) {}

    // Render assíncrono dos SVGs
    (async function () {
        try {
            var f1 = buildPartsFrequencyByPart(last1);
            var host1 = document.getElementById("pain-svg-last1");
            await renderPainBodySvgInto(host1, f1);

            var f3 = buildPartsFrequencyByPart(last3);
            var host3 = document.getElementById("pain-svg-last3");
            await renderPainBodySvgInto(host3, f3);

            var fg = buildPartsFrequencyByPart(geral);
            var hostG = document.getElementById("pain-svg-geral");
            await renderPainBodySvgInto(hostG, fg);
        } catch (e) {
            // se falhar renderizar, deixa a mensagem de dados insuficientes como fallback
            console.warn("Áreas de dor: erro ao renderizar SVG:", e);
        }

        // Legenda fixa (por frequência)
        function topPartFromFrequency(f) {
            if (!f || !f.counts) return null;
            var entries = Object.keys(f.counts).map(function (k) { return { part: k, count: f.counts[k] }; });
            entries.sort(function (a, b) { return b.count - a.count; });
            return entries.length ? entries[0] : null;
        }

        var legend =
            "<div style=\"display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;\">" +
            "  <span style=\"display:inline-flex;align-items:center;gap:.35rem;\"><span style=\"width:12px;height:12px;border-radius:3px;background:rgba(34,197,94,0.6);border:1px solid #22c55e;\"></span>0%</span>" +
            "  <span style=\"display:inline-flex;align-items:center;gap:.35rem;\"><span style=\"width:12px;height:12px;border-radius:3px;background:rgba(250,204,21,0.6);border:1px solid #facc15;\"></span>~até 33%</span>" +
            "  <span style=\"display:inline-flex;align-items:center;gap:.35rem;\"><span style=\"width:12px;height:12px;border-radius:3px;background:rgba(249,115,22,0.65);border:1px solid #f97316;\"></span>~até 66%</span>" +
            "  <span style=\"display:inline-flex;align-items:center;gap:.35rem;\"><span style=\"width:12px;height:12px;border-radius:3px;background:rgba(239,68,68,0.65);border:1px solid #ef4444;\"></span>~acima de 66%</span>" +
            "</div>";

        // “Onde mais machuca”
        try {
            var top1 = topPartFromFrequency(buildPartsFrequencyByPart(last1));
            var top3 = topPartFromFrequency(buildPartsFrequencyByPart(last3));
            var topG = topPartFromFrequency(buildPartsFrequencyByPart(geral));
            legend = legend +
                "<div class=\"item-sub\" style=\"margin-top:.55rem;color:var(--text-dim);\">Onde mais machuca: " + ((topG && topG.part) ? topG.part : "—") + "</div>";
        } catch (e) {}
        var l1 = document.getElementById("pain-svg-last1_legend");
        var l3 = document.getElementById("pain-svg-last3_legend");
        var lg = document.getElementById("pain-svg-geral_legend");
        if (l1) l1.innerHTML = legend;
        if (l3) l3.innerHTML = legend;
        if (lg) lg.innerHTML = legend;
    })();
}

function goAreasDeDor() {
    state.currentScreen = "areasDeDor";
    setHeaderModeLabel("Áreas de dor");
    renderScreen(`
        <div class="settings-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="goAcompanhamento()"><i data-feather="arrow-left"></i><span>Voltar</span></button>
                <div>
                    <div class="screen-title">Áreas de dor</div>
                    <div class="screen-sub">Mapa corporal e frequência por atleta</div>
                </div>
            </div>
            <div class="settings-panel-area">
                <div class="settings-panel-scroll" style="gap:1rem;display:flex;flex-direction:column;">
                    <div class="acompanhamento-player-list" id="pain-areas-players"></div>
                    <div id="pain-areas-detail" style="margin-top:1rem;"></div>
                </div>
            </div>
        </div>
    `);
    feather.replace();

    fetchAnalyticsData().then(function (res) {
        var playersEl = document.getElementById("pain-areas-players");
        var detailEl = document.getElementById("pain-areas-detail");
        if (!res.success || !playersEl || !detailEl) {
            if (detailEl) detailEl.innerHTML = "<div class=\"item-sub\" style=\"padding:2rem;text-align:center;\">Erro: " + (res.error || "desconhecido") + "</div>";
            return;
        }

        var preH = (res.pre && res.pre.headers) ? res.pre.headers : [];
        var preRows = (res.pre && res.pre.rows) ? res.pre.rows : [];

        var known = getKnownBodyMapPartsSet();
        var anyNamed = false;

        var byPlayer = {};
        preRows.forEach(function (row) {
            var r = parsePreRow(preH, row);
            if (!r || !r.playerId) return;
            var parts = parseNamedMuscularPainParts(r.answers.pontosDor);
            if (parts.length) anyNamed = true;

            if (!byPlayer[r.playerId]) byPlayer[r.playerId] = { id: r.playerId, name: r.name || r.playerId, trainings: [] };
            byPlayer[r.playerId].trainings.push({ date: r.date, parts: parts });
        });

        if (!anyNamed) {
            playersEl.innerHTML = "<div class=\"item-sub\" style=\"padding:2rem;text-align:center;color:var(--text-dim);\">dados insuficientes</div>";
            detailEl.innerHTML = "";
            PAIN_AREAS_ANALYTICS = { byPlayer: byPlayer };
            return;
        }

        // ordenar e preparar tiles (DD/MM/AAAA: não usar new Date(string) nem .sort() lexicográfico)
        Object.keys(byPlayer).forEach(function (pid) {
            byPlayer[pid].trainings = sortRowsByDate(byPlayer[pid].trainings, function (x) { return x.date; });
        });

        // Top áreas por atleta (geral)
        var players = Object.keys(byPlayer).map(function (pid) {
            var tgs = byPlayer[pid].trainings || [];
            var counts = {};
            tgs.forEach(function (t) {
                (t.parts || []).forEach(function (p) {
                    counts[p] = (counts[p] || 0) + 1;
                });
            });
            return { id: pid, name: byPlayer[pid].name, counts: counts };
        }).filter(function (p) { return p && p.counts && Object.keys(p.counts).length; });

        players.sort(function (a, b) {
            // total de ocorrências
            var ta = Object.keys(a.counts || {}).reduce(function (s, k) { return s + (a.counts[k] || 0); }, 0);
            var tb = Object.keys(b.counts || {}).reduce(function (s, k) { return s + (b.counts[k] || 0); }, 0);
            if (tb !== ta) return tb - ta;
            return (a.name || "").localeCompare(b.name || "");
        });

        PAIN_AREAS_ANALYTICS = { byPlayer: byPlayer };

        playersEl.innerHTML = players.map(function (p) {
            var badges = buildTopPartsBadges(p.counts, 3);
            if (badges === "dados insuficientes") {
                badges = "<span class=\"item-sub\" style=\"color:var(--text-dim);\">dados insuficientes</span>";
            }
            return "<button type=\"button\" class=\"acompanhamento-player-btn\" onclick=\"goAreasDeDorPlayer('" + (p.id || "").replace(/'/g, "\\'") + "')\" style=\"text-align:left;\">" +
                "<span class=\"player-name\" style=\"display:block;\">( " + (p.name || p.id) + " )</span>" +
                "<span class=\"player-stats\" style=\"display:block;font-size:.86rem;color:var(--text-dim);white-space:normal;\">" + badges + "</span>" +
                "</button>";
        }).join("");

        // Selecionar automaticamente o primeiro atleta com dados
        if (players.length) {
            goAreasDeDorPlayer(players[0].id);
        } else {
            detailEl.innerHTML = "<div class=\"item-sub\" style=\"padding:2rem;text-align:center;color:var(--text-dim);\">Sem dados suficientes</div>";
        }
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
