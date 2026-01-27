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
            <div class="item-title" style="margin-bottom:.5rem;">Exportar CSV</div>
            <div class="inline-form-row" style="align-items:center;">
                <div class="item-sub" style="flex:1;min-width:200px;">
                    Baixe todas as respostas (pré e pós) em .csv
                    para análise posterior.
                </div>
                <button class="download-btn" onclick="downloadCSV()">
                    Baixar CSV
                </button>
            </div>

            <div>
                <div class="item-title" style="margin-bottom:.5rem;">Últimas respostas</div>
                ${resumoHTML}
            </div>
        </div>
    `;
}
