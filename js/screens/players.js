/* ===========================
   🖥️ TELA: GERENCIAMENTO DE JOGADORES
   =========================== */

function goPlayers(){
    // parar atualização do relógio quando sair do home
    if(window.dateTimeInterval) clearInterval(window.dateTimeInterval);
    state.currentScreen = "players";
    setHeaderModeLabel("Jogadores");

    const players = loadPlayers();
    
    const playersHTML = players.length === 0 
        ? `<div class="item-sub" style="text-align:center;padding:2rem;">Nenhum jogador cadastrado ainda.</div>`
        : players.map(p => {
            const position = p.position || "Não definida";
            const number = p.number ? `#${p.number}` : "";
            return `
            <div class="item-row player-item" onclick="viewPlayerStatus('${p.id}')" style="cursor:pointer;">
                <div class="item-main">
                    <div class="item-title">
                        ${p.name} ${number}
                    </div>
                    <div class="item-sub">
                        Posição: ${position}${p.lateralidade ? ` • ${p.lateralidade}` : ''}${p.age ? ` • Idade: ${p.age}` : ''}${p.height ? ` • Altura: ${p.height}cm` : ''}
                    </div>
                </div>
                <div style="display:flex;gap:0.5rem;align-items:center;">
                    <button class="small-solid-btn" onclick="event.stopPropagation();editPlayer('${p.id}')" style="padding:0.75rem 1rem;">
                        Editar
                    </button>
                    <button class="danger-btn" onclick="event.stopPropagation();removePlayerFromList('${p.id}')" style="padding:0.75rem 1rem;">
                        Remover
                    </button>
                </div>
            </div>`;
        }).join("");

    renderScreen(`
        <div class="settings-wrapper">
            <div class="back-row">
                <button class="back-btn" onclick="goHome()">
                    <i data-feather="home"></i>
                    <span>Início</span>
                </button>
                <div>
                    <div class="screen-title">Jogadores</div>
                    <div class="screen-sub">Gerencie os jogadores do time</div>
                </div>
            </div>

            <div class="settings-panel-area">
                <div class="settings-panel-scroll">
                    <div style="display:flex;flex-direction:column;gap:1rem;">
                        <div>
                            <div class="item-title" style="margin-bottom:.5rem;">Adicionar novo jogador</div>
                            <div style="display:flex;flex-direction:column;gap:1rem;">
                                <div class="inline-form-row">
                                    <div class="label-col">
                                        <label>Nome *</label>
                                        <input id="newPlayerName" placeholder="Ex: João Silva" />
                                    </div>
                                    <div class="label-col">
                                        <label>Número da Camisa</label>
                                        <input type="number" id="newPlayerNumber" placeholder="Ex: 10" min="1" max="99" />
                                    </div>
                                </div>
                                <div class="inline-form-row">
                                    <div class="label-col">
                                        <label>Posição *</label>
                                        <select id="newPlayerPosition">
                                            <option value="">Selecione...</option>
                                            <option value="Goleiro">Goleiro</option>
                                            <option value="Fixo">Fixo</option>
                                            <option value="Ala">Ala</option>
                                            <option value="Pivô">Pivô</option>
                                        </select>
                                    </div>
                                    <div class="label-col">
                                        <label>Idade</label>
                                        <input type="number" id="newPlayerAge" placeholder="Ex: 25" min="1" max="100" />
                                    </div>
                                </div>
                                <div class="inline-form-row">
                                    <div class="label-col">
                                        <label>Destro / Canhoto</label>
                                        <select id="newPlayerLateralidade">
                                            <option value="">Não informado</option>
                                            <option value="Destro">Destro</option>
                                            <option value="Canhoto">Canhoto</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="inline-form-row">
                                    <div class="label-col">
                                        <label>Altura (cm)</label>
                                        <input type="number" id="newPlayerHeight" placeholder="Ex: 175" min="100" max="250" />
                                    </div>
                                    <div class="label-col">
                                        <label>Peso (kg)</label>
                                        <input type="number" id="newPlayerWeight" placeholder="Ex: 70" min="30" max="200" step="0.1" />
                                    </div>
                                </div>
                                <div class="label-col">
                                    <label>Foto do jogador (opcional)</label>
                                    <div style="font-size:0.875rem;color:var(--text-dim);margin-bottom:0.5rem;">
                                        Tamanho recomendado: 200x200px ou maior (quadrado). A imagem será redimensionada automaticamente.
                                    </div>
                                    <input type="file" id="newPlayerPhotoFromList" accept="image/jpeg,image/jpg,image/png,image/webp" style="display:none;" onchange="handlePlayerPhotoChangeFromList(event)" />
                                    <button type="button" class="image-upload-btn" onclick="document.getElementById('newPlayerPhotoFromList').click()">
                                        <i data-feather="camera"></i> Selecionar Foto
                                    </button>
                                    <div id="playerPhotoPreviewFromList" style="margin-top:0.5rem;display:none;">
                                        <img id="playerPhotoPreviewImgFromList" src="" alt="Preview" style="max-width:150px;max-height:150px;border-radius:var(--radius-md);border:2px solid rgba(255,255,255,0.2);object-fit:cover;" />
                                        <button type="button" class="danger-btn" onclick="clearPlayerPhotoFromList()" style="margin-top:0.5rem;padding:0.5rem 1rem;font-size:0.875rem;">Remover Foto</button>
                                    </div>
                                </div>
                                <button class="small-solid-btn" onclick="addPlayerFromList()">Adicionar Jogador</button>
                            </div>
                        </div>

                        <div>
                            <div class="item-title" style="margin-bottom:.5rem;">Lista no Sheets</div>
                            <div class="item-sub" style="margin-bottom:.5rem;">Envie a lista atual para o Google Sheets para que outros aparelhos recebam ao entrar com a senha.</div>
                            <button type="button" class="small-solid-btn" id="btnUpdatePlayersSheets" onclick="updatePlayersListToSheets()">Atualizar lista de jogadores</button>
                            <div id="playersSyncFeedback" style="margin-top:.5rem;font-size:.875rem;display:none;"></div>
                        </div>

                        <div>
                            <div class="item-title" style="margin-bottom:.5rem;">Jogadores cadastrados (${players.length})</div>
                            ${playersHTML}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `);
    
    updateSettingsButtonVisibility();
    feather.replace();
}

