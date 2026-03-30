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
                html += "<h4 style=\"margin:0.75rem 0 0.35rem;font-size:0.95rem;\">Minutos (aba Jogos)</h4>";
                html += '<ul style="margin:0;padding-left:1.1rem;font-size:0.88rem;">';
                for (var j = 0; j < pm.length; j++) {
                    var p = pm[j];
                    html +=
                        "<li>" +
                        pastGamesEsc(p.name) +
                        " — " +
                        pastGamesEsc(p.minutes) +
                        " min</li>";
                }
                html += "</ul>";
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
