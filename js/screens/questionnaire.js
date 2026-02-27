/* ===========================
   🖥️ TELA: QUESTIONÁRIO
   =========================== */

function goQuestionnaire(){
    state.currentScreen = "questionnaire";

    const mode = state.currentMode;
    const player = getPlayerById(state.currentPlayerId);
    const allQuestions = loadQuestions();
    const qsList = mode==="pre" ? allQuestions.pre : allQuestions.post;
    // Guardar textos na ordem exata usada na tela (evita discrepância com localStorage no clique)
    state.currentQuestionTexts = qsList.map(function(q){
        return typeof q === "string" ? q : (q && q.texto ? q.texto : "");
    });
    
    // Sem botão voltar: jogador não pode sair até terminar o questionário

    // montar inputs baseado no tipo de pergunta
    const qItemsHTML = qsList.map((qObj,idx)=>{
        const q = typeof qObj === 'string' ? {tipo:"texto",texto:qObj,opcoes:[],imagem:null} : qObj;
        const qText = q.texto || qObj;
        const safeId = "q_"+idx;
        const qId = "qid_"+idx;
        
        let inputHTML = "";
        if(q.tipo === "texto"){
            inputHTML = `<textarea class="q-input" rows="3" id="${safeId}" oninput="captureAnswerByIndex(${idx}, this.value)" placeholder="Digite aqui..." required></textarea>`;
        }else if(q.tipo === "nota"){
            const notaMin = q.notaMin != null ? q.notaMin : 0;
            const notaMax = q.notaMax != null ? q.notaMax : 10;
            let scale = Array.from({length: notaMax - notaMin + 1}, (_, i) => notaMin + i);
            if (notaMin === 1 && notaMax === 5) scale = scale.reverse();
            inputHTML = `<div class="rating-scale" id="${qId}">
                ${scale.map(n=>
                    `<button type="button" class="rating-btn" onclick="selectRatingByIndex(${idx}, ${n}, '${qId}')">${n}</button>`
                ).join("")}
            </div>`;
        }else if(q.tipo === "escolha"){
            if(q.opcoes && q.opcoes.length > 0){
                inputHTML = `<div id="${qId}">
                    ${q.opcoes.map((opt,optIdx)=>
                        `<label class="radio-option">
                            <input type="radio" name="${safeId}" value="${opt}" onchange="captureAnswerByIndex(${idx}, this.value)" required>
                            <span>${opt}</span>
                        </label>`
                    ).join("")}
                </div>`;
            }else{
                inputHTML = `<div class="item-sub">Nenhuma opção configurada</div>`;
            }
        }else if(q.tipo === "checkbox"){
            if(q.opcoes && q.opcoes.length > 0){
                inputHTML = `<div class="rating-scale choice-buttons-multi" id="${qId}">
                    ${q.opcoes.map((opt)=>{
                        const optEsc = (opt+"").replace(/"/g, "&quot;");
                        return `<button type="button" class="rating-btn choice-btn-multi" data-value="${optEsc}" onclick="toggleCheckboxByIndex(${idx}, this.getAttribute('data-value'), '${qId}')">${opt}</button>`;
                    }).join("")}
                </div>`;
            }else{
                inputHTML = `<div class="item-sub">Nenhuma opção configurada</div>`;
            }
        }else if(q.tipo === "duracao"){
            const hours = Array.from({length: 5}, (_, i) => i);
            const minutes = Array.from({length: 12}, (_, i) => i * 5);
            inputHTML = `<div class="duracao-input" id="${qId}" data-question-idx="${idx}">
                <select class="duracao-select duracao-h" id="${safeId}_h" onchange="captureDuracaoByIndex(${idx})" required aria-label="Horas">
                    <option value="">h</option>
                    ${hours.map(h=>`<option value="${h}">${h}</option>`).join("")}
                </select>
                <span class="duracao-sep">h</span>
                <select class="duracao-select duracao-m" id="${safeId}_m" onchange="captureDuracaoByIndex(${idx})" required aria-label="Minutos">
                    <option value="">min</option>
                    ${minutes.map(m=>`<option value="${m}">${m}</option>`).join("")}
                </select>
                <span class="duracao-sep">min</span>
            </div>`;
        }
        
        const imgSrc = q.imagem ? (q.imagem + "?v=" + (window.__IMAGE_VERSION != null ? window.__IMAGE_VERSION : Date.now())) : "";
        const imageHTML = imgSrc ? `<img src="${imgSrc}" alt="Imagem da pergunta" class="q-image">` : "";
        const qTextEscaped = (qText || "").replace(/"/g, "&quot;");
        return `
        <div class="q-item" data-question-index="${idx}" data-question-text="${qTextEscaped}">
            <div class="q-text">${qText} <span style="color:var(--pre-color);">*</span></div>
            ${imageHTML}
            ${inputHTML}
        </div>`;
    }).join("");

    renderScreen(`
        <div class="questionnaire-wrapper">
            <div class="back-row">
                <div style="flex:1;min-width:0;">
                    <div class="screen-title">
                        ${mode==="pre" ? "Questionário Pré Treino" : "Questionário Pós Treino"}
                    </div>
                    <div class="screen-sub">
                        Todas as perguntas são obrigatórias. Responda com sinceridade.
                    </div>
                </div>
                <button type="button" class="small-solid-btn" onclick="exitQuestionnaireWithPassword()" style="flex-shrink:0;background:rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.3);color:var(--text-dim);font-size:0.875rem;">
                    Sair (senha)
                </button>
            </div>

            <div class="q-list">
                ${qItemsHTML}
            </div>

            <button class="submit-btn" id="submitAnswersBtn"
                onclick="submitAnswers()">
                Enviar Respostas
            </button>
        </div>
    `);

    window.scrollTo(0, 0);
    const qList = document.querySelector(".q-list");
    if (qList) qList.scrollTop = 0;

    applyTempAnswersToDOM();
    if (typeof saveResumeState === "function") saveResumeState();
    updateSettingsButtonVisibility();
}

function applyTempAnswersToDOM(){
    if (!state.currentQuestionTexts || !state.tempAnswers) return;
    var items = document.querySelectorAll(".q-item");
    for (var i = 0; i < items.length; i++) {
        var qText = state.currentQuestionTexts[i];
        if (!qText) continue;
        var val = state.tempAnswers[qText];
        if (val === undefined || val === null) continue;
        var item = items[i];
        var textarea = item.querySelector("textarea.q-input");
        if (textarea) {
            textarea.value = Array.isArray(val) ? val.join(", ") : String(val);
            continue;
        }
        var scale = item.querySelector(".rating-scale");
        if (scale && !scale.classList.contains("choice-buttons-multi")) {
            var valueStr = Array.isArray(val) ? (val[0] != null ? String(val[0]) : "") : String(val);
            scale.querySelectorAll(".rating-btn").forEach(function(btn){
                btn.classList.toggle("selected", (btn.textContent || "").trim() === valueStr);
            });
            continue;
        }
        if (scale && scale.classList.contains("choice-buttons-multi")) {
            var arr = Array.isArray(val) ? val : (val ? [val] : []);
            scale.querySelectorAll(".rating-btn").forEach(function(btn){
                var v = btn.getAttribute("data-value");
                btn.classList.toggle("selected", arr.indexOf(v) !== -1);
            });
            continue;
        }
        var radios = item.querySelectorAll('input[type="radio"]');
        if (radios.length) {
            var radioVal = Array.isArray(val) ? (val[0] != null ? String(val[0]) : "") : String(val);
            radios.forEach(function(r){ r.checked = (r.value === radioVal); });
            continue;
        }
        var duracaoWrap = item.querySelector(".duracao-input");
        if (duracaoWrap) {
            var str = Array.isArray(val) ? (val[0] != null ? String(val[0]) : "") : String(val);
            var match = str.match(/^(\d+)h\s*(\d+)min$/);
            if (match) {
                var selH = duracaoWrap.querySelector(".duracao-h");
                var selM = duracaoWrap.querySelector(".duracao-m");
                if (selH) selH.value = match[1];
                if (selM) selM.value = match[2];
            }
        }
    }
}

/** Retorna o texto da pergunta pelo índice. Usa a lista gravada ao abrir o questionário (state.currentQuestionTexts) para não depender de loadQuestions() no clique. */
function getQuestionTextByIndex(idx){
    if (state.currentQuestionTexts && Array.isArray(state.currentQuestionTexts) && state.currentQuestionTexts[idx] !== undefined) {
        return state.currentQuestionTexts[idx];
    }
    var qs = typeof loadQuestions === "function" ? loadQuestions() : { pre: [], post: [] };
    var list = state.currentMode === "pre" ? qs.pre : qs.post;
    var q = list[idx];
    if (typeof q === "string") return q;
    return (q && q.texto) ? q.texto : "";
}

function captureAnswer(qText, val){
    state.tempAnswers[qText] = val;
}
function captureAnswerByIndex(idx, val){
    var qText = getQuestionTextByIndex(idx);
    if (qText) state.tempAnswers[qText] = val;
}

/** Lê os selects de duração (horas e minutos) do item da pergunta pelo índice e grava em state.tempAnswers no formato "Xh Ymin". */
function captureDuracaoByIndex(idx){
    var qText = getQuestionTextByIndex(idx);
    if (!qText) return;
    var item = document.querySelector(".q-item[data-question-index=\"" + idx + "\"]");
    if (!item) return;
    var selH = item.querySelector(".duracao-h");
    var selM = item.querySelector(".duracao-m");
    var h = selH && selH.value !== "" ? parseInt(selH.value, 10) : null;
    var m = selM && selM.value !== "" ? parseInt(selM.value, 10) : null;
    if (h != null && m != null) state.tempAnswers[qText] = h + "h " + m + "min";
    else if (h != null) state.tempAnswers[qText] = h + "h 0min";
    else if (m != null) state.tempAnswers[qText] = "0h " + m + "min";
    else state.tempAnswers[qText] = "";
}

function selectRating(qText, value, containerId){
    state.tempAnswers[qText] = value.toString();
    var container = document.getElementById(containerId);
    if(container){
        var buttons = container.querySelectorAll('.rating-btn');
        var valueStr = String(value);
        buttons.forEach(function(btn){
            btn.classList.toggle('selected', (btn.textContent || '').trim() === valueStr);
        });
    }
}
function selectRatingByIndex(idx, value, containerId){
    var qText = getQuestionTextByIndex(idx);
    if (qText) state.tempAnswers[qText] = value.toString();
    var container = document.getElementById(containerId);
    if(container){
        var buttons = container.querySelectorAll('.rating-btn');
        var valueStr = String(value);
        buttons.forEach(function(btn){
            btn.classList.toggle('selected', (btn.textContent || '').trim() === valueStr);
        });
    }
}

function captureCheckboxAnswer(qText, value, checked){
    if(!state.tempAnswers[qText]) state.tempAnswers[qText] = [];
    if(!Array.isArray(state.tempAnswers[qText])) state.tempAnswers[qText] = [];
    if(checked){
        if(!state.tempAnswers[qText].includes(value)) state.tempAnswers[qText].push(value);
    }else{
        state.tempAnswers[qText] = state.tempAnswers[qText].filter(function(v){ return v !== value; });
    }
}
function captureCheckboxAnswerByIndex(idx, value, checked){
    var qText = getQuestionTextByIndex(idx);
    if (qText) captureCheckboxAnswer(qText, value, checked);
}

/** Alterna uma opção nas perguntas de múltipla escolha (botões quadrados). */
function toggleCheckboxByIndex(idx, value, containerId){
    if (value == null) return;
    var qText = getQuestionTextByIndex(idx);
    if (!qText) return;
    if (!state.tempAnswers[qText]) state.tempAnswers[qText] = [];
    if (!Array.isArray(state.tempAnswers[qText])) state.tempAnswers[qText] = [];
    var arr = state.tempAnswers[qText];
    if (arr.includes(value)) {
        state.tempAnswers[qText] = arr.filter(function(v){ return v !== value; });
    } else {
        state.tempAnswers[qText] = arr.slice();
        state.tempAnswers[qText].push(value);
    }
    var container = document.getElementById(containerId);
    if (container) {
        var btns = container.querySelectorAll(".rating-btn");
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].getAttribute("data-value") === value) {
                btns[i].classList.toggle("selected", state.tempAnswers[qText].includes(value));
                break;
            }
        }
    }
}