let playerPhotoBase64FromList = null;

function handlePlayerPhotoChangeFromList(event){
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
            
            // Fundo preto para áreas vazias
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, maxSize, maxSize);
            
            ctx.drawImage(img, offsetX, offsetY, width, height);
            
            // Converter para base64 com qualidade otimizada
            playerPhotoBase64FromList = canvas.toDataURL('image/jpeg', 0.85);
            
            const preview = document.getElementById("playerPhotoPreviewFromList");
            const previewImg = document.getElementById("playerPhotoPreviewImgFromList");
            if(preview && previewImg){
                previewImg.src = playerPhotoBase64FromList;
                preview.style.display = "block";
            }
            feather.replace();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function clearPlayerPhotoFromList(){
    playerPhotoBase64FromList = null;
    const fileInput = document.getElementById("newPlayerPhotoFromList");
    const preview = document.getElementById("playerPhotoPreviewFromList");
    if(fileInput) fileInput.value = "";
    if(preview) preview.style.display = "none";
}

async function addPlayerFromList(){
    const nameInput = document.getElementById("newPlayerName");
    const numberInput = document.getElementById("newPlayerNumber");
    const positionInput = document.getElementById("newPlayerPosition");
    const lateralidadeInput = document.getElementById("newPlayerLateralidade");
    const ageInput = document.getElementById("newPlayerAge");
    const heightInput = document.getElementById("newPlayerHeight");
    const weightInput = document.getElementById("newPlayerWeight");
    
    const name = nameInput.value.trim();
    const position = positionInput.value.trim();
    const lateralidade = lateralidadeInput ? lateralidadeInput.value.trim() : null;
    
    if(!name){
        alert("Digite o nome do jogador.");
        return;
    }
    if(!position){
        alert("Selecione a posição do jogador.");
        return;
    }
    
    const players = loadPlayers();
    const newPlayer = {
        id: uid(),
        name,
        position,
        lateralidade: lateralidade || null,
        number: numberInput.value ? parseInt(numberInput.value) : null,
        age: ageInput.value ? parseInt(ageInput.value) : null,
        height: heightInput.value ? parseInt(heightInput.value) : null,
        weight: weightInput.value ? parseFloat(weightInput.value) : null
    };
    
    // Upload foto se houver
    if(playerPhotoBase64FromList){
        try {
            const backendUrl = typeof getBackendUrl === 'function' ? getBackendUrl() : (window.BACKEND_URL || 'http://localhost:5000');
            const response = await fetch(`${backendUrl}/upload/player-photo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    photo: playerPhotoBase64FromList,
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
                newPlayer.photo = playerPhotoBase64FromList;
            }
        } catch(error) {
            // Se não conseguir conectar, usar Base64 local
            console.warn("⚠️ Não foi possível fazer upload, usando Base64 local:", error);
            newPlayer.photo = playerPhotoBase64FromList;
        }
    }
    
    players.push(newPlayer);
    savePlayers(players);
    
    // Limpar campos
    nameInput.value = "";
    numberInput.value = "";
    positionInput.value = "";
    if(lateralidadeInput) lateralidadeInput.value = "";
    ageInput.value = "";
    heightInput.value = "";
    weightInput.value = "";
    clearPlayerPhotoFromList();
    
    goPlayers();
}

function removePlayerFromList(id){
    const player = getPlayerById(id);
    if(!player) return;
    
    if(!confirm(`Tem certeza que deseja remover o jogador "${player.name}"?\n\nEsta ação não pode ser desfeita.`)){
        return;
    }
    
    let players = loadPlayers();
    players = players.filter(p=>p.id!==id);
    savePlayers(players);
    goPlayers();
}

function editPlayer(id){
    const player = getPlayerById(id);
    if(!player) return;
    
    // Preencher formulário com dados do jogador (não remover da lista; a alteração é salva em savePlayerEdit)
    document.getElementById("newPlayerName").value = player.name || "";
    document.getElementById("newPlayerNumber").value = player.number || "";
    document.getElementById("newPlayerPosition").value = player.position || "";
    var latEl = document.getElementById("newPlayerLateralidade");
    if(latEl) latEl.value = player.lateralidade || "";
    document.getElementById("newPlayerAge").value = player.age || "";
    document.getElementById("newPlayerHeight").value = player.height || "";
    document.getElementById("newPlayerWeight").value = player.weight || "";
    
    // Scroll para o formulário
    document.getElementById("newPlayerName").scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById("newPlayerName").focus();
    
    // Atualizar botão para "Salvar Alterações"
    const addBtn = document.querySelector('button[onclick="addPlayerFromList()"]');
    if(addBtn){
        addBtn.textContent = "Salvar Alterações";
        addBtn.onclick = function(){
            savePlayerEdit(id);
        };
    }
}

async function savePlayerEdit(oldId){
    const nameInput = document.getElementById("newPlayerName");
    const numberInput = document.getElementById("newPlayerNumber");
    const positionInput = document.getElementById("newPlayerPosition");
    const lateralidadeInput = document.getElementById("newPlayerLateralidade");
    const ageInput = document.getElementById("newPlayerAge");
    const heightInput = document.getElementById("newPlayerHeight");
    const weightInput = document.getElementById("newPlayerWeight");
    
    const name = nameInput.value.trim();
    const position = positionInput.value.trim();
    const lateralidade = lateralidadeInput ? lateralidadeInput.value.trim() : null;
    
    if(!name){
        alert("Digite o nome do jogador.");
        return;
    }
    if(!position){
        alert("Selecione a posição do jogador.");
        return;
    }
    
    const players = loadPlayers();
    const playerIndex = players.findIndex(p => p.id === oldId);
    
    if(playerIndex >= 0){
        const updatedPlayer = {
            id: oldId,
            name,
            position,
            lateralidade: lateralidade || null,
            number: numberInput.value ? parseInt(numberInput.value) : null,
            age: ageInput.value ? parseInt(ageInput.value) : null,
            height: heightInput.value ? parseInt(heightInput.value) : null,
            weight: weightInput.value ? parseFloat(weightInput.value) : null
        };
        
        // Se houver nova foto, fazer upload
        if(playerPhotoBase64FromList){
            try {
                const backendUrl = typeof getBackendUrl === 'function' ? getBackendUrl() : (window.BACKEND_URL || 'http://localhost:5000');
                const response = await fetch(`${backendUrl}/upload/player-photo`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        photo: playerPhotoBase64FromList,
                        playerId: oldId
                    })
                });
                
                if(response.ok){
                    const result = await response.json();
                    const photoUrl = result.photoUrl.startsWith('http') 
                        ? result.photoUrl 
                        : `${backendUrl}${result.photoUrl}`;
                    updatedPlayer.photo = photoUrl;
                    console.log("✅ Foto atualizada com sucesso:", photoUrl);
                } else {
                    updatedPlayer.photo = playerPhotoBase64FromList; // Fallback Base64
                }
            } catch(error) {
                updatedPlayer.photo = playerPhotoBase64FromList; // Fallback Base64
            }
        } else {
            // Manter foto existente se não houver nova
            updatedPlayer.photo = players[playerIndex].photo;
        }
        
        players[playerIndex] = updatedPlayer;
        savePlayers(players);
    }
    
    // Limpar e recarregar
    nameInput.value = "";
    numberInput.value = "";
    positionInput.value = "";
    if(lateralidadeInput) lateralidadeInput.value = "";
    ageInput.value = "";
    heightInput.value = "";
    weightInput.value = "";
    
    // Restaurar botão
    const addBtn = document.querySelector('button[onclick*="savePlayerEdit"]');
    if(addBtn){
        addBtn.textContent = "Adicionar Jogador";
        addBtn.onclick = function(){
            addPlayerFromList();
        };
    }
    
    goPlayers();
}

if (typeof window !== 'undefined') {
    window.goPlayers = goPlayers;
}
