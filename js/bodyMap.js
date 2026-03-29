/* Mapa corporal (pré): regiões com data-part no SVG; valor salvo = nomes separados por espaço. */

var BODY_MAP_PART_NAMES = [
    "Pé direito", "Pé esquerdo", "Calcanhar esquerdo", "Calcanhar direito",
    "Panturrilha esquerda", "Panturrilha direita", "Joelho direito", "Joelho esquerdo",
    "Posterior esquerdo", "Posterior direito", "Quadríceps direito", "Quadríceps esquerdo",
    "Adutor esquerdo", "Adutor direito", "Glúteo esquerdo", "Glúteo direito",
    "Abdômen", "Lombar", "Serrátil direito", "Serrátil esquerdo", "Latíssimo direito", "Latíssimo esquerdo",
    "Trapézio direito", "Trapézio esquerdo", "Ombro esquerdo", "Ombro direito",
    "Tríceps direito", "Tríceps esquerdo", "Cotovelo esquerdo", "Cotovelo direito", "Pescoço",
    "Bíceps direito", "Bíceps esquerdo", "Antebraço esquerdo", "Antebraço direito",
    "Pulso esquerdo", "Pulso direito", "Mão esquerda", "Mão direita",
    "Peitoral direito", "Peitoral esquerdo", "Quadril"
];

function legacyParseMuscularTokens(t) {
    var compact = t.replace(/\s/g, "");
    if (/^[A-Za-z]+$/.test(compact) && compact.length <= 26) {
        return compact.toUpperCase().split("");
    }
    return t.split(/[;,]/).map(function (x) { return x.trim(); }).filter(Boolean);
}

/** Interpreta valor salvo em "Pontos de dor": nomes com espaço, ou legado (letras A–Z / vírgulas). */
function parsePontosDorMuscularValue(str) {
    if (str == null) return [];
    var t = String(str).trim();
    if (!t || /^sem dor$/i.test(t) || /^nenhuma$/i.test(t)) return [];
    var s = t;
    var out = [];
    while (s.length) {
        s = s.replace(/^\s+/, "");
        if (!s.length) break;
        var best = null;
        for (var i = 0; i < BODY_MAP_PART_NAMES.length; i++) {
            var n = BODY_MAP_PART_NAMES[i];
            if (s.indexOf(n) !== 0) continue;
            if (s.length > n.length && s[n.length] !== " ") continue;
            if (!best || n.length > best.length) best = n;
        }
        if (!best) {
            if (!out.length) return legacyParseMuscularTokens(t);
            break;
        }
        out.push(best);
        s = s.slice(best.length);
    }
    return out;
}

function serializeBodyMapSelection(selectedSet) {
    return Array.from(selectedSet).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); }).join(" ");
}

function bodyMapUpdateListEl(listEl, names) {
    if (!listEl) return;
    if (!names.length) {
        listEl.textContent = "Nenhuma região selecionada";
        return;
    }
    listEl.textContent = names.sort(function (a, b) { return a.localeCompare(b, "pt-BR"); }).join(", ");
}

/** Escala cada região a partir do centro do bbox (área de toque maior; regiões miúdas ganham mais). */
function applyMuscleTouchScale(svg) {
    if (!svg) return;
    var groups = svg.querySelectorAll("g.muscle");
    for (var i = 0; i < groups.length; i++) {
        var g = groups[i];
        if (g.getAttribute("data-touch-scale")) continue;
        try {
            var b = g.getBBox();
            if (!isFinite(b.width) || !isFinite(b.height)) continue;
            if (b.width < 0.25 && b.height < 0.25) continue;
            var maxSide = Math.max(b.width, b.height);
            var scale = maxSide < 38 ? 1.14 : maxSide < 72 ? 1.1 : maxSide < 120 ? 1.06 : 1.04;
            var cx = b.x + b.width / 2;
            var cy = b.y + b.height / 2;
            var prev = (g.getAttribute("transform") || "").trim();
            var extra = "translate(" + cx + "," + cy + ") scale(" + scale + ") translate(" + (-cx) + "," + (-cy) + ")";
            g.setAttribute("transform", prev ? prev + " " + extra : extra);
            g.setAttribute("data-touch-scale", "1");
        } catch (e) {}
    }
}

