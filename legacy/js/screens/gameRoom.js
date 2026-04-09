/* ===========================
   🎮 GAME ROOM — Pré-jogo (Jaraguá Futsal)
   Regras simples + dados de /analytics e histórico de jogos
   =========================== */

function goGameRoom() {
    if (typeof destroyAcompanhamentoCharts === "function") destroyAcompanhamentoCharts();
    state.currentScreen = "gameRoom";
    setHeaderModeLabel("Game Room");

    renderScreen(
        '<div class="settings-wrapper">' +
            '<div class="back-row">' +
            '<button class="back-btn" onclick="goHome()"><i data-feather="arrow-left"></i><span>Voltar</span></button>' +
            '<div>' +
            '<div class="screen-title">Game Room</div>' +
            '<div class="screen-sub" id="gr-sub">Pré-jogo — carregando dados…</div>' +
            "</div>" +
            "</div>" +
            '<div id="gr-content" class="acompanhamento-scroll" style="padding-top:0.5rem;"></div>' +
            "</div>"
    );
    feather.replace();

    var base = typeof getBackendUrl === "function" ? getBackendUrl() : window.BACKEND_URL || "";
    var content = document.getElementById("gr-content");
    var sub = document.getElementById("gr-sub");

    var sheetsOff = false;
    try {
        sheetsOff = window.__TUTEM_SHEETS_MODE__ === "none";
    } catch (e) {}

    if (!base && !sheetsOff) {
        if (sub) sub.textContent = "Backend não configurado";
        if (content) {
            content.innerHTML =
                '<p class="item-sub" style="padding:1rem;">Configure BACKEND_URL para usar a Game Room.</p>';
        }
        return;
    }

    var gamesPromise = base
        ? fetch(base + "/games/reports?limit=12", { method: "GET", cache: "no-store" })
            .then(function (r) {
                return r.json();
            })
            .catch(function () {
                return { success: false, games: [] };
            })
        : Promise.resolve({ success: false, games: [] });

    Promise.all([
        fetchAnalyticsData(),
        gamesPromise,
    ])
        .then(function (results) {
            var res = results[0];
            var gamesRes = results[1];
            if (!res.success) throw new Error(res.error || "Falha no analytics");

            var agg = buildAggregates(res);
            var load = buildTeamLoadMetrics(res);
            var games = gamesRes.success && gamesRes.games ? gamesRes.games : [];

            if (!games.length || !base) {
                return { html: gameRoomBuildHtml(res, agg, load, games, null), agg: agg };
            }
            return fetch(base + "/games/reports/detail?gameId=" + encodeURIComponent(games[0].gameId), {
                method: "GET",
                cache: "no-store",
            })
                .then(function (r) {
                    return r.json();
                })
                .catch(function () {
                    return { success: false };
                })
                .then(function (det) {
                    var lastDetail = det && det.success ? det : null;
                    return { html: gameRoomBuildHtml(res, agg, load, games, lastDetail), agg: agg };
                });
        })
        .then(function (pack) {
            if (sub) sub.textContent = "Como jogar hoje com base nos nossos dados";
            if (content) content.innerHTML = pack.html;
            feather.replace();
            gameRoomWireLineup(pack.agg);
        })
        .catch(function (e) {
            if (sub) sub.textContent = "Erro";
            if (content) {
                content.innerHTML =
                    '<p class="item-sub" style="padding:1rem;">' + gameRoomEsc(String(e.message || e)) + "</p>";
            }
        });
}

