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

var BODY_MAP_SVG_W = 750;
var BODY_MAP_SVG_H = 610;

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
            var orig = host.querySelector("svg");
            if (!orig) {
                host.innerHTML = "<p class=\"body-map-err\">Mapa corporal inválido.</p>";
                return;
            }
            orig.classList.add("body-map-svg");
            orig.removeAttribute("id");
            orig.setAttribute("viewBox", "0 0 " + BODY_MAP_SVG_W + " " + BODY_MAP_SVG_H);
            orig.setAttribute("preserveAspectRatio", "xMidYMid meet");
            orig.removeAttribute("width");
            orig.removeAttribute("height");

            function cloneHalfView(viewBoxAttr) {
                var s = orig.cloneNode(true);
                s.setAttribute("viewBox", viewBoxAttr);
                s.setAttribute("preserveAspectRatio", "xMidYMid meet");
                s.removeAttribute("width");
                s.removeAttribute("height");
                s.classList.add("body-map-svg");
                return s;
            }

            var layout = document.createElement("div");
            layout.className = "body-map-layout";
            var main = document.createElement("div");
            main.className = "body-map-main";
            var stack = document.createElement("div");
            stack.className = "body-map-body-stack";

            var labF = document.createElement("div");
            labF.className = "body-map-view-label";
            labF.textContent = "Frente";
            var svgF = cloneHalfView("0 0 375 610");
            var labB = document.createElement("div");
            labB.className = "body-map-view-label";
            labB.textContent = "Costas";
            var svgB = cloneHalfView("375 0 375 610");

            stack.appendChild(labF);
            stack.appendChild(svgF);
            stack.appendChild(labB);
            stack.appendChild(svgB);
            main.appendChild(stack);

            var partsPanel = document.createElement("div");
            partsPanel.className = "body-map-parts-panel";
            partsPanel.setAttribute("role", "group");
            partsPanel.setAttribute("aria-label", "Regiões do corpo (toque para marcar)");

            for (var pi = 0; pi < BODY_MAP_PART_NAMES.length; pi++) {
                var nm = BODY_MAP_PART_NAMES[pi];
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "body-map-part-btn";
                btn.setAttribute("data-part", nm);
                btn.setAttribute("aria-pressed", "false");
                btn.textContent = nm;
                partsPanel.appendChild(btn);
            }

            host.innerHTML = "";
            layout.appendChild(main);
            layout.appendChild(partsPanel);
            host.appendChild(layout);

            function wireBodyMap() {
                var muscles = host.querySelectorAll("g.muscle");
                var partBtns = host.querySelectorAll(".body-map-part-btn");
                var selected = new Set();

                function applyClassForPart(part, on) {
                    for (var i = 0; i < muscles.length; i++) {
                        if ((muscles[i].getAttribute("data-part") || "") === part) {
                            muscles[i].classList.toggle("selected", on);
                        }
                    }
                }

                function updatePartButtons() {
                    for (var i = 0; i < partBtns.length; i++) {
                        var p = partBtns[i].getAttribute("data-part");
                        var on = selected.has(p);
                        partBtns[i].classList.toggle("selected", on);
                        partBtns[i].setAttribute("aria-pressed", on ? "true" : "false");
                    }
                }

                function syncFromSet() {
                    var serial = serializeBodyMapSelection(selected);
                    if (qText && typeof state !== "undefined" && state.tempAnswers) {
                        state.tempAnswers[qText] = serial;
                    }
                    bodyMapUpdateListEl(listEl, Array.from(selected));
                    updatePartButtons();
                }

                function togglePart(part) {
                    if (!part) return;
                    if (selected.has(part)) {
                        selected.delete(part);
                        applyClassForPart(part, false);
                    } else {
                        selected.add(part);
                        applyClassForPart(part, true);
                    }
                    syncFromSet();
                }

                function restoreFromStored(val) {
                    selected.clear();
                    for (var i = 0; i < muscles.length; i++) {
                        muscles[i].classList.remove("selected");
                    }
                    if (val == null || val === "") {
                        bodyMapUpdateListEl(listEl, []);
                        updatePartButtons();
                        return;
                    }
                    var v = String(val).trim();
                    if (/^nenhuma$/i.test(v)) {
                        bodyMapUpdateListEl(listEl, []);
                        updatePartButtons();
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
                        togglePart(part);
                    });
                }

                partsPanel.addEventListener("click", function (e) {
                    var t = e.target.closest(".body-map-part-btn");
                    if (!t || !partsPanel.contains(t)) return;
                    e.preventDefault();
                    togglePart(t.getAttribute("data-part"));
                });

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
                        updatePartButtons();
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