/** Lê todas as respostas do formulário no DOM e preenche state.tempAnswers. Usa índice como fonte da chave (state.currentQuestionTexts[i]) para garantir mesma chave que o backend no Sheets. */
function collectAnswersFromDOM(){
    var items = document.querySelectorAll(".q-item");
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        // Chave sempre pela lista de perguntas (mesma que loadQuestions / backend)
        var qText = state.currentQuestionTexts && state.currentQuestionTexts[i];
        if (!qText) {
            qText = item.getAttribute("data-question-text");
            if (qText) qText = qText.replace(/&quot;/g, '"').trim();
            if (!qText) {
                var textDiv = item.querySelector(".q-text");
                if (textDiv) qText = (textDiv.textContent || "").replace(/\s*\*\s*$/, "").trim();
            }
        }
        if (!qText) continue;
        var val = "";
        var textarea = item.querySelector("textarea.q-input");
        if (textarea) {
            val = (textarea.value || "").trim();
        } else {
            var scale = item.querySelector(".rating-scale");
            if (scale) {
                if (scale.classList.contains("choice-buttons-multi")) {
                    var selectedBtns = scale.querySelectorAll(".rating-btn.selected");
                    val = Array.prototype.slice.call(selectedBtns).map(function(b){ return b.getAttribute("data-value") || b.textContent.trim(); });
                } else {
                    var sel = scale.querySelector(".rating-btn.selected");
                    val = sel ? (sel.textContent || "").trim() : "";
                }
            } else {
                var duracaoWrap = item.querySelector(".duracao-input");
                if (duracaoWrap) {
                    var selH = duracaoWrap.querySelector(".duracao-h");
                    var selM = duracaoWrap.querySelector(".duracao-m");
                    var h = selH && selH.value !== "" ? parseInt(selH.value, 10) : null;
                    var m = selM && selM.value !== "" ? parseInt(selM.value, 10) : null;
                    if (h != null && m != null) val = h + "h " + m + "min";
                    else if (h != null) val = h + "h 0min";
                    else if (m != null) val = "0h " + m + "min";
                    else val = "";
                } else {
                    var radio = item.querySelector('input[type="radio"]:checked');
                    if (radio) val = radio.value || "";
                    else {
                        var checks = item.querySelectorAll('input[type="checkbox"]:checked');
                        val = Array.prototype.slice.call(checks).map(function(c){ return c.value; });
                    }
                }
            }
        }
        state.tempAnswers[qText] = val;
    }
}

