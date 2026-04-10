/* ===========================
   📋 ANÁLISE DE JOGOS PASSADOS (Sheets + insights IA por jogo, 1×/semana)
   =========================== */

function getBackendUrlPastGames() {
    return (typeof window !== "undefined" && window.BACKEND_URL) ? window.BACKEND_URL.replace(/\/$/, "") : "";
}

function pastGamesEsc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m];
    });
}

function pastGamesFmtMinLabel(v) {
    var raw = String(v == null ? "" : v).trim();
    if (!raw) return "0";
    var n = Number(raw.replace(",", "."));
    if (!isFinite(n)) return raw;
    return n.toFixed(1).replace(/\.0$/, "");
}

function pastGamesParseStints(stintsText) {
    if (!stintsText) return [];
    var parts = String(stintsText).split("|");
    var out = [];
    for (var i = 0; i < parts.length; i++) {
        var item = parts[i].trim();
        if (item) out.push(item);
    }
    return out;
}

function pastGamesMinutesSeries(playersMinutes) {
    var rows = [];
    for (var i = 0; i < (playersMinutes || []).length; i++) {
        var p = playersMinutes[i] || {};
        var raw = String(p.minutes == null ? "" : p.minutes).trim();
        var n = Number(raw.replace(",", "."));
        if (!isFinite(n)) n = 0;
        rows.push({
            name: String(p.name || "Atleta"),
            minutes: n,
        });
    }
    rows.sort(function (a, b) { return b.minutes - a.minutes; });
    return rows;
}

function goPastGames() {
    if (typeof destroyAcompanhamentoCharts === "function") destroyAcompanhamentoCharts();
    state.currentScreen = "pastGames";
    setHeaderModeLabel("Jogos passados");

    renderScreen(
        '<div class="settings-wrapper">' +
            '<div class="back-row">' +
            '<button class="back-btn" onclick="goHome()"><i data-feather="arrow-left"></i><span>Voltar</span></button>' +
            '<div>' +
            '<div class="screen-title">Análise de jogos passados</div>' +
            '<div class="screen-sub" id="past-sub">Relatórios e insights</div>' +
            "</div>" +
            "</div>" +
            '<div id="past-content" class="acompanhamento-scroll" style="padding-top:0.5rem;"></div>' +
            "</div>"
    );
    feather.replace();

    var base = getBackendUrlPastGames();
    var content = document.getElementById("past-content");
    var sub = document.getElementById("past-sub");

    if (!base) {
        if (sub) sub.textContent = "Backend não configurado.";
        if (content) {
            content.innerHTML =
                '<p class="item-sub" style="padding:1rem;">Configure o servidor (Sheets) para listar jogos.</p>';
        }
        return;
    }

    if (content) {
        content.innerHTML = '<p class="item-sub" style="padding:1rem;">Carregando jogos…</p>';
    }

    fetch(base + "/games/reports?limit=100", { method: "GET", cache: "no-store" })
        .then(function (r) {
            return r.json();
        })
        .then(function (res) {
            if (!res.success) {
                throw new Error(res.error || "Falha ao listar");
            }
            var games = res.games || [];
            if (!games.length) {
                if (sub) sub.textContent = "Sem registros";
                if (content) {
                    content.innerHTML =
                        '<p class="item-sub" style="padding:1.2rem;text-align:center;">Sem registro de dados de jogos.</p>';
                }
                return;
            }
            if (sub) sub.textContent = "Selecione um jogo para ver relatório e análise";
            var html = '<div class="past-games-list" style="display:flex;flex-direction:column;gap:0.35rem;">';
            for (var i = 0; i < games.length; i++) {
                var g = games[i];
                var label = (g.date || "—") + " " + (g.time || "") + " · " + (g.teamName || "Time");
                html +=
                    '<button type="button" class="home-btn home-btn-secondary" style="text-align:left;justify-content:flex-start;" ' +
                    'data-game-id="' +
                    pastGamesEsc(g.gameId) +
                    '">' +
                    '<i data-feather="calendar"></i><div>' +
                    pastGamesEsc(label) +
                    "</div></button>";
            }
            html += "</div>";
            if (content) content.innerHTML = html;
            feather.replace();
            var btns = content ? content.querySelectorAll("button[data-game-id]") : [];
            for (var j = 0; j < btns.length; j++) {
                btns[j].addEventListener("click", function () {
                    var gid = this.getAttribute("data-game-id");
                    if (gid) pastGamesOpenDetail(base, gid);
                });
            }
        })
        .catch(function (e) {
            if (content) {
                content.innerHTML =
                    '<p class="item-sub" style="padding:1rem;">Erro: ' + pastGamesEsc(e.message || String(e)) + "</p>";
            }
        });
}

