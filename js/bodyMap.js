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
var BODY_MAP_MID_X = 375;

/** frente = só vista anterior; costas = só posterior; both = aparece nas duas colunas. */
var PART_VIEW_OVERRIDE = {
    Peitoral: "front",
    Abdômen: "front",
    "Pé ": "front",
    Quadríceps: "front",
    Bíceps: "front",
    Serrátil: "front",
    Adutor: "front",
    Calcanhar: "back",
    Glúteo: "back",
    Lombar: "back",
    Posterior: "back",
    Latíssimo: "back",
    Trapézio: "back",
    Tríceps: "back",
    Quadril: "back"
};

function findMuscleGroupByPart(svg, partName) {
    var all = svg.querySelectorAll("g.muscle");
    for (var i = 0; i < all.length; i++) {
        if ((all[i].getAttribute("data-part") || "") === partName) return all[i];
    }
    return null;
}

function resolvePartSides(partName, g) {
    if (!g) return { front: false, back: false };
    var keys = Object.keys(PART_VIEW_OVERRIDE);
    for (var k = 0; k < keys.length; k++) {
        var prefix = keys[k];
        if (partName.indexOf(prefix) === 0) {
            var v = PART_VIEW_OVERRIDE[prefix];
            if (v === "front") return { front: true, back: false };
            if (v === "back") return { front: false, back: true };
        }
    }
    try {
        var b = g.getBBox();
        var crosses = b.x < 368 && b.x + b.width > 382;
        if (crosses) return { front: true, back: true };
        var cx = b.x + b.width / 2;
        return cx < BODY_MAP_MID_X ? { front: true, back: false } : { front: false, back: true };
    } catch (e) {
        return { front: true, back: true };
    }
}

function buildPartButton(partName) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "body-map-part-btn";
    btn.setAttribute("data-part", partName);
    btn.setAttribute("aria-pressed", "false");
    btn.textContent = partName;
    return btn;
}

/** Separador gravado no Sheets / estado — nomes têm espaços ("Ombro direito"); não usar espaço como delimitador. */
var BODY_MAP_ANSWER_SEP = "; ";

function legacyParseMuscularTokens(t) {
    var compact = t.replace(/\s/g, "");
    if (/^[A-Za-z]+$/.test(compact) && compact.length <= 26) {
        return compact.toUpperCase().split("");
    }
    return t.split(/[;,]/).map(function (x) { return x.trim(); }).filter(Boolean);
}

function bodyMapPartNamesSet() {
    var o = {};
    for (var i = 0; i < BODY_MAP_PART_NAMES.length; i++) {
        o[BODY_MAP_PART_NAMES[i]] = true;
    }
    return o;
}

function parsePontosDorMuscularDelimited(t) {
    var known = bodyMapPartNamesSet();
    var chunks = t.split(/\s*[;,]\s*/).map(function (x) { return x.trim(); }).filter(Boolean);
    var out = [];
    for (var c = 0; c < chunks.length; c++) {
        if (known[chunks[c]]) {
            out.push(chunks[c]);
        }
    }
    return out;
}

function parsePontosDorMuscularGreedySpaces(t) {
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

function dedupePartList(arr) {
    var seen = {};
    var out = [];
    for (var i = 0; i < arr.length; i++) {
        var x = arr[i];
        if (seen[x]) continue;
        seen[x] = true;
        out.push(x);
    }
    return out;
}

function parsePontosDorMuscularValue(str) {
    if (str == null) return [];
    var t = String(str).trim();
    if (!t || /^sem dor$/i.test(t) || /^nenhuma$/i.test(t)) return [];
    var parsed;
    if (/[;,]/.test(t)) {
        parsed = parsePontosDorMuscularDelimited(t);
        if (parsed.length) return dedupePartList(parsed);
    }
    parsed = parsePontosDorMuscularGreedySpaces(t);
    return dedupePartList(parsed);
}

function serializeBodyMapSelection(selectedSet) {
    return Array.from(selectedSet).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); }).join(BODY_MAP_ANSWER_SEP);
}

function bodyMapUpdateListEl(listEl, names) {
    if (!listEl) return;
    if (!names.length) {
        listEl.textContent = "Nenhuma região selecionada";
        return;
    }
    listEl.textContent = names.sort(function (a, b) { return a.localeCompare(b, "pt-BR"); }).join(BODY_MAP_ANSWER_SEP);
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

            var frontItems = [];
            var backItems = [];
            for (var pi = 0; pi < BODY_MAP_PART_NAMES.length; pi++) {
                var nm = BODY_MAP_PART_NAMES[pi];
                var g = findMuscleGroupByPart(orig, nm);
                if (!g) continue;
                var sides = resolvePartSides(nm, g);
                var b;
                try {
                    b = g.getBBox();
                } catch (e) {
                    continue;
                }
                var cy = b.y + b.height / 2;
                if (sides.front) frontItems.push({ name: nm, cy: cy });
                if (sides.back) backItems.push({ name: nm, cy: cy });
            }
            frontItems.sort(function (a, b) { return a.cy - b.cy; });
            backItems.sort(function (a, b) { return a.cy - b.cy; });

            function cloneHalfView(viewBoxAttr) {
                var s = orig.cloneNode(true);
                s.setAttribute("viewBox", viewBoxAttr);
                s.setAttribute("preserveAspectRatio", "xMidYMid meet");
                s.removeAttribute("width");
                s.removeAttribute("height");
                s.classList.add("body-map-svg");
                return s;
            }

            function makeViewBlock(title, svgEl, items) {
                var block = document.createElement("div");
                block.className = "body-map-view-block";
                var lab = document.createElement("div");
                lab.className = "body-map-view-label";
                lab.textContent = title;
                var row = document.createElement("div");
                row.className = "body-map-svg-row";
                var slot = document.createElement("div");
                slot.className = "body-map-svg-slot";
                slot.appendChild(svgEl);
                var btnCol = document.createElement("div");
                btnCol.className = "body-map-btn-col";
                for (var i = 0; i < items.length; i++) {
                    btnCol.appendChild(buildPartButton(items[i].name));
                }
                row.appendChild(slot);
                row.appendChild(btnCol);
                block.appendChild(lab);
                block.appendChild(row);
                return block;
            }

            var svgF = cloneHalfView("0 0 375 610");
            var svgB = cloneHalfView("375 0 375 610");

            var stack = document.createElement("div");
            stack.className = "body-map-body-stack";
            stack.appendChild(makeViewBlock("Frente", svgF, frontItems));
            stack.appendChild(makeViewBlock("Costas", svgB, backItems));

            var main = document.createElement("div");
            main.className = "body-map-main";
            main.appendChild(stack);

            host.innerHTML = "";
            host.appendChild(main);

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
                        togglePart(e.currentTarget.getAttribute("data-part"));
                    });
                }

                host.addEventListener("click", function (e) {
                    var t = e.target.closest(".body-map-part-btn");
                    if (!t || !host.contains(t)) return;
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
