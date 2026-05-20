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

/** Rótulos para exportação legível (Sheets / CSV) — articular 1–9, muscular A–Z (legado). */
var PAIN_LABEL_ARTICULAR = {
    "1": "Ombro", "2": "Cotovelo", "3": "Punho", "4": "Quadril", "5": "Joelho",
    "6": "Tornozelo", "7": "Coluna cervical", "8": "Coluna torácica", "9": "Coluna lombar"
};
var PAIN_LABEL_MUSCULAR = {
    "A": "Pescoço", "B": "Trapézio", "C": "Ombro", "D": "Peitoral", "E": "Coxa ant./med.",
    "F": "Panturrilha", "G": "Abdômen", "H": "Costas", "I": "Deltoide/Ombro", "J": "Bíceps",
    "K": "Tríceps", "L": "Antebraço", "M": "Lombar", "N": "Glúteo", "O": "Adutor",
    "P": "Quadríceps", "Q": "Posterior coxa", "R": "Posterior coxa", "S": "Glúteo",
    "T": "Panturrilha", "U": "Tornozelo", "V": "Outro", "W": "Outro", "X": "Outro",
    "Y": "Outro", "Z": "Outro"
};

/** Rótulo exibido no botão (imagem articula.png: 1=Ombro … 9=Coluna lombar). */
function articularOptionDisplayLabel(opt) {
    if (opt == null || opt === "") return "";
    if (String(opt).toLowerCase() === "sem dor") return "Sem dor";
    return PAIN_LABEL_ARTICULAR[String(opt).trim()] || String(opt);
}

function parseArticularPainLabels(val) {
    if (val == null || val === "") return [];
    if (val === "Sem dor" || (typeof val === "string" && /^sem dor$/i.test(val.trim()))) return [];
    var tokens = [];
    if (Array.isArray(val)) {
        tokens = val.filter(function (v) { return v && String(v).trim() && String(v) !== "Sem dor"; });
    } else {
        var t = String(val).trim();
        if (!t) return [];
        if (/[;,|]/.test(t)) {
            tokens = t.split(/[;,|]/).map(function (x) { return x.trim(); }).filter(Boolean);
        } else if (/^[1-9]+$/.test(t.replace(/\s/g, ""))) {
            tokens = t.replace(/\s/g, "").split("");
        } else {
            tokens = [t];
        }
    }
    var labelByNameLower = {};
    Object.keys(PAIN_LABEL_ARTICULAR).forEach(function (k) {
        labelByNameLower[PAIN_LABEL_ARTICULAR[k].toLowerCase()] = PAIN_LABEL_ARTICULAR[k];
    });
    var labels = [];
    for (var i = 0; i < tokens.length; i++) {
        var p = String(tokens[i]).trim();
        if (!p) continue;
        var m = p.match(/^([1-9])\s*(?:\([^)]+\))?\s*$/);
        if (m) {
            labels.push(PAIN_LABEL_ARTICULAR[m[1]] || m[1]);
            continue;
        }
        if (PAIN_LABEL_ARTICULAR[p]) {
            labels.push(PAIN_LABEL_ARTICULAR[p]);
            continue;
        }
        var known = labelByNameLower[p.toLowerCase()];
        if (known) {
            labels.push(known);
            continue;
        }
        labels.push(p);
    }
    return dedupePartList(labels);
}

function formatArticularPainForSheets(val) {
    var labels = parseArticularPainLabels(val);
    if (!labels.length) return "";
    return labels.sort(function (a, b) { return a.localeCompare(b, "pt-BR"); }).join(BODY_MAP_ANSWER_SEP);
}

function muscularLabelLookupLower() {
    var o = {};
    Object.keys(PAIN_LABEL_MUSCULAR).forEach(function (k) {
        o[PAIN_LABEL_MUSCULAR[k].toLowerCase()] = PAIN_LABEL_MUSCULAR[k];
    });
    for (var i = 0; i < BODY_MAP_PART_NAMES.length; i++) {
        o[BODY_MAP_PART_NAMES[i].toLowerCase()] = BODY_MAP_PART_NAMES[i];
    }
    return o;
}

function formatMuscularPainForSheets(val) {
    if (val == null || val === "") return "";
    if (typeof val === "string" && /^nenhuma$/i.test(val.trim())) return "";
    var raw = Array.isArray(val) ? val.join("") : String(val).trim();
    if (!raw || /^sem dor$/i.test(raw)) return "";
    var known = muscularLabelLookupLower();
    if (known[raw.toLowerCase()]) return known[raw.toLowerCase()];
    var parts = parsePontosDorMuscularValue(raw);
    var labels = parts.map(function (p) {
        if (p.length === 1 && PAIN_LABEL_MUSCULAR[p.toUpperCase()]) {
            return PAIN_LABEL_MUSCULAR[p.toUpperCase()];
        }
        return p;
    });
    return dedupePartList(labels).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); }).join(BODY_MAP_ANSWER_SEP);
}

/** Converte códigos (1–9, A–Z) em nomes legíveis para gravar no Sheets. */
function formatPainAnswerForSheets(qText, val) {
    if (qText === "Pontos de dor articular") return formatArticularPainForSheets(val);
    if (qText === "Pontos de dor") return formatMuscularPainForSheets(val);
    if (val == null) return "";
    if (Array.isArray(val)) return val.join(BODY_MAP_ANSWER_SEP);
    return String(val);
}

function normalizePainAnswersObject(answers) {
    if (!answers || typeof answers !== "object") return answers;
    var out = Object.assign({}, answers);
    if (out["Pontos de dor"] !== undefined) {
        out["Pontos de dor"] = formatMuscularPainForSheets(out["Pontos de dor"]);
    }
    if (out["Pontos de dor articular"] !== undefined) {
        out["Pontos de dor articular"] = formatArticularPainForSheets(out["Pontos de dor articular"]);
    }
    return out;
}

function looksLikeLegacyMuscularCodes(t) {
    var compact = String(t || "").replace(/\s/g, "");
    if (!compact || compact.length > 15) return false;
    if (compact !== compact.toUpperCase() || !/^[A-Z]+$/.test(compact)) return false;
    for (var i = 0; i < compact.length; i++) {
        if (!PAIN_LABEL_MUSCULAR[compact[i]]) return false;
    }
    return true;
}

function legacyParseMuscularTokens(t) {
    if (looksLikeLegacyMuscularCodes(t)) {
        return t.replace(/\s/g, "").toUpperCase().split("");
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
