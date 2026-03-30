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

/** Escapa atributos HTML (src, alt). */
function escapeHtmlAttr(s){
    if (s == null) return "";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;");
}

/**
 * Miniatura circular do jogador (foto ou placeholder).
 * @param {{ photo?: string, name?: string } | null} player
 * @param {string} [className] classes extra (ex.: player-avatar-thumb--sm)
 */
function playerAvatarThumbHTML(player, className){
    var cls = "player-avatar-thumb" + (className ? " " + className : "");
    if (player && player.photo) {
        return (
            '<img src="' +
            escapeHtmlAttr(player.photo) +
            '" alt="' +
            escapeHtmlAttr(player.name || "") +
            '" class="' +
            cls +
            '" />'
        );
    }
    return (
        '<div class="' +
        cls +
        ' player-avatar-thumb--placeholder" aria-hidden="true">👤</div>'
    );
}

/**
 * Várias miniaturas para a linha de um treino (lista).
 * @param {string[]} playerIds
 * @param {number} [maxShow]
 */
/**
 * Garante URL absoluta da foto (para outro dispositivo / mesmo backend).
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
function normalizePlayerPhotoUrl(url){
    if (url == null || url === "") return null;
    var s = String(url).trim();
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) return s;
    if (s.indexOf("//") === 0) return "https:" + s;
    if (s.indexOf("/") === 0) {
        var base =
            typeof getBackendUrl === "function"
                ? getBackendUrl()
                : typeof window !== "undefined" && window.BACKEND_URL
                  ? window.BACKEND_URL
                  : "";
        if (!base) return s;
        return base.replace(/\/$/, "") + s;
    }
    return s;
}

function trainingPlayerAvatarsStackHTML(playerIds, maxShow){
    maxShow = maxShow == null ? 5 : maxShow;
    var players = typeof loadPlayers === "function" ? loadPlayers() : [];
    var ids = playerIds || [];
    var parts = [];
    var n = Math.min(ids.length, maxShow);
    for (var i = 0; i < n; i++) {
        var id = ids[i];
        var p = players.find(function (x) {
            return x && x.id === id;
        });
        if (p) {
            parts.push(
                playerAvatarThumbHTML(p, "player-avatar-thumb player-avatar-thumb--stack")
            );
        }
    }
    var more = ids.length - maxShow;
    if (more < 0) more = 0;
    return (
        '<div class="player-avatar-stack">' +
        parts.join("") +
        (more > 0 ? '<span class="player-avatar-more">+' + more + "</span>" : "") +
        "</div>"
    );
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
