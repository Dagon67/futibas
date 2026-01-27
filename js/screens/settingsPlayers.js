/* ===========================
   🖥️ SUBTELA: CONFIGURAÇÕES - JOGADORES
   =========================== */

function renderSettingsPlayers(){
    const players = loadPlayers();
    const listHTML = players.map(p=>{
        return `
        <div class="item-row">
            <div class="item-main">
                <div class="item-title">${p.name}</div>
                <div class="item-sub">ID interno: ${p.id}</div>
            </div>
            <button class="danger-btn" onclick="removePlayer('${p.id}')">
                Remover
            </button>
        </div>`;
    }).join("");

    return `
        <div style="display:flex;flex-direction:column;gap:1rem;">
            <div>
                <div class="item-title" style="margin-bottom:.5rem;">Adicionar novo jogador</div>
                <div style="display:flex;flex-direction:column;gap:1rem;">
                    <div class="inline-form-row">
                        <div class="label-col">
                            <label>Nome do jogador</label>
                            <input id="newPlayerName" placeholder="Ex: João Silva" />
                        </div>
                    </div>
                    <div class="label-col">
                        <label>Foto do jogador (opcional)</label>
                        <div style="font-size:0.875rem;color:var(--text-dim);margin-bottom:0.5rem;">
                            Tamanho recomendado: 200x200px ou maior (quadrado). A imagem será redimensionada automaticamente.
                        </div>
                        <input type="file" id="newPlayerPhoto" accept="image/jpeg,image/jpg,image/png,image/webp" style="display:none;" onchange="handlePlayerPhotoChange(event)" />
                        <button type="button" class="image-upload-btn" onclick="document.getElementById('newPlayerPhoto').click()">
                            <i data-feather="camera"></i> Selecionar Foto
                        </button>
                        <div id="playerPhotoPreview" style="margin-top:0.5rem;display:none;">
                            <img id="playerPhotoPreviewImg" src="" alt="Preview" style="max-width:150px;max-height:150px;border-radius:var(--radius-md);border:2px solid rgba(255,255,255,0.2);object-fit:cover;" />
                            <button type="button" class="danger-btn" onclick="clearPlayerPhoto()" style="margin-top:0.5rem;padding:0.5rem 1rem;font-size:0.875rem;">Remover Foto</button>
                        </div>
                    </div>
                    <button class="small-solid-btn" onclick="addPlayer()">Adicionar</button>
                </div>
            </div>

            <div>
                <div class="item-title" style="margin-bottom:.5rem;">Jogadores cadastrados</div>
                ${players.length? listHTML : `<div class="item-sub">Nenhum jogador ainda.</div>`}
            </div>
        </div>
    `;
}

let playerPhotoBase64 = null;

function handlePlayerPhotoChange(event){
    const file = event.target.files[0];
    if(!file) return;
    
    // Validar tipo de arquivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if(!validTypes.includes(file.type)){
        alert("Por favor, selecione uma imagem válida (JPG, PNG ou WEBP).");
        event.target.value = "";
        return;
    }
    
    // Validar tamanho (máximo 2MB)
    if(file.size > 2 * 1024 * 1024){
        alert("A imagem deve ter no máximo 2MB. Por favor, escolha uma imagem menor.");
        event.target.value = "";
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e){
        const img = new Image();
        img.onload = function(){
            // Redimensionar para tamanho ideal: 200x200px (quadrado, ideal para foto de perfil)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const maxSize = 200;
            
            // Calcular dimensões mantendo proporção
            let width = img.width;
            let height = img.height;
            
            if(width > height){
                if(width > maxSize){
                    height = (height * maxSize) / width;
                    width = maxSize;
                }
            } else {
                if(height > maxSize){
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
            }
            
            canvas.width = maxSize;
            canvas.height = maxSize;
            
            // Centralizar e desenhar a imagem (cortar para ficar quadrada)
            const offsetX = (maxSize - width) / 2;
            const offsetY = (maxSize - height) / 2;
            
            // Fundo branco para áreas vazias
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, maxSize, maxSize);
            
            ctx.drawImage(img, offsetX, offsetY, width, height);
            
            // Converter para base64 com qualidade otimizada
            playerPhotoBase64 = canvas.toDataURL('image/jpeg', 0.85);
            
            const preview = document.getElementById("playerPhotoPreview");
            const previewImg = document.getElementById("playerPhotoPreviewImg");
            if(preview && previewImg){
                previewImg.src = playerPhotoBase64;
                preview.style.display = "block";
            }
            feather.replace();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function clearPlayerPhoto(){
    playerPhotoBase64 = null;
    const fileInput = document.getElementById("newPlayerPhoto");
    const preview = document.getElementById("playerPhotoPreview");
    if(fileInput) fileInput.value = "";
    if(preview) preview.style.display = "none";
}

async function addPlayer(){
    const input = document.getElementById("newPlayerName");
    const name = input.value.trim();
    if(!name){
        alert("Digite um nome.");
        return;
    }
    const players = loadPlayers();
    const newPlayer = {
        id: uid(),
        name
    };
    
    // Upload foto se houver
    if(playerPhotoBase64){
        try {
            const backendUrl = typeof getBackendUrl === 'function' ? getBackendUrl() : (window.BACKEND_URL || 'http://localhost:5000');
            const response = await fetch(`${backendUrl}/upload/player-photo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    photo: playerPhotoBase64,
                    playerId: newPlayer.id
                })
            });
            
            if(response.ok){
                const result = await response.json();
                // Converter URL relativa em absoluta
                const photoUrl = result.photoUrl.startsWith('http') 
                    ? result.photoUrl 
                    : `${backendUrl}${result.photoUrl}`;
                newPlayer.photo = photoUrl;
                console.log("✅ Foto enviada com sucesso:", photoUrl);
            } else {
                // Se upload falhar, usar Base64 como fallback
                console.warn("⚠️ Upload falhou, usando Base64 local");
                newPlayer.photo = playerPhotoBase64;
            }
        } catch(error) {
            // Se não conseguir conectar, usar Base64 local
            console.warn("⚠️ Não foi possível fazer upload, usando Base64 local:", error);
            newPlayer.photo = playerPhotoBase64;
        }
    }
    
    players.push(newPlayer);
    savePlayers(players);
    
    // Limpar campos
    input.value = "";
    clearPlayerPhoto();
    renderSettings();
}

function removePlayer(id){
    const player = getPlayerById(id);
    if(!player) return;
    
    if(!confirm(`Tem certeza que deseja remover o jogador "${player.name}"?\n\nEsta ação não pode ser desfeita.`)){
        return;
    }
    
    let players = loadPlayers();
    players = players.filter(p=>p.id!==id);
    savePlayers(players);
    renderSettings();
}
