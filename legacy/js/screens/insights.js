/* ===========================
   💡 INSIGHTS (Gemini Flash) — Jaraguá
   - Só chama a API se os dados mudaram de forma relevante E passaram ≥5 min desde a última chamada.
   - Cache local + fingerprint estável (evita ruído e protege cota).
   =========================== */

var INSIGHTS_MIN_INTERVAL_MS = 5 * 60 * 1000;
var INSIGHTS_LS_KEY = "jaragua_insights_v1";

function insightsSha256Hex(str) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str))
        .then(function (buf) {
            return Array.from(new Uint8Array(buf)).map(function (x) { return x.toString(16).padStart(2, "0"); }).join("");
        });
}

/** Arredonda para reduzir ruído: só mudanças relevantes alteram o fingerprint. */
function roundRelevant(n, decimals) {
    if (n == null || !isFinite(n)) return null;
    var d = decimals == null ? 1 : decimals;
    var p = Math.pow(10, d);
    return Math.round(n * p) / p;
}

/**
 * Monta objeto estável para hash (mesma lógica conceitual do que o staff olharia).
 */
function buildInsightsDataSnapshot(res, agg, load) {
    var topZones = (agg.zonesSorted || []).slice(0, 5).map(function (z) {
        return { zone: String(z.zone || ""), c: Math.round(z.count || 0) };
    });
    var topInj = (agg.topInjured || []).slice(0, 5).map(function (x) {
        return { id: String(x.playerId || ""), c: Math.round(x.count || 0) };
    });
    return {
        totalPre: agg.totalPre != null ? Math.round(agg.totalPre) : null,
        totalPos: agg.totalPos != null ? Math.round(agg.totalPos) : null,
        avgRecuperacao: roundRelevant(agg.avgRecuperacao, 1),
        avgDor: roundRelevant(agg.avgDor, 1),
        avgFadiga: roundRelevant(agg.avgFadiga, 1),
        avgSono: roundRelevant(agg.avgSono, 1),
        avgEstado: roundRelevant(agg.avgEstado, 1),
        avgTempoMin: roundRelevant(agg.avgTempoMin, 0),
        load: {
            acute: load.acute != null ? Math.round(load.acute) : null,
            chronic: load.chronic != null ? Math.round(load.chronic) : null,
            acwr: roundRelevant(load.acwr, 2),
            monotony: roundRelevant(load.monotony, 2),
            strain: load.strain != null ? Math.round(load.strain) : null,
            trendPct: roundRelevant(load.trendPct, 1),
            readiness: roundRelevant(load.readiness, 2)
        },
        wellness: {
            fadiga: roundRelevant(load.wellnessAvg && load.wellnessAvg.fadiga, 1),
            sono: roundRelevant(load.wellnessAvg && load.wellnessAvg.sono, 1),
            dor: roundRelevant(load.wellnessAvg && load.wellnessAvg.dor, 1),
            estresse: roundRelevant(load.wellnessAvg && load.wellnessAvg.estresse, 1),
            humor: roundRelevant(load.wellnessAvg && load.wellnessAvg.humor, 1)
        },
        topZones: topZones,
        topInjured: topInj
    };
}

function buildInsightsSummaryText(snapshot) {
    return JSON.stringify(snapshot, null, 0);
}