function submitAnswers(){
    var mode = state.currentMode;
    var allQuestions = loadQuestions();
    var qsList = mode === "pre" ? allQuestions.pre : allQuestions.post;

    // Coletar todas as respostas do DOM (chave = data-question-text de cada .q-item)
    collectAnswersFromDOM();

    var missing = [];
    for (var i = 0; i < qsList.length; i++) {
        var qObj = qsList[i];
        var q = typeof qObj === "string" ? { tipo: "texto", texto: qObj, opcoes: [], imagem: null } : qObj;
        var qText = q.texto || qObj;
        var answer = state.tempAnswers[qText];
        var isEmpty = !answer || (Array.isArray(answer) ? answer.length === 0 : answer.toString().trim() === "");
        if (isEmpty) missing.push(qText);
    }
    if (missing.length > 0) {
        alert("Responda todas as perguntas antes de enviar. Faltam " + missing.length + " pergunta(s).");
        return;
    }

    var btn = document.getElementById("submitAnswersBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }

    finalizeQuestionnaireAndSave();
}

var QUESTIONNAIRE_EXIT_PASSWORD = "362514";
function exitQuestionnaireWithPassword() {
    var value = prompt("Digite a senha para sair do questionário:");
    if (value === null) return;
    if ((value || "").trim() !== QUESTIONNAIRE_EXIT_PASSWORD) {
        alert("Senha incorreta.");
        return;
    }
    if (typeof clearResumeState === "function") clearResumeState();
    if (state.cameFromScreen === "trainingDetails" && state.currentTrainingId) {
        if (typeof viewTrainingDetails === "function") viewTrainingDetails(state.currentTrainingId);
    } else if (state.cameFromScreen === "selectPlayer" && state.currentMode) {
        if (typeof goSelectPlayer === "function") goSelectPlayer(state.currentMode);
    } else {
        if (typeof goHome === "function") goHome();
    }
}
