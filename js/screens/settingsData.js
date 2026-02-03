/* ===========================
   🖥️ SUBTELA: CONFIGURAÇÕES - DADOS / CSV
   =========================== */

function renderSettingsData(){
    const answers = loadResponses();
    // breve resumo
    let resumoHTML = "";
    if(!answers.length){
        resumoHTML = `<div class="item-sub">Ainda não há respostas registradas.</div>`;
    }else{
        resumoHTML = answers.slice().reverse().slice(0,5).map(r=>{
            return `
                <div class="item-row">
                    <div class="item-main">
                        <div class="item-title">
                            ${r.playerName} • ${r.mode==="pre"?"Pré":"Pós"}
                        </div>
                        <div class="item-sub">
                            ${r.timestamp}<br/>
                            ${Object.keys(r.answers).length} respostas coletadas
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    return `
        <div style="display:flex;flex-direction:column;gap:1rem;">
            <div class="item-title" style="margin-bottom:.5rem;">Sincronizar com Google Sheets</div>
            <div class="item-sub" style="margin-bottom:.5rem;">
                O Sheets só é atualizado quando você clica em "Sincronizar agora" ou "Finalizar treino e sincronizar" na tela do treino.
            </div>
            <button class="small-solid-btn" type="button" onclick="syncAllToSheets().then(function(){ alert('Planilha atualizada.'); }).catch(function(e){ alert('Erro: ' + (e && e.message ? e.message : e)); });" style="margin-bottom:1rem;">
                Sincronizar agora
            </button>

            <div class="item-title" style="margin-bottom:.5rem;">Limpar treinos</div>
            <div class="item-sub" style="margin-bottom:.5rem;">
                Apaga todos os treinos e respostas no app e na planilha (Sheets). Use para recomeçar e recriar as abas pre/pos corretamente.
            </div>
            <button class="small-solid-btn" type="button" onclick="confirmClearTrainingsAndResponses()" style="background:var(--card-stroke);color:var(--text-dim);">
                Limpar treinos e respostas
            </button>
            <div id="clearTrainingsFeedback" style="font-size:0.875rem;color:var(--text-dim);margin-top:0.25rem;display:none;"></div>

            <div class="item-title" style="margin-bottom:.5rem;margin-top:1.5rem;">Exportar CSV</div>
            <div class="item-sub" style="margin-bottom:.5rem;">
                O CSV segue o modelo do Sheet: 1ª pergunta pré = Qualidade Total de Recuperação, etc.
            </div>
            <div class="inline-form-row" style="align-items:center;">
                <div class="item-sub" style="flex:1;min-width:200px;">
                    Baixe todas as respostas (pré e pós) em .csv para análise ou importação no Sheets.
                </div>
                <button class="download-btn" onclick="downloadCSV()">
                    Baixar CSV
                </button>
            </div>

            <div class="item-title" style="margin-bottom:.5rem;margin-top:1.5rem;">Perguntas (localStorage)</div>
            <div class="item-sub" style="margin-bottom:.5rem;">
                As perguntas ficam no <strong>localStorage</strong> do navegador. Cada dispositivo/navegador tem o seu. Para usar as mesmas perguntas no app do Render (ou em outro aparelho): exporte aqui, abra o app no outro lugar, importe abaixo.
            </div>
            <button class="small-solid-btn" type="button" onclick="copyCurrentQuestionsAsDefault()">
                Exportar perguntas (copiar JSON)
            </button>
            <div id="copyQuestionsFeedback" style="font-size:0.875rem;color:var(--text-dim);margin-top:0.25rem;display:none;"></div>

            <div class="item-title" style="margin-bottom:.5rem;margin-top:1rem;">Importar perguntas</div>
            <div class="item-sub" style="margin-bottom:.5rem;">
                Cole o JSON das perguntas (exportado de outro navegador ou deste) e clique em Importar.
            </div>
            <textarea id="importQuestionsJson" placeholder='Cole aqui o JSON (ex: {"pre":[...],"post":[...]})' style="width:100%;min-height:80px;padding:0.5rem;border-radius:var(--radius-md);border:2px solid rgba(255,255,255,0.2);background:#000;color:var(--text-main);font-size:0.875rem;resize:vertical;"></textarea>
            <button class="small-solid-btn" type="button" onclick="importQuestionsFromJson()">
                Importar perguntas
            </button>
            <div id="importQuestionsFeedback" style="font-size:0.875rem;margin-top:0.25rem;display:none;"></div>

            <div>
                <div class="item-title" style="margin-bottom:.5rem;">Últimas respostas</div>
                ${resumoHTML}
            </div>
        </div>
    `;
}

function confirmClearTrainingsAndResponses(){
    if (!confirm("Isso vai apagar TODOS os treinos e respostas no app e na planilha (Sheets). Tem certeza?")) return;
    clearTrainingsAndResponses();
    var el = document.getElementById("clearTrainingsFeedback");
    if (el) { el.style.display = "block"; el.textContent = "Treinos e respostas apagados. Planilha está sendo atualizada."; el.style.color = "var(--accent)"; }
    setTimeout(function(){ if (el) { el.style.display = "none"; } }, 5000);
    setTimeout(function(){ renderSettingsData(); renderSettings(); }, 1500);
}

function copyCurrentQuestionsAsDefault(){
    const qs = loadQuestions();
    const json = JSON.stringify(qs, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(json).then(function(){
            var el = document.getElementById("copyQuestionsFeedback");
            if (el) { el.style.display = "block"; el.textContent = "Copiado. Abra o app no Render (ou outro navegador), vá em Configurações > Dados e importe abaixo."; el.style.color = "var(--accent)"; }
            setTimeout(function(){ if (el) { el.style.display = "none"; } }, 3000);
        }).catch(function(){
            fallbackCopy(json);
        });
    } else {
        fallbackCopy(json);
    }
}
function fallbackCopy(text){
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand("copy");
        var el = document.getElementById("copyQuestionsFeedback");
        if (el) { el.style.display = "block"; el.textContent = "Copiado. Cole na tela de Importar no outro navegador (ex.: no Render)."; }
    } catch(e) {}
    document.body.removeChild(ta);
}

function importQuestionsFromJson(){
    var elInput = document.getElementById("importQuestionsJson");
    var elFeedback = document.getElementById("importQuestionsFeedback");
    if (!elInput || !elFeedback) return;
    var raw = (elInput.value || "").trim();
    if (!raw) {
        elFeedback.style.display = "block";
        elFeedback.style.color = "rgba(239,68,68,.9)";
        elFeedback.textContent = "Cole o JSON das perguntas no campo acima.";
        setTimeout(function(){ elFeedback.style.display = "none"; }, 4000);
        return;
    }
    try {
        var data = JSON.parse(raw);
        if (!data || typeof data !== "object") throw new Error("JSON inválido");
        var pre = Array.isArray(data.pre) ? data.pre : [];
        var post = Array.isArray(data.post) ? data.post : [];
        saveQuestions({ pre: pre, post: post });
        elFeedback.style.display = "block";
        elFeedback.style.color = "var(--accent)";
        elFeedback.textContent = "Perguntas importadas (" + pre.length + " pré, " + post.length + " pós). Recarregue a tela de perguntas se precisar.";
        elInput.value = "";
        setTimeout(function(){ elFeedback.style.display = "none"; }, 5000);
    } catch (e) {
        elFeedback.style.display = "block";
        elFeedback.style.color = "rgba(239,68,68,.9)";
        elFeedback.textContent = "Erro: " + (e && e.message ? e.message : "JSON inválido. Verifique o texto colado.");
    }
}