function pastGamesOpenDetail(base, gameId) {
    var content = document.getElementById("past-content");
    var sub = document.getElementById("past-sub");
    if (sub) sub.textContent = "Carregando…";
    if (content) content.innerHTML = '<p class="item-sub" style="padding:1rem;">Carregando relatório…</p>';

    fetch(base + "/games/reports/detail?gameId=" + encodeURIComponent(gameId), { method: "GET", cache: "no-store" })
        .then(function (r) {
            return r.json().then(function (data) {
                return { ok: r.ok, data: data };
            });
        })
        .then(function (ctx) {
            if (!ctx.ok || !ctx.data.success) {
                throw new Error((ctx.data && ctx.data.error) || "Jogo não encontrado");
            }
            var d = ctx.data;
            if (sub) {
                sub.textContent =
                    (d.date || "—") +
                    " " +
                    (d.time || "") +
                    " · " +
                    (d.teamName || "Jaraguá") +
                    (d.time ? "" : "");
            }
            var html = "";
            html +=
                '<div style="margin-bottom:1rem;"><button type="button" class="back-btn" onclick="goPastGames()"><i data-feather="arrow-left"></i><span>Lista</span></button></div>';
            html += "<h3 class=\"chart-title\" style=\"margin:0 0 0.5rem;\">Partida</h3>";
            html +=
                '<p class="item-sub" style="margin-bottom:1rem;">Data: <strong>' +
                pastGamesEsc(d.date) +
                "</strong> · Horário: <strong>" +
                pastGamesEsc(d.time) +
                "</strong><br/>Time: <strong>" +
                pastGamesEsc(d.teamName || "—") +
                "</strong></p>";

            html += "<h3 class=\"chart-title\" style=\"margin:1rem 0 0.5rem;\">Visão coletiva</h3>";
            html +=
                '<p class="item-sub" style="margin-bottom:0.75rem;">Resumo por jogador (elenco) e minutos totais.</p>';

            var elenco = d.elenco || [];
            if (elenco.length) {
                html +=
                    '<table class="past-table" style="width:100%;border-collapse:collapse;font-size:0.88rem;margin-bottom:1rem;"><thead><tr>' +
                    "<th style=\"text-align:left;padding:0.35rem;border-bottom:1px solid rgba(255,255,255,.15)\">Atleta</th>" +
                    "<th style=\"text-align:left;padding:0.35rem;border-bottom:1px solid rgba(255,255,255,.15)\">Em quadra</th>" +
                    "<th style=\"text-align:left;padding:0.35rem;border-bottom:1px solid rgba(255,255,255,.15)\">Banco</th>" +
                    "<th style=\"text-align:left;padding:0.35rem;border-bottom:1px solid rgba(255,255,255,.15)\">Posições</th>" +
                    "</tr></thead><tbody>";
                for (var i = 0; i < elenco.length; i++) {
                    var e = elenco[i];
                    html +=
                        "<tr><td style=\"padding:0.35rem;border-bottom:1px solid rgba(255,255,255,.08)\">" +
                        pastGamesEsc(e.name) +
                        " <span style=\"opacity:.7\">#" +
                        pastGamesEsc(e.number) +
                        "</span></td>" +
                        "<td style=\"padding:0.35rem;border-bottom:1px solid rgba(255,255,255,.08)\">" +
                        pastGamesEsc(e.totalOnField) +
                        "</td>" +
                        "<td style=\"padding:0.35rem;border-bottom:1px solid rgba(255,255,255,.08)\">" +
                        pastGamesEsc(e.bench) +
                        "</td>" +
                        "<td style=\"padding:0.35rem;border-bottom:1px solid rgba(255,255,255,.08);font-size:0.82rem;\">" +
                        pastGamesEsc(e.positionBreakdown) +
                        "</td></tr>";
                }
                html += "</tbody></table>";
            } else html += '<p class="item-sub">Sem dados de elenco.</p>';

            var pm = d.playersMinutes || [];
            if (pm.length) {
                var minuteRows = pastGamesMinutesSeries(pm);
                var maxMinutes = 0;
                for (var pmx = 0; pmx < minuteRows.length; pmx++) {
                    if (minuteRows[pmx].minutes > maxMinutes) maxMinutes = minuteRows[pmx].minutes;
                }
                html += "<h3 class=\"chart-title\" style=\"margin:1rem 0 0.5rem;\">Minutos por atleta</h3>";
                html += '<p class="item-sub" style="margin-bottom:0.6rem;">Visual rápido do tempo total em quadra.</p>';
                html += '<div style="display:grid;gap:0.35rem;margin-bottom:0.9rem;">';
                for (var mb = 0; mb < minuteRows.length; mb++) {
                    var bar = minuteRows[mb];
                    var width = maxMinutes > 0 ? Math.max(4, (bar.minutes / maxMinutes) * 100) : 4;
                    html += '<div style="display:grid;grid-template-columns:minmax(120px,180px) 1fr auto;gap:0.5rem;align-items:center;">';
                    html += '<div style="font-size:0.84rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + pastGamesEsc(bar.name) + "</div>";
                    html += '<div style="height:12px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;"><div style="height:100%;width:' + pastGamesEsc(width.toFixed(1)) + '%;background:linear-gradient(90deg,rgba(254,236,2,.65),rgba(254,236,2,.95));"></div></div>';
                    html += '<div style="font-size:0.82rem;font-weight:700;min-width:42px;text-align:right;">' + pastGamesEsc(pastGamesFmtMinLabel(bar.minutes)) + "m</div>";
                    html += "</div>";
                }
                html += "</div>";

                html += "<h4 style=\"margin:0.75rem 0 0.35rem;font-size:0.95rem;\">Minutos (aba Jogos)</h4>";
                html += '<ul style="margin:0;padding-left:1.1rem;font-size:0.88rem;">';
                for (var j = 0; j < pm.length; j++) {
                    var p = pm[j];
                    html +=
                        "<li>" +
                        pastGamesEsc(p.name) +
                        " — " +
                        pastGamesEsc(pastGamesFmtMinLabel(p.minutes)) +
                        " min</li>";
                }
                html += "</ul>";
            }

            var logs = d.logs || [];
            var gameEventCountByPlayerId = {};
            for (var lg = 0; lg < logs.length; lg++) {
                var logItem = logs[lg] || {};
                var evt = String(logItem.event || "").toLowerCase();
                if (evt === "entrada" || evt === "saída" || evt === "saida") continue;
                var pid = String(logItem.playerId || "");
                if (!pid) continue;
                gameEventCountByPlayerId[pid] = (gameEventCountByPlayerId[pid] || 0) + 1;
            }

            if (elenco.length) {
                html += "<h3 class=\"chart-title\" style=\"margin:1.1rem 0 0.5rem;\">Consulta rápida por atleta</h3>";
                html += '<p class="item-sub" style="margin-bottom:0.75rem;">Entradas, momento de entrada/saída, eventos e tempo total em quadra.</p>';
                html += '<div style="display:grid;gap:0.65rem;">';
                for (var ec = 0; ec < elenco.length; ec++) {
                    var eCard = elenco[ec] || {};
                    var stints = pastGamesParseStints(eCard.stintsDetail);
                    var entryCount = eCard.entryCount || String(stints.length || 0);
                    var evCount = gameEventCountByPlayerId[String(eCard.playerId || "")] || 0;
                    html += '<div style="border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:0.7rem 0.8rem;background:rgba(255,255,255,.03);">';
                    html += '<div style="display:flex;justify-content:space-between;gap:0.5rem;align-items:center;flex-wrap:wrap;">';
                    html += '<strong style="font-size:0.95rem;">' + pastGamesEsc(eCard.name || "Atleta") + ' <span style="opacity:.7;">#' + pastGamesEsc(eCard.number || "—") + "</span></strong>";
                    html += '<span style="font-size:0.8rem;opacity:.8;">Tempo total: <strong>' + pastGamesEsc(eCard.totalOnField || "0:00") + "</strong></span>";
                    html += "</div>";
                    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.35rem;margin-top:0.5rem;">';
                    html += '<div style="padding:0.4rem;border-radius:8px;background:rgba(254,236,2,.08);font-size:0.83rem;">Entradas: <strong>' + pastGamesEsc(entryCount) + "</strong></div>";
                    html += '<div style="padding:0.4rem;border-radius:8px;background:rgba(255,255,255,.06);font-size:0.83rem;">Eventos: <strong>' + pastGamesEsc(evCount) + "</strong></div>";
                    html += '<div style="padding:0.4rem;border-radius:8px;background:rgba(255,255,255,.06);font-size:0.83rem;">Banco: <strong>' + pastGamesEsc(eCard.bench || "0:00") + "</strong></div>";
                    html += "</div>";
                    html += '<div style="margin-top:0.45rem;font-size:0.8rem;opacity:.95;">Posições: ' + pastGamesEsc(eCard.positionBreakdown || "—") + "</div>";
                    if (stints.length) {
                        html += '<div style="margin-top:0.45rem;font-size:0.82rem;"><strong>Quando entrou/saiu:</strong><ul style="margin:0.35rem 0 0;padding-left:1rem;">';
                        for (var si = 0; si < stints.length; si++) {
                            html += "<li>" + pastGamesEsc(stints[si]) + "</li>";
                        }
                        html += "</ul></div>";
                    } else {
                        html += '<div style="margin-top:0.45rem;font-size:0.82rem;opacity:.8;">Sem permanências registradas.</div>';
                    }
                    html += "</div>";
                }
                html += "</div>";
            }

            if (logs.length) {
                html += "<h3 class=\"chart-title\" style=\"margin:1.1rem 0 0.5rem;\">Linha do tempo de eventos</h3>";
                html += '<p class="item-sub" style="margin-bottom:0.75rem;">Todas as entradas, saídas e eventos do jogo.</p>';
                html += '<div style="max-height:340px;overflow:auto;border:1px solid rgba(255,255,255,.12);border-radius:12px;">';
                html += '<table class="past-table" style="width:100%;border-collapse:collapse;font-size:0.84rem;">';
                html += "<thead><tr>";
                html += '<th style="text-align:left;padding:0.45rem;border-bottom:1px solid rgba(255,255,255,.15)">Momento</th>';
                html += '<th style="text-align:left;padding:0.45rem;border-bottom:1px solid rgba(255,255,255,.15)">Atleta</th>';
                html += '<th style="text-align:left;padding:0.45rem;border-bottom:1px solid rgba(255,255,255,.15)">Ação</th>';
                html += '<th style="text-align:left;padding:0.45rem;border-bottom:1px solid rgba(255,255,255,.15)">Posição</th>';
                html += "</tr></thead><tbody>";
                for (var li = 0; li < logs.length; li++) {
                    var row = logs[li] || {};
                    var playerLabel = (row.playerName || "—") + (row.number ? " #" + row.number : "");
                    var actionLabel = row.event || "—";
                    if (row.durationOut) actionLabel += " (" + row.durationOut + ")";
                    html += "<tr>";
                    html += '<td style="padding:0.4rem;border-bottom:1px solid rgba(255,255,255,.08);white-space:nowrap;">' + pastGamesEsc(row.minuteLabel || "—") + "</td>";
                    html += '<td style="padding:0.4rem;border-bottom:1px solid rgba(255,255,255,.08);">' + pastGamesEsc(playerLabel) + "</td>";
                    html += '<td style="padding:0.4rem;border-bottom:1px solid rgba(255,255,255,.08);">' + pastGamesEsc(actionLabel) + "</td>";
                    html += '<td style="padding:0.4rem;border-bottom:1px solid rgba(255,255,255,.08);">' + pastGamesEsc(row.position || "—") + "</td>";
                    html += "</tr>";
                }
                html += "</tbody></table></div>";
            }

            html +=
                '<div style="margin-top:1.25rem;padding:1rem;border-radius:var(--radius-md);border:1px solid rgba(254,236,2,.25);background:rgba(254,236,2,.06);">' +
                '<p class="item-sub" style="margin:0 0 0.5rem;">Insights de IA sobre este jogo: no máximo <strong>uma nova geração por semana</strong> (cache no servidor).</p>' +
                '<button type="button" class="home-btn home-btn-secondary" id="past-btn-insights" style="max-width:320px;">Gerar / ver insights do jogo</button>' +
                '<div id="past-insights-out" style="margin-top:0.75rem;"></div></div>';

            if (content) content.innerHTML = html;
            feather.replace();

            var btn = document.getElementById("past-btn-insights");
            if (btn) {
                btn.addEventListener("click", function () {
                    pastGamesFetchInsights(base, gameId);
                });
            }
        })
        .catch(function (e) {
            if (content) {
                content.innerHTML =
                    '<p class="item-sub" style="padding:1rem;">' + pastGamesEsc(e.message || String(e)) + "</p>";
            }
        });
}

