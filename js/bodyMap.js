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

/** Regiões com painel de zoom lateral (clone ampliado + nome). Ordem = ordem na coluna. */
var BODY_MAP_ZOOM_PARTS = [
    "Calcanhar esquerdo", "Pulso esquerdo", "Pé esquerdo", "Mão esquerda",
    "Calcanhar direito", "Pulso direito", "Pé direito", "Mão direita"
];

var BODY_MAP_SVG_W = 750;
var BODY_MAP_SVG_H = 610;

function bodyMapZoomColumn(partName) {
    if (/esquerdo|esquerda/i.test(partName)) return "left";
    if (/direito|direita/i.test(partName)) return "right";
    return null;
}

/** Mini-SVG com viewBox apertado na região (mesmas coordenadas do desenho original). */
function buildZoomMiniSvg(sourceGroup) {
    var NS = "http://www.w3.org/2000/svg";
    var b;
    try {
        b = sourceGroup.getBBox();
    } catch (e) {
        return null;
    }
    if (!isFinite(b.width) || !isFinite(b.height) || b.width < 0.5 || b.height < 0.5) return null;
    var pad = Math.max(10, Math.max(b.width, b.height) * 0.42);
    var vx = Math.max(0, b.x - pad);
    var vy = Math.max(0, b.y - pad);
    var vw = Math.min(BODY_MAP_SVG_W - vx, b.width + 2 * pad);
    var vh = Math.min(BODY_MAP_SVG_H - vy, b.height + 2 * pad);
    if (vw < 4 || vh < 4) return null;
    var mini = document.createElementNS(NS, "svg");
    mini.setAttribute("viewBox", vx + " " + vy + " " + vw + " " + vh);
    mini.setAttribute("preserveAspectRatio", "xMidYMid meet");
    mini.classList.add("body-map-zoom-svg");
    mini.appendChild(sourceGroup.cloneNode(true));
    return mini;
}

function findMuscleGroupByPart(svg, partName) {
    var all = svg.querySelectorAll("g.muscle");
    for (var i = 0; i < all.length; i++) {
        if ((all[i].getAttribute("data-part") || "") === partName) return all[i];
    }
    return null;
}

function populateBodyMapZoomColumns(mainSvg, colLeft, colRight) {
    var items = [];
    for (var p = 0; p < BODY_MAP_ZOOM_PARTS.length; p++) {
        var partName = BODY_MAP_ZOOM_PARTS[p];
        var col = bodyMapZoomColumn(partName);
        if (!col) continue;
        var g = findMuscleGroupByPart(mainSvg, partName);
        if (!g) continue;
        var b;
        try {
            b = g.getBBox();
        } catch (e) {
            continue;
        }
        items.push({ partName: partName, col: col, y: b.y + b.height / 2 });
    }
    function appendSortedCol(colName, targetCol) {
        var sub = items.filter(function (x) { return x.col === colName; });
        sub.sort(function (a, b) { return a.y - b.y; });
        for (var j = 0; j < sub.length; j++) {
            var it = sub[j];
            var src = findMuscleGroupByPart(mainSvg, it.partName);
            if (!src) continue;
            var mini = buildZoomMiniSvg(src);
            if (!mini) continue;
            var card = document.createElement("div");
            card.className = "body-map-zoom-card";
            var lab = document.createElement("div");
            lab.className = "body-map-zoom-card-label";
            lab.textContent = it.partName;
            card.appendChild(lab);
            card.appendChild(mini);
            targetCol.appendChild(card);
        }
    }
    appendSortedCol("left", colLeft);
    appendSortedCol("right", colRight);
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

            var layout = document.createElement("div");
            layout.className = "body-map-layout";
            var colLeft = document.createElement("div");
            colLeft.className = "body-map-zoom-col body-map-zoom-col--left";
            var main = document.createElement("div");
            main.className = "body-map-main";
            var colRight = document.createElement("div");
            colRight.className = "body-map-zoom-col body-map-zoom-col--right";

            host.innerHTML = "";
            main.appendChild(orig);
            layout.appendChild(colLeft);
            layout.appendChild(main);
            layout.appendChild(colRight);
            host.appendChild(layout);

            function wireBodyMap() {
                populateBodyMapZoomColumns(orig, colLeft, colRight);

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
