/* ===========================
   🧠 UTILIDADES
   =========================== */

function setHeaderModeLabel(text){
    const el = document.getElementById("headerModeLabel");
    if(el) el.textContent = text;
}

function updateSettingsButtonVisibility(){
    // Botão de configurações foi removido - agora está na tela home
    // Esta função é mantida para compatibilidade mas não faz nada
}

function uid(){
    return "id_"+Math.random().toString(36).slice(2,9);
}

function nowTimestamp(){
    // usando luxon para ISO local
    return luxon.DateTime.now().toISO(); 
}

function getPlayerById(id){
    return loadPlayers().find(p=>p.id===id) || null;
}

function renderScreen(html){
    const area = document.getElementById("screen-area");
    area.innerHTML = `
        <div class="glass-card">
            ${html}
        </div>
    `;
    feather.replace(); // atualiza ícones feather
}