function initBodyMapQuestion(qIdx, qId) {
    var wrap = document.getElementById(qId + "_wrap");
    var host = document.getElementById(qId + "_svg");
    var listEl = document.getElementById(qId + "_list");
    var noneBtn = document.getElementById(qId + "_none");
    if (!wrap || !host) return;

    var qText = typeof getQuestionTextByIndex === "function" ? getQuestionTextByIndex(qIdx) : "";
    var svgUrl = "corpo/body-interactive.svg";

    fetch(svgUrl)
        .then(function (r) {
            if (!r.ok) throw new Error("svg");
            return r.text();
        })
        .then(function (svgText) {
            host.innerHTML = svgText;
            host.classList.remove("body-map-svg-host--loading");
            var svg = host.querySelector("svg");
            if (svg) {
                svg.classList.add("body-map-svg");
                svg.removeAttribute("id");
            }

            function wireBodyMap() {
                if (!svg) return;
                applyMuscleTouchScale(svg);

                var muscles = host.querySelectorAll("g.muscle");
                var selected = new Set();

                function applyClassForPart(part, on) {
                    for (var i = 0; i < muscles.length; i++) {
                        if ((muscles[i].getAttribute("data-part") || "") === part) {
                            muscles[i].classList.toggle("selected", on);
                        }
                    }
                }

                function syncFromSet() {
                    var serial = serializeBodyMapSelection(selected);
                    if (qText && typeof state !== "undefined" && state.tempAnswers) {
                        state.tempAnswers[qText] = serial;
                    }
                    bodyMapUpdateListEl(listEl, Array.from(selected));
                }

                function restoreFromStored(val) {
                    selected.clear();
                    for (var i = 0; i < muscles.length; i++) {
                        muscles[i].classList.remove("selected");
                    }
                    if (val == null || val === "") {
                        bodyMapUpdateListEl(listEl, []);
                        return;
                    }
                    var v = String(val).trim();
                    if (/^nenhuma$/i.test(v)) {
                        bodyMapUpdateListEl(listEl, []);
                        return;
                    }
                    var parts = parsePontosDorMuscularValue(v);
                    parts.forEach(function (p) {
                        selected.add(p);
                        applyClassForPart(p, true);
                    });
                    syncFromSet();
                }

                for (var j = 0; j < muscles.length; j++) {
                    muscles[j].addEventListener("click", function (e) {
                        e.preventDefault();
                        var g = e.currentTarget;
                        var part = g.getAttribute("data-part");
                        if (!part) return;
                        if (selected.has(part)) {
                            selected.delete(part);
                            applyClassForPart(part, false);
                        } else {
                            selected.add(part);
                            applyClassForPart(part, true);
                        }
                        syncFromSet();
                    });
                }

                if (noneBtn) {
                    noneBtn.addEventListener("click", function () {
                        selected.clear();
                        for (var k = 0; k < muscles.length; k++) {
                            muscles[k].classList.remove("selected");
                        }
                        if (qText && typeof state !== "undefined" && state.tempAnswers) {
                            state.tempAnswers[qText] = "Nenhuma";
                        }
                        bodyMapUpdateListEl(listEl, []);
                    });
                }

                var existing = qText && typeof state !== "undefined" && state.tempAnswers
                    ? state.tempAnswers[qText]
                    : "";
                restoreFromStored(existing);
            }

            requestAnimationFrame(function () {
                requestAnimationFrame(wireBodyMap);
            });
        })
        .catch(function () {
            host.classList.remove("body-map-svg-host--loading");
            host.innerHTML = "<p class=\"body-map-err\">Não foi possível carregar o mapa corporal.</p>";
        });
}