function gameRoomEsc(s) {
    return String(s == null ? "" : s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function gameRoomBuildHtml(data, agg, load, games, lastDetail) {
    var w = load.wellnessAvg || {};
    var avgFad = w.fadiga != null ? w.fadiga : null;
    var weekLoad = load.acute != null ? load.acute : null;

    var pr = gameRoomClassifyPlayers(agg, load);
    var sorted = pr.sorted;

    var cards =
        '<div class="kpi-grid" style="margin-bottom:1rem;">' +
        '<div class="kpi-card"><div class="kpi-value">' +
        (avgFad != null ? avgFad : "—") +
        '</div><div class="kpi-label">Fadiga média do elenco (pré 1–5)</div></div>' +
        '<div class="kpi-card"><div class="kpi-value">' +
        (weekLoad != null ? weekLoad : "—") +
        '</div><div class="kpi-label">Carga aguda (7 dias)</div></div>' +
        '<div class="kpi-card" style="border-color:rgba(34,197,94,0.35);"><div class="kpi-value" style="color:#86efac;">' +
        pr.ready +
        '</div><div class="kpi-label">🟢 Prontos</div></div>' +
        '<div class="kpi-card" style="border-color:rgba(234,179,8,0.35);"><div class="kpi-value" style="color:#fde047;">' +
        pr.attn +
        '</div><div class="kpi-label">🟡 Atenção</div></div>' +
        '<div class="kpi-card" style="border-color:rgba(239,68,68,0.35);"><div class="kpi-value" style="color:#fca5a5;">' +
        pr.risk +
        '</div><div class="kpi-label">🔴 Risco</div></div>' +
        "</div>";

    var alerts = gameRoomAlerts(agg, load, pr);
    var alertHtml = "";
    if (alerts.length) {
        alertHtml =
            '<div class="chart-section" style="border-left:4px solid #eab308;padding-left:0.75rem;"><h3 class="chart-title">Alertas pré-jogo</h3>';
        for (var a = 0; a < Math.min(3, alerts.length); a++) {
            alertHtml += '<p class="item-sub" style="margin:0.35rem 0;">• ' + gameRoomEsc(alerts[a]) + "</p>";
        }
        alertHtml += "</div>";
    }

    var patterns = gameRoomPatterns(agg, load, games, lastDetail);
    var patternHtml = '<div class="chart-section"><h3 class="chart-title">Padrões do time</h3><ul style="margin:0.35rem 0;padding-left:1.1rem;font-size:0.92rem;">';
    for (var p = 0; p < patterns.length; p++) {
        patternHtml += "<li style=\"margin-bottom:0.35rem;\">" + gameRoomEsc(patterns[p]) + "</li>";
    }
    patternHtml += "</ul></div>";

    var tact = gameRoomTactical(sorted, load, pr);
    var tactHtml =
        '<div class="chart-section" style="border:1px solid rgba(254,236,2,0.25);border-radius:12px;padding:0.85rem;">' +
        '<h3 class="chart-title">Sugestão tática (regras automáticas)</h3>' +
        '<p class="item-sub" style="margin:0.25rem 0 0.5rem;">' +
        gameRoomEsc(tact.block) +
        "</p></div>";

    var table =
        '<div class="chart-section"><h3 class="chart-title">Prontidão por atleta</h3>' +
        '<p class="item-sub" style="margin-bottom:0.5rem;">Ordenado: mais prontos primeiro.</p>' +
        '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.88rem;">' +
        "<thead><tr><th style=\"text-align:left;padding:0.35rem;border-bottom:1px solid rgba(255,255,255,.15)\">Atleta</th>" +
        '<th style="text-align:left;padding:0.35rem;border-bottom:1px solid rgba(255,255,255,.15)">Prontidão</th>' +
        '<th style="text-align:left;padding:0.35rem;border-bottom:1px solid rgba(255,255,255,.15)">Carga recente (pós)</th>' +
        '<th style="text-align:left;padding:0.35rem;border-bottom:1px solid rgba(255,255,255,.15)">Tendência</th></tr></thead><tbody>';

    for (var i = 0; i < sorted.length; i++) {
        var row = sorted[i];
        table +=
            "<tr><td style=\"padding:0.4rem;border-bottom:1px solid rgba(255,255,255,.08);\">" +
            gameRoomEsc(row.name) +
            "</td><td style=\"padding:0.4rem;border-bottom:1px solid rgba(255,255,255,.08);\">" +
            gameRoomEsc(row.readinessLabel) +
            '</td><td style="padding:0.4rem;border-bottom:1px solid rgba(255,255,255,.08);">' +
            gameRoomEsc(row.loadRecent) +
            '</td><td style="padding:0.4rem;border-bottom:1px solid rgba(255,255,255,.08);">' +
            gameRoomEsc(row.trend) +
            "</td></tr>";
    }
    table += "</tbody></table></div></div>";

    var prof = gameRoomUsageProfiles(sorted, lastDetail);
    var profHtml = '<div class="chart-section"><h3 class="chart-title">Perfil de uso (referência)</h3><ul style="font-size:0.88rem;margin:0;padding-left:1.05rem;">';
    for (var u = 0; u < prof.length; u++) {
        profHtml += "<li style=\"margin-bottom:0.4rem;\">" + gameRoomEsc(prof[u]) + "</li>";
    }
    profHtml += "</ul></div>";

    var hist = '<div class="chart-section"><h3 class="chart-title">Histórico recente (jogos registrados)</h3>';
    if (!games.length) {
        hist += '<p class="item-sub">Nenhum jogo na planilha ainda.</p>';
    } else {
        hist += '<ul style="font-size:0.88rem;margin:0;padding-left:1.05rem;">';
        for (var g = 0; g < Math.min(8, games.length); g++) {
            var gm = games[g];
            hist +=
                "<li style=\"margin-bottom:0.35rem;\">" +
                gameRoomEsc((gm.date || "—") + " " + (gm.time || "") + " — " + (gm.teamName || "Time")) +
                "</li>";
        }
        hist += "</ul>";
        hist +=
            '<p class="item-sub" style="margin-top:0.5rem;">Rotação: use o último jogo como referência de minutos em quadra (acima).</p>';
    }
    hist += "</div>";

    var lineup =
        '<div class="chart-section" id="gr-lineup-section"><h3 class="chart-title">Simulação simples de escalação</h3>' +
        '<p class="item-sub">Marque até 5 titulares (sem posição em campo). Mostramos fadiga média e risco da formação.</p>' +
        '<div id="gr-lineup-checks" style="display:flex;flex-wrap:wrap;gap:0.45rem;margin:0.5rem 0;"></div>' +
        '<p class="item-sub" id="gr-lineup-out" style="margin-top:0.5rem;font-weight:600;"></p></div>';

    return (
        cards +
        tactHtml +
        alertHtml +
        patternHtml +
        table +
        prof +
        lineup +
        hist +
        '<p class="item-sub" style="margin-top:1rem;opacity:0.85;font-size:0.82rem;">Game Room usa médias e regras locais; complementa o Dash tático ao vivo. Sem dados do adversário.</p>'
    );
}

function gameRoomWireLineup(agg) {
    if (!agg || !agg.byPlayer) return;
    var box = document.getElementById("gr-lineup-checks");
    var out = document.getElementById("gr-lineup-out");
    if (!box || !out) return;
    var ids = Object.keys(agg.byPlayer);
    var html = "";
    for (var i = 0; i < ids.length; i++) {
        var pid = ids[i];
        var name = (agg.byPlayer[pid] && agg.byPlayer[pid].name) || pid;
        html +=
            '<label style="display:inline-flex;align-items:center;gap:0.35rem;padding:0.25rem 0.5rem;border-radius:8px;border:1px solid rgba(255,255,255,.15);cursor:pointer;font-size:0.85rem;">' +
            '<input type="checkbox" class="gr-tit" data-pid="' +
            gameRoomEsc(pid) +
            '" /> ' +
            gameRoomEsc(name) +
            "</label>";
    }
    box.innerHTML = html;
    function updateLineup() {
        var cbs = box.querySelectorAll("input.gr-tit:checked");
        if (cbs.length > 5) {
            cbs[cbs.length - 1].checked = false;
        }
        var sel = [];
        cbs = box.querySelectorAll("input.gr-tit:checked");
        for (var j = 0; j < cbs.length; j++) {
            sel.push(cbs[j].getAttribute("data-pid"));
        }
        var fatSum = 0,
            fatN = 0,
            risk = 0;
        for (var k = 0; k < sel.length; k++) {
            var row = gameRoomPlayerRow(agg, null, sel[k]);
            if (row.lastFad != null) {
                fatSum += row.lastFad;
                fatN++;
            }
            if (row.bucket === "risk") risk++;
        }
        var fatAvg = fatN ? Math.round((fatSum / fatN) * 10) / 10 : null;
        var riskLabel = risk >= 2 ? "alto" : risk === 1 ? "moderado" : "baixo";
        out.textContent =
            sel.length === 0
                ? "Selecione atletas para ver a simulação."
                : "Titulares: " +
                  sel.length +
                  " · Fadiga média (último pré): " +
                  (fatAvg != null ? fatAvg + " (1–5)" : "—") +
                  " · Risco geral: " +
                  riskLabel +
                  ".";
    }
    box.addEventListener("change", updateLineup);
}

function gameRoomPlayerRow(agg, load, pid) {
    var p = agg.byPlayer[pid];
    if (!p) return { lastFad: null, bucket: "attention", trend: "—" };
    var pre = p.pre.slice().sort(function (a, b) {
        var da = typeof parseDateToLocalDate === "function" ? parseDateToLocalDate(a.date) : null;
        var db = typeof parseDateToLocalDate === "function" ? parseDateToLocalDate(b.date) : null;
        var ta = da ? da.getTime() : 0;
        var tb = db ? db.getTime() : 0;
        return tb - ta;
    });
    var last = pre[0];
    var prev = pre[1];
    var fad = last && last.answers ? last.answers.fadiga : null;
    var trend = "estável";
    if (last && prev && last.answers.fadiga != null && prev.answers.fadiga != null) {
        if (last.answers.fadiga > prev.answers.fadiga + 0.3) trend = "subindo (fadiga)";
        else if (last.answers.fadiga < prev.answers.fadiga - 0.3) trend = "caindo (fadiga)";
    }
    var bucket = "ready";
    if (fad != null) {
        if (fad >= 4) bucket = "risk";
        else if (fad >= 3) bucket = "attention";
    }
    var posLoads = p.pos.slice().sort(function (a, b) {
        var da = typeof parseDateToLocalDate === "function" ? parseDateToLocalDate(a.date) : null;
        var db = typeof parseDateToLocalDate === "function" ? parseDateToLocalDate(b.date) : null;
        return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    });
    var lp = posLoads[0];
    var loadTxt =
        lp && lp.answers && lp.answers.estado != null && lp.answers.tempoMin != null
            ? "PSE " + lp.answers.estado + " × " + lp.answers.tempoMin + " min"
            : "—";
    return { lastFad: fad, bucket: bucket, trend: trend, loadRecent: loadTxt };
}

function gameRoomClassifyPlayers(agg, load) {
    var by = agg.byPlayer || {};
    var ids = Object.keys(by);
    var ready = 0,
        attn = 0,
        risk = 0;
    var rows = [];
    for (var i = 0; i < ids.length; i++) {
        var pid = ids[i];
        var row = gameRoomPlayerRow(agg, load, pid);
        if (row.bucket === "ready") ready++;
        else if (row.bucket === "attention") attn++;
        else risk++;
        var rScore = row.bucket === "ready" ? 3 : row.bucket === "attention" ? 2 : 1;
        var readinessLabel =
            row.bucket === "ready" ? "alta" : row.bucket === "attention" ? "média" : "baixa";
        rows.push({
            pid: pid,
            name: by[pid].name || pid,
            readinessLabel: readinessLabel,
            loadRecent: row.loadRecent,
            trend: row.trend,
            rScore: rScore,
            lastFad: row.lastFad,
        });
    }
    rows.sort(function (a, b) {
        if (b.rScore !== a.rScore) return b.rScore - a.rScore;
        var fa = a.lastFad != null ? a.lastFad : 99;
        var fb = b.lastFad != null ? b.lastFad : 99;
        return fa - fb;
    });
    return { ready: ready, attn: attn, risk: risk, sorted: rows };
}

function gameRoomPatterns(agg, load, games, lastDetail) {
    var out = [];
    if (load.trendPct != null) {
        if (load.trendPct > 8) out.push("Carga da última semana subiu cerca de " + Math.round(load.trendPct) + "% vs. a anterior — favorecer rotação mais curta.");
        else if (load.trendPct < -8) out.push("Carga recente caiu (~" + Math.round(Math.abs(load.trendPct)) + "%) — time pode suportar minutos um pouco maiores, com critério.");
        else out.push("Carga semanal estável em relação à semana anterior.");
    } else {
        out.push("Sem tendência de carga comparável (dados insuficientes).");
    }
    if (load.acwr != null) {
        if (load.acwr > 1.5) out.push("ACWR elevado: histórico sugere risco se alongar permanências.");
        else if (load.acwr < 0.85) out.push("ACWR baixo: atenção a possível subcarga; ainda assim alternar evita monotonia.");
        else out.push("ACWR na faixa equilibrada para variar entrada e saída.");
    }
    if (lastDetail && lastDetail.elenco && lastDetail.elenco.length) {
        out.push(
            "Último jogo registrado: use os tempos em quadra como referência de rotação (não é regra fixa)."
        );
    }
    if (games.length >= 3) {
        out.push("Há histórico de vários jogos na planilha — compare fadiga pré-jogo com o desempenho esperado.");
    }
    return out.slice(0, 6);
}

function gameRoomTactical(sorted, load, pr) {
    var subMin = load.acwr != null && load.acwr > 1.35 ? "3–4" : "4–5";
    var rot = pr.risk >= 3 ? "Rotação curta e frequente." : "Rotação moderada; observar sinais de fadiga.";
    var top = sorted.slice(0, 3);
    var bottom = sorted.slice(-2);
    var namesTop = top
        .map(function (x) {
            return x.name;
        })
        .join(", ");
    var namesRisk = bottom
        .filter(function (x) {
            return x.readinessLabel === "baixa";
        })
        .map(function (x) {
            return x.name;
        })
        .join(", ");
    var block =
        "Tempo de jogo: substituir aproximadamente a cada " +
        subMin +
        " minutos (ajuste ao vivo). " +
        rot +
        " ";
    block +=
        "Sugestão de início: atletas com prontidão alta — " +
        (namesTop || "ver lista") +
        ". ";
    if (namesRisk) {
        block += "Evitar uso prolongado de: " + namesRisk + " (fadiga/alerta).";
    } else {
        block += "Nenhum atleta crítico na cauda da lista neste recorte.";
    }
    return { block: block };
}

function gameRoomAlerts(agg, load, pr) {
    var a = [];
    if (pr.risk >= 2) a.push(pr.risk + " atleta(s) com fadiga alta no último pré-treino.");
    if (load.acute != null && load.chronic != null && load.chronic > 0 && load.acute / load.chronic > 1.4) {
        a.push("Carga semanal acima da média de longo prazo (agudo vs. crônico).");
    }
    if (load.trendPct != null && load.trendPct > 12) {
        a.push("Tendência forte de aumento de carga na última semana.");
    }
    return a.slice(0, 3);
}

function gameRoomUsageProfiles(sorted, lastDetail) {
    var lines = [];
    var mapMin = {};
    if (lastDetail && lastDetail.elenco) {
        for (var i = 0; i < lastDetail.elenco.length; i++) {
            var e = lastDetail.elenco[i];
            var mm = gameRoomParseMinutesLabel(e.totalOnField || "");
            mapMin[e.playerId || e.name] = mm;
        }
    }
    for (var j = 0; j < Math.min(sorted.length, 12); j++) {
        var s = sorted[j];
        var m = mapMin[s.pid] != null ? mapMin[s.pid] : mapMin[s.name];
        var tip =
            m != null
                ? "Último jogo: ~" + Math.round(m) + " min em quadra. Sugestão: blocos de até 4 min se fadiga média/alta."
                : "Sem minutos do último jogo — usar referência de 4 min por entrada até haver dados.";
        lines.push(s.name + ": " + tip);
    }
    return lines;
}

function gameRoomParseMinutesLabel(s) {
    if (!s) return null;
    var str = String(s).trim();
    var parts = str.split(":");
    if (parts.length === 3) {
        var h = parseInt(parts[0], 10) || 0;
        var m = parseInt(parts[1], 10) || 0;
        var sec = parseInt(parts[2], 10) || 0;
        return h * 60 + m + sec / 60;
    }
    if (parts.length === 2) {
        var m2 = parseInt(parts[0], 10) || 0;
        var s2 = parseInt(parts[1], 10) || 0;
        return m2 + s2 / 60;
    }
    var n = parseFloat(str.replace(",", "."));
    return isNaN(n) ? null : n;
}

function abrirGameRoomComSenha() {
    function openGr() {
        if (typeof goGameRoom === "function") goGameRoom();
    }
    if (typeof window.showLockScreen === "function") {
        window.showLockScreen(openGr);
    } else {
        openGr();
    }
}