function insightsLoadLocalState() {
    try {
        var raw = localStorage.getItem(INSIGHTS_LS_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function insightsSaveLocalState(obj) {
    try {
        localStorage.setItem(INSIGHTS_LS_KEY, JSON.stringify(obj));
    } catch (e) {}
}

function getBackendUrlInsights() {
    return (typeof window !== "undefined" && window.BACKEND_URL) ? window.BACKEND_URL : "";
}

/**
 * Decide se pode chamar a API: primeira vez sem texto, ou (fp mudou E intervalo ≥5min).
 */
function insightsShouldCallApi(fp, now, local, hasNetwork) {
    if (!hasNetwork) return false;
    if (!local || !local.lastApiAt || !local.insights || local.insights.length !== 5) {
        return true;
    }
    var elapsed = now - local.lastApiAt;
    if (local.fingerprint === fp) {
        return false;
    }
    if (elapsed >= INSIGHTS_MIN_INTERVAL_MS) {
        return true;
    }
    return false;
}

function insightsFormatRetry(waitMs) {
    var s = Math.ceil(waitMs / 1000);
    var m = Math.floor(s / 60);
    var r = s % 60;
    if (m <= 0) return r + " s";
    return m + " min " + r + " s";
}

function goInsights() {
    if (typeof destroyAcompanhamentoCharts === "function") destroyAcompanhamentoCharts();
    state.currentScreen = "insights";
    setHeaderModeLabel("Insights");

    renderScreen(
        "<div class=\"settings-wrapper\">" +
        "  <div class=\"back-row\">" +
        "    <button class=\"back-btn\" onclick=\"goHome()\"><i data-feather=\"arrow-left\"></i><span>Voltar</span></button>" +
        "    <div>" +
        "      <div class=\"screen-title\">Insights</div>" +
        "      <div class=\"screen-sub\" id=\"insights-sub\">Analisando dados do time…</div>" +
        "    </div>" +
        "  </div>" +
        "  <div id=\"insights-content\" class=\"acompanhamento-scroll\" style=\"padding-top:0.5rem;\"></div>" +
        "</div>"
    );
    feather.replace();

    var content = document.getElementById("insights-content");
    var sub = document.getElementById("insights-sub");
    var base = getBackendUrlInsights();

    if (!base) {
        if (sub) sub.textContent = "Backend não configurado.";
        if (content) {
            content.innerHTML =
                "<p class=\"item-sub\" style=\"padding:1rem;\">Configure o servidor (Sheets) para usar Insights com IA.</p>";
        }
        return;
    }

    fetch(base + "/analytics", { method: "GET" })
        .then(function (r) {
            return r.json();
        })
        .then(function (res) {
            if (!res.success) {
                throw new Error(res.error || "Falha ao carregar dados");
            }
            var agg = buildAggregates(res);
            var load = buildTeamLoadMetrics(res);
            var snapshot = buildInsightsDataSnapshot(res, agg, load);
            var summaryText = buildInsightsSummaryText(snapshot);

            return insightsSha256Hex(summaryText).then(function (fp) {
                return { fp: fp, summaryText: summaryText, agg: agg };
            });
        })
        .then(function (ctx) {
            var now = Date.now();
            var local = insightsLoadLocalState();
            var shouldCall = insightsShouldCallApi(ctx.fp, now, local, true);

            if (!shouldCall) {
                var list = local && local.insights ? local.insights : [];
                var note = "";
                if (local && local.fingerprint !== ctx.fp) {
                    var wait = INSIGHTS_MIN_INTERVAL_MS - (now - (local.lastApiAt || 0));
                    if (wait > 0) {
                        note =
                            "<p class=\"item-sub\" style=\"margin-top:0.75rem;padding:0.65rem 0.85rem;border-radius:var(--radius-md);background:rgba(254,236,2,.08);border:1px solid rgba(254,236,2,.25);\">" +
                            "Os dados mudaram; uma nova análise automática poderá ser pedida em " +
                            insightsFormatRetry(wait) +
                            " (limite para proteger a cota gratuita). Até lá, exibimos a última análise.</p>";
                    }
                } else {
                    note =
                        "<p class=\"item-sub\" style=\"margin-top:0.75rem;\">Última análise (dados equivalentes). Nova requisição só após mudança relevante + intervalo de 5 minutos.</p>";
                }
                if (sub) sub.textContent = "Insights do time (cache)";
                if (content) {
                    content.innerHTML =
                        insightsRenderList(list) + note +
                        "<p class=\"item-sub\" style=\"margin-top:1rem;\"><button type=\"button\" class=\"home-btn home-btn-secondary\" onclick=\"insightsForceRefresh()\" style=\"max-width:280px;\">Atualizar agora (respeita limite)</button></p>";
                }
                return null;
            }

            if (sub) sub.textContent = "Gerando insights com IA…";
            if (content) {
                content.innerHTML =
                    "<p class=\"item-sub\" style=\"padding:1rem;\">Contactando o servidor…</p>";
            }

            return fetch(base + "/insights", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    summary: ctx.summaryText,
                    fingerprint: ctx.fp
                })
            }).then(function (r) {
                return r.json().then(function (data) {
                    return { ok: r.ok, status: r.status, data: data };
                });
            });
        })
        .then(function (result) {
            if (result == null) return;
            var data = result.data || {};
            if (!result.ok || !data.success) {
                if (result.status === 429) {
                    var local429 = insightsLoadLocalState();
                    var list429 =
                        data.insights && data.insights.length
                            ? data.insights
                            : local429 && local429.insights
                              ? local429.insights
                              : [];
                    if (sub) sub.textContent = "Insights (limite de frequência)";
                    if (content) {
                        content.innerHTML =
                            insightsRenderList(list429) +
                            "<p class=\"item-sub\" style=\"margin-top:0.75rem;\">" +
                            (data.message || "Aguarde antes de nova geração.") +
                            (data.retryAfterMs
                                ? " (~" + insightsFormatRetry(data.retryAfterMs) + ")"
                                : "") +
                            "</p>";
                    }
                    return;
                }
                throw new Error((data && data.error) || "Falha ao gerar insights");
            }
            var list = data.insights || [];
            var fp = data.fingerprint || "";
            insightsSaveLocalState({
                fingerprint: fp,
                lastApiAt: Date.now(),
                insights: list
            });
            if (sub) sub.textContent = "Insights do time";
            if (content) {
                content.innerHTML =
                    insightsRenderList(list) +
                    "<p class=\"item-sub\" style=\"margin-top:0.75rem;font-size:0.85rem;color:var(--text-dim);\">Atualizações automáticas: no máximo a cada 5 minutos, apenas se os dados mudarem de forma relevante.</p>";
            }
        })
        .catch(function (e) {
            if (sub) sub.textContent = "Erro";
            if (content) {
                content.innerHTML =
                    "<p class=\"item-sub\" style=\"padding:1rem;\">" +
                    String(e.message || e) +
                    "</p>";
            }
        });
}

function insightsRenderList(items) {
    var arr = Array.isArray(items) ? items : [];
    while (arr.length < 5) {
        arr.push("—");
    }
    var html =
        "<ol style=\"margin:0;padding-left:1.25rem;line-height:1.45;max-width:42rem;\">";
    for (var i = 0; i < 5; i++) {
        html += "<li style=\"margin-bottom:0.65rem;\">" + insightsEscapeHtml(String(arr[i] || "—")) + "</li>";
    }
    html += "</ol>";
    return html;
}

function insightsEscapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;");
}

/** Força tentativa de refresh: só efetiva se servidor permitir (ainda respeita 5 min no backend). */
function insightsForceRefresh() {
    try {
        localStorage.removeItem(INSIGHTS_LS_KEY);
    } catch (e) {}
    goInsights();
}