function pastGamesFetchInsights(base, gameId) {
    var out = document.getElementById("past-insights-out");
    if (out) out.innerHTML = '<p class="item-sub">Contactando IA…</p>';

    fetch(base + "/insights/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: gameId }),
    })
        .then(function (r) {
            return r.json().then(function (data) {
                return { ok: r.ok, data: data };
            });
        })
        .then(function (ctx) {
            if (!ctx.ok || !ctx.data.success) {
                throw new Error((ctx.data && ctx.data.error) || "Falha na análise");
            }
            var data = ctx.data;
            var a = data.analysis || {};
            var note = data.cached
                ? "<p class=\"item-sub\" style=\"margin-bottom:0.5rem;\">Cache (próxima geração nova em ~" +
                  (typeof data.nextRefreshInSec === "number"
                      ? Math.round(data.nextRefreshInSec / 3600) + " h"
                      : "7 dias") +
                  ")</p>"
                : "<p class=\"item-sub\" style=\"margin-bottom:0.5rem;\">Análise gerada agora.</p>";

            var html = note;
            if (a.resumoTime) {
                html +=
                    '<h4 style="margin:0.5rem 0 0.35rem;">Time</h4><p style="font-size:0.92rem;line-height:1.45;">' +
                    pastGamesEsc(a.resumoTime) +
                    "</p>";
            }
            var pa = a.porAtleta || [];
            if (pa.length) {
                html += '<h4 style="margin:0.75rem 0 0.35rem;">Por atleta</h4><ul style="font-size:0.88rem;margin:0;padding-left:1.1rem;">';
                for (var i = 0; i < pa.length; i++) {
                    var x = pa[i];
                    html +=
                        "<li style=\"margin-bottom:0.35rem;\"><strong>" +
                        pastGamesEsc(x.nome || "") +
                        "</strong> — " +
                        pastGamesEsc(x.analise || "") +
                        "</li>";
                }
                html += "</ul>";
            }
            var obs = a.observacoes || [];
            if (obs.length) {
                html += '<h4 style="margin:0.75rem 0 0.35rem;">Observações</h4><ul style="font-size:0.88rem;">';
                for (var j = 0; j < obs.length; j++) {
                    html += "<li>" + pastGamesEsc(obs[j]) + "</li>";
                }
                html += "</ul>";
            }
            if (out) out.innerHTML = html;
        })
        .catch(function (e) {
            if (out) {
                out.innerHTML =
                    '<p class="item-sub" style="color:#f87171;">' + pastGamesEsc(e.message || String(e)) + "</p>";
            }
        });
}

function abrirAnaliseJogosPassadosComSenha() {
    function openPast() {
        if (typeof goPastGames === "function") goPastGames();
    }
    if (typeof window.showLockScreen === "function") {
        window.showLockScreen(openPast);
    } else {
        openPast();
    }
}
