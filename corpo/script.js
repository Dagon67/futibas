// script.js - Sistema de Avaliação Pré-Treino
// Funcionalidades: seleção de jogadores, armazenamento local, dashboard

// ========== CONSTANTES E CONFIGURAÇÕES ==========
const STORAGE_KEY = 'avaliacao_pre_treino';
const STORAGE_KEY_POS = 'avaliacao_pos_treino';
const PLAYERS_KEY = 'completed_players';
const PLAYERS_KEY_POS = 'completed_players_pos';
const ABSENT_PLAYERS_KEY = 'absent_players';
const ABSENT_PLAYERS_KEY_POS = 'absent_players_pos';
const SELECTION_COMPLETED_KEY = 'selection_completed';
const SELECTION_COMPLETED_KEY_POS = 'selection_completed_pos';

// ========== UTILITÁRIOS ==========
/**
 * Salva dados no localStorage
 * @param {string} key - Chave do localStorage
 * @param {any} data - Dados a serem salvos
 * @param {string} playerId - ID do jogador
 * @returns {string} Nome do jogador ou "Jogador Desconhecido"
 * @param {string} tipo - 'pre' ou 'pos'
 * @returns {boolean} true se todos responderam
 */
function allPlayersCompleted(tipo) {
    // Carregar jogadores customizados
    const customPlayers = JSON.parse(localStorage.getItem('jogadores_custom') || '[]');
    
    // Carregar jogadores ausentes
    const absentKey = tipo === 'pos' ? 'absent_players_pos' : 'absent_players';
    const absentPlayers = JSON.parse(localStorage.getItem(absentKey) || '[]');
    
    // Jogadores disponíveis = customizados - ausentes
    const availablePlayers = customPlayers.filter(p => !absentPlayers.includes(p.id));
    
    // Carregar jogadores que completaram
    const completedKey = tipo === 'pos' ? 'completed_players_pos' : 'completed_players';
    const completedPlayers = JSON.parse(localStorage.getItem(completedKey) || '[]');
    
    console.log(`Verificando ${tipo}-treino:`, {
        totalCustom: customPlayers.length,
        ausentes: absentPlayers.length,
        disponiveis: availablePlayers.length,
        completaram: completedPlayers.length
    });
    
    return availablePlayers.length > 0 && completedPlayers.length >= availablePlayers.length;
}
function getPlayerNameById(playerId) {
    console.log('=== GET PLAYER NAME BY ID ===');
    console.log('Procurando nome para ID:', playerId);
    
    // Primeiro tenta encontrar nos jogadores customizados
    const customPlayers = JSON.parse(localStorage.getItem('jogadores_custom') || '[]');
    console.log('Jogadores customizados no storage:', customPlayers);
    
    const customPlayer = customPlayers.find(p => p.id === playerId);
    console.log('Jogador encontrado:', customPlayer);
    
    if (customPlayer) {
        console.log('Retornando nome:', customPlayer.nome);
        return customPlayer.nome;
    }
    
    // Se não encontrou, retorna um nome padrão
    const fallbackName = `Jogador ${playerId}`;
    console.log('Não encontrou, usando fallback:', fallbackName);
    return fallbackName;
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
    }
}

/**
 * Carrega dados do localStorage
 * @param {string} key - Chave do localStorage
 * @param {any} defaultValue - Valor padrão se não existir
 * @returns {any} Dados carregados ou valor padrão
 */
function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Erro ao carregar do localStorage:', error);
        return defaultValue;
    }
}

/**
 * Formata data e hora para YYYY-MM-DD HH:MM:SS
 * @returns {string} Data e hora formatadas
 */
function getCurrentDate() {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0];
    return `${date} ${time}`;
}
// ========== GERENCIAMENTO DE JOGADORES ==========
/**
 * Carrega estado dos jogadores da tela inicial
 */
function loadPlayers() {
    const tipoTreino = localStorage.getItem('tipo_treino') || 'pre';
    const completedKey = tipoTreino === 'pos' ? PLAYERS_KEY_POS : PLAYERS_KEY;
    const absentKey = tipoTreino === 'pos' ? ABSENT_PLAYERS_KEY_POS : ABSENT_PLAYERS_KEY;
    
    const players = document.querySelectorAll('.player');
    const completedPlayers = loadFromStorage(completedKey, []);
    const absentPlayers = loadFromStorage(absentKey, []);
    
    // Esconder jogadores ausentes
    players.forEach(player => {
        const playerId = player.dataset.player;
        
        // Se o jogador foi marcado como ausente pelo técnico, não mostra
        if (absentPlayers.includes(playerId)) {
            player.style.display = 'none';
            return;
        }
        
        // Se o jogador já completou o formulário, mostra opaco
        if (completedPlayers.includes(playerId)) {
            player.style.opacity = '0.3';
            player.style.pointerEvents = 'none';
        }
    });
    
    // Verifica se todos os jogadores presentes completaram
    const visiblePlayers = Array.from(players).filter(p => !absentPlayers.includes(p.dataset.player));
    const completedVisiblePlayers = completedPlayers.filter(p => !absentPlayers.includes(p));
    
    if (completedVisiblePlayers.length >= visiblePlayers.length) {
        showAllCompletedMessage();
    }
}

/**
 * Marca jogador como completo
 * @param {string} playerId - ID do jogador
 */
function markPlayerComplete(playerId) {
    const completedPlayers = loadFromStorage(PLAYERS_KEY, []);
    if (!completedPlayers.includes(playerId)) {
        completedPlayers.push(playerId);
        saveToStorage(PLAYERS_KEY, completedPlayers);
    }
}

/**
 * Inicializa tela do técnico para marcar ausentes
 */
function initTecnicoSelection() {
    if (!document.querySelector('.grid')) return;
    
    const tipoTreino = localStorage.getItem('tipo_treino') || 'pre';
    const absentKey = tipoTreino === 'pos' ? ABSENT_PLAYERS_KEY_POS : ABSENT_PLAYERS_KEY;
    
    const absentPlayers = loadFromStorage(absentKey, []);
    
    // Marca jogadores já selecionados como ausentes
    const players = document.querySelectorAll('.player');
    players.forEach(player => {
        const playerId = player.dataset.player;
        if (absentPlayers.includes(playerId)) {
            player.classList.add('absent');
        }
        
        // Adiciona event listener para toggle de ausência
        player.addEventListener('click', () => {
            togglePlayerAbsence(playerId);
            player.classList.toggle('absent');
        });
    });
}

/**
 * Alterna status de ausência de um jogador
 * @param {string} playerId - ID do jogador
 */
function togglePlayerAbsence(playerId) {
    const tipoTreino = localStorage.getItem('tipo_treino') || 'pre';
    const absentKey = tipoTreino === 'pos' ? ABSENT_PLAYERS_KEY_POS : ABSENT_PLAYERS_KEY;
    
    const absentPlayers = loadFromStorage(absentKey, []);
    const index = absentPlayers.indexOf(playerId);
    
    if (index > -1) {
        // Remove da lista de ausentes
        absentPlayers.splice(index, 1);
    } else {
        // Adiciona à lista de ausentes
        absentPlayers.push(playerId);
    }
    
    saveToStorage(absentKey, absentPlayers);
}

/**
 * Processa jogadores ausentes marcados pelo técnico (cria respostas de ausência)
 */
function processAbsentPlayers() {
    console.log('=== PROCESS ABSENT PLAYERS ===');
    const tipoTreino = localStorage.getItem('tipo_treino') || 'pre';
    console.log('Tipo de treino:', tipoTreino);
    const absentKey = tipoTreino === 'pos' ? ABSENT_PLAYERS_KEY_POS : ABSENT_PLAYERS_KEY;
    console.log('Chave para ausentes:', absentKey);
    
    const absentPlayers = loadFromStorage(absentKey, []);
    console.log('Jogadores ausentes carregados:', absentPlayers);
    console.log('Número de jogadores ausentes:', absentPlayers.length);
    
    absentPlayers.forEach((playerId, index) => {
        console.log(`Processando jogador ausente ${index + 1}/${absentPlayers.length}:`, playerId);
        const absentResponse = {
            nome: getPlayerNameById(playerId),
            data: getCurrentDate(),
            condicao: 'Ausente',
            tipo: tipoTreino,
            recuperacao: null,
            fadiga: null,
            sono: null,
            dorMuscular: null,
            estresse: null,
            humor: null,
            regiaoDor: []
        };
        console.log('Resposta criada:', absentResponse);
        
        const storageKey = tipoTreino === 'pos' ? STORAGE_KEY_POS : STORAGE_KEY;
        console.log('Salvando resposta na chave:', storageKey);
        saveResponse(absentResponse, storageKey);
        
        console.log('Marcando jogador como completo:', playerId);
        markPlayerComplete(playerId);
        console.log('Jogador processado com sucesso');
    });
    console.log('=== FIM PROCESS ABSENT PLAYERS ===');
}
/**
 * Função chamada pelo botão "Confirmar Seleção e Continuar"
 */
function proceedToPlayerSelection() {
    console.log('=== PROCEED TO PLAYER SELECTION ===');
    console.log('Chamando processAbsentPlayers...');
    processAbsentPlayers();
    console.log('Salvando SELECTION_COMPLETED_KEY...');
    saveToStorage(SELECTION_COMPLETED_KEY, true);
    console.log('Redirecionando para index.html...');
    window.location.href = 'index.html';
}

function proceedToPosTreinoSelection() {
    console.log('=== PROCEED TO POS TREINO SELECTION ===');
    console.log('Chamando processAbsentPlayers...');
    processAbsentPlayers();
    console.log('Salvando SELECTION_COMPLETED_KEY_POS...');
    saveToStorage(SELECTION_COMPLETED_KEY_POS, true);
    console.log('Redirecionando para pos-treino.html...');
    window.location.href = 'pos-treino.html';
}

/**
 * Exibe mensagem quando todos os jogadores completaram
 */
function showAllCompletedMessage() {
    const container = document.querySelector('.container');
    const message = document.createElement('div');
    message.innerHTML = `
        <h1 style="color: #0066cc; margin-bottom: 30px;">Todos os atletas já preencheram.</h1>
        <h2 style="color: #003366;">Treino liberado.</h2>
        <button onclick="window.location.href='dashboard.html'" style="
            background-color: #0066cc;
            color: white;
            border: none;
            padding: 20px 40px;
            font-size: 1.8em;
            cursor: pointer;
            border-radius: 12px;
            margin-top: 30px;
        ">Acessar Dashboard</button>
    `;
    message.style.textAlign = 'center';
    message.style.padding = '50px';
    
    // Remove grid de jogadores e adiciona mensagem
    const grid = document.querySelector('.grid');
    if (grid) {
        grid.remove();
    }
    container.appendChild(message);
}

// ========== FORMULÁRIO ==========
/**
 * Inicializa lógica do formulário
 */

function initForm() {
    const form = document.getElementById('assessmentForm');
    if (!form) return;
    
    const condicoesInput = document.getElementById('condicoes');
    const dorLocalInput = document.getElementById('dor_local');
    const options = document.querySelectorAll('.option');
    const selectedMuscles = new Set();
    
    // Opções da primeira pergunta
    options.forEach(option => {
        option.addEventListener('click', () => {
            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            condicoesInput.value = option.dataset.value;
        });
    });
    
    // Usar event delegation para os músculos
    const svgContainer = document.querySelector('.body-container');
    if (svgContainer) {
        svgContainer.addEventListener('click', (e) => {
            // Verificar se o elemento clicado é um grupo de músculo
            const muscleGroup = e.target.closest('g.muscle');
            if (muscleGroup) {
                console.log('Clique detectado no músculo:', muscleGroup.dataset.part);
                const part = muscleGroup.dataset.part;
                if (selectedMuscles.has(part)) {
                    selectedMuscles.delete(part);
                    muscleGroup.classList.remove('selected');
                } else {
                    selectedMuscles.add(part);
                    muscleGroup.classList.add('selected');
                }
                dorLocalInput.value = Array.from(selectedMuscles).join(', ') || '';
            }
        });
    }
    
    // Submissão do formulário
    form.addEventListener('submit', handleFormSubmit);
}

/**
 * Processa envio do formulário
 * @param {Event} e - Evento de submit
 */
function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const condicoesInput = document.getElementById('condicoes');
    
    if (!condicoesInput.value) {
        alert('Por favor, responda se está em condições de treinar.');
        return;
    }
    
    // Coleta todos os dados do formulário
    const formData = new FormData(form);
    const selectedPlayer = localStorage.getItem('selectedPlayer');
    const tipoTreino = localStorage.getItem('tipo_treino') || 'pre';
    
    // Cria objeto de resposta conforme especificação
    const response = {
        nome: getPlayerNameById(selectedPlayer),
        data: getCurrentDate(),
        condicao: condicoesInput.value,
        recuperacao: parseInt(formData.get('recuperacao')),
        fadiga: parseInt(formData.get('fadiga')),
        sono: parseInt(formData.get('sono')),
        dorMuscular: parseInt(formData.get('dor_muscular')),
        estresse: parseInt(formData.get('estresse')),
        humor: parseInt(formData.get('humor')),
        // Usa os nomes "bonitinhos" para o dashboard
        regiaoDor: Array.from(loadFromStorage('temp_dor_local', [])).map(part => PRETTY_NAMES[part] || part)
    };
    
    // Salva resposta
    const storageKey = tipoTreino === 'pos' ? STORAGE_KEY_POS : STORAGE_KEY;
    saveResponse(response, storageKey);
    
    // Marca jogador como completo
    markPlayerComplete(selectedPlayer);
    
    localStorage.removeItem('temp_dor_local'); // Limpa o estado temporário após envio
    
    // Verifica se todos os jogadores responderam e redireciona adequadamente
    // Carregar dados atuais para verificação
    const customPlayers = JSON.parse(localStorage.getItem('jogadores_custom') || '[]');
    const absentKey = tipoTreino === 'pos' ? 'absent_players_pos' : 'absent_players';
    const absentPlayers = JSON.parse(localStorage.getItem(absentKey) || '[]');
    const completedKey = tipoTreino === 'pos' ? 'completed_players_pos' : 'completed_players';
    const completedPlayers = JSON.parse(localStorage.getItem(completedKey) || '[]');
    
    // Jogadores disponíveis = customizados - ausentes
    const availablePlayers = customPlayers.filter(p => !absentPlayers.includes(p.id));
    
    console.log(`Verificação final ${tipoTreino}-treino:`, {
        totalCustom: customPlayers.length,
        ausentes: absentPlayers.length,
        disponiveis: availablePlayers.length,
        completaram: completedPlayers.length,
        todosCompletaram: availablePlayers.length > 0 && completedPlayers.length >= availablePlayers.length
    });
    
    if (availablePlayers.length > 0 && completedPlayers.length >= availablePlayers.length) {
        window.location.href = 'treino-liberado.html';
    } else {
        window.location.href = 'confirm.html';
    }

/**
 * Processa envio do formulário (versão antiga - removida)
 * @param {Event} e - Evento de submit
 */
function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const condicoesInput = document.getElementById('condicoes');
    
    if (!condicoesInput.value) {
        alert('Por favor, responda se está em condições de treinar.');
        return;
    }
    
    // Coleta todos os dados do formulário
    const formData = new FormData(form);
    const selectedPlayer = localStorage.getItem('selectedPlayer');
    const tipoTreino = localStorage.getItem('tipo_treino') || 'pre';
    
    const response = {
        nome: getPlayerNameById(selectedPlayer),
        data: getCurrentDate(),
        condicao: condicoesInput.value,
        recuperacao: parseInt(formData.get('recuperacao')),
        fadiga: parseInt(formData.get('fadiga')),
        sono: parseInt(formData.get('sono')),
        dorMuscular: parseInt(formData.get('dor_muscular')),
        estresse: parseInt(formData.get('estresse')),
        humor: parseInt(formData.get('humor')),
        regiaoDor: Array.from(loadFromStorage('temp_dor_local', [])).map(part => PRETTY_NAMES[part] || part)
    };
    
    // Salva resposta
    saveResponse(response);
    
    // Marca jogador como completo
    markPlayerComplete(selectedPlayer);
    
    localStorage.removeItem('temp_dor_local'); // Limpa o estado temporário após envio
    // Redireciona para confirmação
    window.location.href = 'confirm.html';
}

/**
 * Salva resposta no localStorage
 * @param {Object} response - Objeto de resposta
 */
function saveResponse(response, storageKey = STORAGE_KEY) {
    const responses = loadFromStorage(storageKey, []);
    responses.push(response);
    saveToStorage(storageKey, responses);
}

// ========== DASHBOARD ==========
/**
 * Inicializa dashboard do preparador físico
 */
function initDashboard() {
    if (!document.querySelector('.dashboard-container')) return;
    
    // Não chama updateDashboard aqui, será chamado pelas funções showPreTreino/showPosTreino
    
    // Botão zerar dados
    const clearButton = document.getElementById('clear-data');
    console.log('Botão clear-data encontrado:', !!clearButton);
    if (clearButton) {
        console.log('Configurando event listener para clear-data');
        clearButton.addEventListener('click', clearAllData);
        console.log('Event listener configurado');
    } else {
        console.log('ERRO: Botão clear-data não encontrado!');
    }
    
    // Botão exportar relatório
    const exportButton = document.getElementById('export-data');
    if (exportButton) {
        exportButton.addEventListener('click', () => {
            const titulo = document.getElementById('titulo-dashboard').textContent;
            const tipoTreino = titulo.includes('Pós-Treino') ? 'pos' : 'pre';
            exportDailyReport(tipoTreino);
        });
    }
}

/**
 * Atualiza conteúdo do dashboard
 */
function updateDashboard(tipoTreino = 'pre') {
    const storageKey = tipoTreino === 'pos' ? STORAGE_KEY_POS : STORAGE_KEY;
    const responses = loadFromStorage(storageKey, []);
    
    if (responses.length === 0) {
        document.getElementById('dashboard-content').innerHTML = '<p>Nenhum dado coletado ainda.</p>';
        return;
    }
    
    // Carregar lista de jogadores ausentes
    const absentKey = tipoTreino === 'pos' ? 'absent_players_pos' : 'absent_players';
    const absentPlayers = JSON.parse(localStorage.getItem(absentKey) || '[]');
    
    // Calcula médias da equipe apenas dos jogadores presentes (não ausentes)
    const averages = calculateTeamAverages(responses, absentPlayers, tipoTreino);
    
    // Gera HTML do dashboard
    const tipoLabel = tipoTreino === 'pos' ? 'Pós-Treino' : 'Pré-Treino';
    let averagesHTML = '';
    
    if (tipoTreino === 'pos') {
        // Para pós-treino, mostrar médias de esforço e tempo
        averagesHTML = `
            <div class="average-item">
                <strong>Esforço Médio:</strong> ${averages.esforco ? averages.esforco.toFixed(1) : 'N/A'}
            </div>
            <div class="average-item">
                <strong>Tempo Médio:</strong> ${averages.tempoTreino ? averages.tempoTreino.toFixed(0) + ' min' : 'N/A'}
            </div>
        `;
    } else {
        // Para pré-treino, mostrar as métricas habituais
        averagesHTML = `
            <div class="average-item">
                <strong>Recuperação:</strong> ${averages.recuperacao.toFixed(1)}
            </div>
            <div class="average-item">
                <strong>Fadiga:</strong> ${averages.fadiga.toFixed(1)}
            </div>
            <div class="average-item">
                <strong>Sono:</strong> ${averages.sono.toFixed(1)}
            </div>
            <div class="average-item">
                <strong>Dor Muscular:</strong> ${averages.dorMuscular.toFixed(1)}
            </div>
            <div class="average-item">
                <strong>Estresse:</strong> ${averages.estresse.toFixed(1)}
            </div>
            <div class="average-item">
                <strong>Humor:</strong> ${averages.humor.toFixed(1)}
            </div>
        `;
    }
    
    // Filtrar respostas apenas de jogadores presentes
    const presentResponses = responses.filter(response => {
        const playerIdMatch = response.nome.match(/Jogador (\d+)/);
        if (!playerIdMatch) return true;
        const playerId = playerIdMatch[1];
        return !absentPlayers.includes(playerId);
    });
    
    const dashboardHTML = `
        <div class="dashboard-section">
            <h2>Média da Equipe - ${tipoLabel}</h2>
            <div class="averages-grid">
                ${averagesHTML}
            </div>
        </div>
        
        <div class="dashboard-section">
            <h2>Dados Individuais - ${tipoLabel}</h2>
            <div class="players-list">
                ${presentResponses.map((response, index) => `
                    <div class="player-card">
                        <div class="player-header">
                            <h3>${response.nome}</h3>
                            <button class="delete-btn" onclick="deletePlayerResponse(${index}, '${tipoTreino}')" title="Excluir resposta">×</button>
                        </div>
                        <p class="response-date">${response.data}</p>
                        ${response.condicao === 'Ausente' ? '<p class="absent-note">Ausente no treino</p>' : ''}
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div id="player-details" class="player-details" style="display: none;"></div>
    `;
    
    document.getElementById('dashboard-content').innerHTML = dashboardHTML;
}

/**
 * Calcula médias da equipe
 * @param {Array} responses - Array de respostas
 * @returns {Object} Objeto com médias
 */
function calculateTeamAverages(responses, absentPlayers = [], tipoTreino = 'pre') {
    // Filtra respostas apenas de jogadores que não estão na lista de ausentes
    const presentResponses = responses.filter(response => {
        // Extrair ID do jogador do nome (formato: "Jogador {id}")
        const playerIdMatch = response.nome.match(/Jogador (\d+)/);
        if (!playerIdMatch) return true; // Se não conseguir extrair ID, incluir
        
        const playerId = playerIdMatch[1];
        return !absentPlayers.includes(playerId);
    });
    
    // Verifica se é pós-treino (tem propriedades de esforço e tempo)
    const isPosTreino = tipoTreino === 'pos' || (presentResponses.length > 0 && presentResponses[0].esforco !== undefined);
    
    if (isPosTreino) {
        const sums = presentResponses.reduce((acc, response) => ({
            esforco: acc.esforco + response.esforco,
            tempoTreino: acc.tempoTreino + response.tempoTreino
        }), { esforco: 0, tempoTreino: 0 });
        
        return {
            esforco: presentResponses.length > 0 ? sums.esforco / presentResponses.length : 0,
            tempoTreino: presentResponses.length > 0 ? sums.tempoTreino / presentResponses.length : 0
        };
    } else {
        const sums = presentResponses.reduce((acc, response) => ({
            recuperacao: acc.recuperacao + response.recuperacao,
            fadiga: acc.fadiga + response.fadiga,
            sono: acc.sono + response.sono,
            dorMuscular: acc.dorMuscular + response.dorMuscular,
            estresse: acc.estresse + response.estresse,
            humor: acc.humor + response.humor
        }), { recuperacao: 0, fadiga: 0, sono: 0, dorMuscular: 0, estresse: 0, humor: 0 });
        
        return {
            recuperacao: presentResponses.length > 0 ? sums.recuperacao / presentResponses.length : 0,
            fadiga: presentResponses.length > 0 ? sums.fadiga / presentResponses.length : 0,
            sono: presentResponses.length > 0 ? sums.sono / presentResponses.length : 0,
            dorMuscular: presentResponses.length > 0 ? sums.dorMuscular / presentResponses.length : 0,
            estresse: presentResponses.length > 0 ? sums.estresse / presentResponses.length : 0,
            humor: presentResponses.length > 0 ? sums.humor / presentResponses.length : 0
        };
    }
}

/**
 * Exibe detalhes de um jogador
 * @param {number} index - Índice da resposta no array
 */
function showPlayerDetails(index) {
    const responses = loadFromStorage(STORAGE_KEY, []);
    const response = responses[index];
    
    const detailsHTML = `
        <h2>Detalhes de ${response.nome}</h2>
        <div class="details-grid">
            <div class="detail-item"><strong>Data/Hora:</strong> ${response.data}</div>
            <div class="detail-item"><strong>Condição:</strong> ${response.condicao}</div>
            ${response.condicao !== 'Ausente' ? `
                <div class="detail-item"><strong>Recuperação:</strong> ${response.recuperacao}</div>
                <div class="detail-item"><strong>Fadiga:</strong> ${response.fadiga}</div>
                <div class="detail-item"><strong>Sono:</strong> ${response.sono}</div>
                <div class="detail-item"><strong>Dor Muscular:</strong> ${response.dorMuscular}</div>
                <div class="detail-item"><strong>Estresse:</strong> ${response.estresse}</div>
                <div class="detail-item"><strong>Humor:</strong> ${response.humor}</div>
                <div class="detail-item"><strong>Regiões de Dor:</strong> ${response.regiaoDor.length > 0 ? response.regiaoDor.join(', ') : 'Nenhuma'}</div>
            ` : ''}
        </div>
        <button onclick="document.getElementById('player-details').style.display='none'">Fechar</button>
    `;
    
    document.getElementById('player-details').innerHTML = detailsHTML;
    document.getElementById('player-details').style.display = 'block';
}

/**
 * Limpa todos os dados armazenados
 */
function clearAllData() {
    console.log('=== CLEAR ALL DATA ===');
    console.log('Iniciando limpeza de dados...');
    
    if (confirm('Tem certeza que deseja apagar todos os dados? Esta ação não pode ser desfeita.')) {
        console.log('Usuário confirmou limpeza');
        
        console.log('Removendo STORAGE_KEY...');
        localStorage.removeItem(STORAGE_KEY);
        
        console.log('Removendo STORAGE_KEY_POS...');
        localStorage.removeItem(STORAGE_KEY_POS);
        
        console.log('Removendo PLAYERS_KEY...');
        localStorage.removeItem(PLAYERS_KEY);
        
        console.log('Removendo PLAYERS_KEY_POS...');
        localStorage.removeItem(PLAYERS_KEY_POS);
        
        console.log('Removendo ABSENT_PLAYERS_KEY...');
        localStorage.removeItem(ABSENT_PLAYERS_KEY);
        
        console.log('Removendo ABSENT_PLAYERS_KEY_POS...');
        localStorage.removeItem(ABSENT_PLAYERS_KEY_POS);
        
        console.log('Removendo SELECTION_COMPLETED_KEY...');
        localStorage.removeItem(SELECTION_COMPLETED_KEY);
        
        console.log('Removendo SELECTION_COMPLETED_KEY_POS...');
        localStorage.removeItem(SELECTION_COMPLETED_KEY_POS);
        
        console.log('Redirecionando para inicio.html...');
        window.location.href = 'inicio.html';
    } else {
        console.log('Usuário cancelou limpeza');
    }
}

/**
 * Exclui resposta individual de um jogador
 * @param {number} index - Índice da resposta no array
 */
function deletePlayerResponse(index, tipoTreino = 'pre') {
    if (confirm('Tem certeza que deseja excluir esta resposta?')) {
        const storageKey = tipoTreino === 'pos' ? STORAGE_KEY_POS : STORAGE_KEY;
        const playersKey = tipoTreino === 'pos' ? PLAYERS_KEY_POS : PLAYERS_KEY;
        const absentKey = tipoTreino === 'pos' ? ABSENT_PLAYERS_KEY_POS : ABSENT_PLAYERS_KEY;
        
        const responses = loadFromStorage(storageKey, []);
        const deletedResponse = responses.splice(index, 1)[0];
        
        // Se o jogador foi excluído, remove também da lista de completados
        if (deletedResponse) {
            const completedPlayers = loadFromStorage(playersKey, []);
            const absentPlayers = loadFromStorage(absentKey, []);
            const playerId = deletedResponse.nome.replace('Jogador ', '');
            const playerIndex = completedPlayers.indexOf(playerId);
            if (playerIndex > -1) {
                completedPlayers.splice(playerIndex, 1);
                saveToStorage(playersKey, completedPlayers);
            }
            // Não remove da lista de ausentes, pois foi marcado ausente pelo técnico
        }
        
        saveToStorage(storageKey, responses);
        updateDashboard(tipoTreino);
    }
}

/**
 * Exporta relatório do dia em formato CSV
 */
function exportDailyReport(tipoTreino = 'pre') {
    const storageKey = tipoTreino === 'pos' ? STORAGE_KEY_POS : STORAGE_KEY;
    const responses = loadFromStorage(storageKey, []);
    
    if (responses.length === 0) {
        alert('Nenhum dado para exportar.');
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    let csvContent = '';
    
    if (tipoTreino === 'pos') {
        // CSV para pós-treino
        csvContent = 'Nome,Data,Hora,Status,Esforco,Tempo Treino\n';
        
        responses.forEach((response) => {
            const dateTime = response.data.split(' ');
            const date = dateTime[0] || '';
            const time = dateTime[1] || '';
            
            csvContent += `"${response.nome}","${date}","${time}","${response.condicao}","${response.esforco || ''}","${response.tempoTreino || ''}"\n`;
        });
    } else {
        // CSV para pré-treino
        csvContent = 'Nome,Data,Hora,Status,Recuperacao,Fadiga,Sono,Dor Muscular,Estresse,Humor,Regioes Dor\n';
        
        responses.forEach((response) => {
            const dateTime = response.data.split(' ');
            const date = dateTime[0] || '';
            const time = dateTime[1] || '';
            const regioesDor = response.regiaoDor ? response.regiaoDor.join('; ') : 'Nenhuma';
            
            if (response.condicao === 'Ausente') {
                csvContent += `"${response.nome}","${date}","${time}","${response.condicao}",,,,,,\n`;
            } else {
                csvContent += `"${response.nome}","${date}","${time}","${response.condicao}","${response.recuperacao}","${response.fadiga}","${response.sono}","${response.dorMuscular}","${response.estresse}","${response.humor}","${regioesDor}"\n`;
            }
        });
    }
    
    // Cria e baixa o arquivo CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${tipoTreino}_diario_${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

const PRETTY_NAMES = {
    'Pé direito': 'Pé direito',
    'Pé esquerdo': 'Pé esquerdo',
    'Calcanhar esquerdo': 'Calcanhar esquerdo',
    'Calcanhar direito': 'Calcanhar direito',
    'Panturrilha esquerda': 'Panturrilha dsquerda',
    'Panturrilha direita': 'Panturrilha direita',
    'Joelho direito': 'Joelho direito',
    'Joelho esquerdo': 'Joelho esquerdo',
    'Posterior esquerdo': 'Isquiotibial esquerdo',
    'Posterior direito': 'Isquiotibial direito',
    'Quadríceps direito': 'Quadríceps direito',
    'Quadríceps esquerdo': 'Quadríceps esquerdo',
    'Adutores esquerdo': 'Adutores esquerdo',
    'Adutores direito': 'Adutores direito',
    'Glúteo esquerdo': 'Glúteo esquerdo',
    'Glúteo direito': 'Glúteo direito',
    'Abdômen': 'Abdômen',
    'Lombar': 'Lombar',
    'Serrátil direito': 'Serrátil direito',
    'Serrátil esquerdo': 'Serrátil esquerdo',
    'Latíssimo direito': 'Grande Dorsal direito',
    'Latíssimo esquerdo': 'Grande Dorsal esquerdo',
    'Trapézio direito': 'Trapézio direito',
    'Trapézio esquerdo': 'Trapézio esquerdo',
    'Ombro esquerdo': 'Deltóide esquerdo',
    'Ombro direito': 'Deltóide direito',
    'Tríceps direito': 'Tríceps direito',
    'Tríceps esquerdo': 'Tríceps esquerdo',
    'Cotovelo esquerdo': 'Cotovelo esquerdo',
    'Cotovelo direito': 'Cotovelo direito',
    'Pescoço': 'Pescoço',
    'Bíceps direito': 'Bíceps direito',
    'Bíceps esquerdo': 'Bíceps esquerdo',
    'Antebraço esquerdo': 'Antebraço esquerdo',
    'Antebraço direito': 'Antebraço direito',
    'Pulso esquerdo': 'Pulso esquerdo',
    'Pulso direito': 'Pulso direito',
    'Mão esquerda': 'Mão esquerda',
    'Mão direita': 'Mão direita',
    'Peitoral direito': 'Peitoral direito',
    'Peitoral-esquerdo': 'Peitoral esquerdo',
    'Quadril': 'Quadril'
};

// Músculos que aparecem tanto na frente quanto atrás (seleção cruzada)
const LINKED_MUSCLES = {
    // Por enquanto vazio - adicione pares conforme necessário
    // Exemplo: 'trapézio-direito': 'trapézio-esquerdo' (se fossem o mesmo)
};

function initForm() {
    const form = document.getElementById('assessmentForm');
    if (!form) return;
    
    const selectedPlayer = localStorage.getItem('selectedPlayer');
    
    // Botão de voltar
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
    
    const condicoesInput = document.getElementById('condicoes');
    const dorLocalInput = document.getElementById('dor_local');
    const condicoesOptions = document.querySelectorAll('.question:first-child .option'); // Opções da primeira pergunta (condições)
    const muscles = document.querySelectorAll('.muscle'); // Todos os músculos no SVG
    const selectedMuscles = new Set();

 // Reconstitui o estado do dorLocalInput se a página for recarregada
 const savedDorLocal = loadFromStorage('temp_dor_local', []);
 savedDorLocal.forEach(part => {
     selectedMuscles.add(part);
     // Aplica a classe 'selected' a todos os elementos correspondentes
     document.querySelectorAll(`[data-part="${part}"]`).forEach(muscleEl => {
         muscleEl.classList.add('selected');
     });
 });
 dorLocalInput.value = Array.from(selectedMuscles).map(p => PRETTY_NAMES[p] || p).join(', ') || '';

 // Atualiza a lista visual na inicialização
 updateSelectedRegionsList(selectedMuscles);
    
    // Opções da pergunta de condições
    condicoesOptions.forEach(option => {
        option.addEventListener('click', () => {
            condicoesOptions.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            condicoesInput.value = option.dataset.value;
        });
    });
    
    // Músculos clicáveis
    muscles.forEach(muscle => {
        muscle.addEventListener('click', () => {
            const part = muscle.dataset.part;
            
            // Lógica de seleção cruzada
            const partsToToggle = [part];
            if (LINKED_MUSCLES[part]) {
                // Se existe um músculo vinculado, adicione-o também para alternar
                partsToToggle.push(LINKED_MUSCLES[part]);
            }

            partsToToggle.forEach(p => {
                if (selectedMuscles.has(p)) {
                    selectedMuscles.delete(p);
                    document.querySelectorAll(`[data-part="${p}"]`).forEach(muscleEl => {
                        muscleEl.classList.remove('selected');
                    });
                } else {
                    selectedMuscles.add(p);
                    document.querySelectorAll(`[data-part="${p}"]`).forEach(muscleEl => {
                        muscleEl.classList.add('selected');
                    });
                }
            });
            
            // Atualiza a lista visual de regiões selecionadas
            updateSelectedRegionsList(selectedMuscles);
            
            dorLocalInput.value = Array.from(selectedMuscles).map(p => PRETTY_NAMES[p] || p).join(', ') || '';
            saveToStorage('temp_dor_local', Array.from(selectedMuscles)); // Salva temporariamente para recarregamento
        });
    });
    
    // Submissão do formulário
    form.addEventListener('submit', handleFormSubmit);
}

/**
 * Atualiza a lista visual de regiões selecionadas
 * @param {Set} selectedMuscles - Set com os músculos selecionados
 */
function updateSelectedRegionsList(selectedMuscles) {
    const regionsList = document.getElementById('regions-list');
    if (!regionsList) return;
    
    if (selectedMuscles.size === 0) {
        regionsList.innerHTML = 'Nenhuma região selecionada';
    } else {
        const regionsHTML = Array.from(selectedMuscles)
            .map(muscle => `<span class="region-tag">${PRETTY_NAMES[muscle] || muscle}</span>`)
            .join(' ');
        regionsList.innerHTML = regionsHTML;
    }
}

/**
 * Processa envio do formulário
 * @param {Event} e - Evento de submit
 */
function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const condicoesInput = document.getElementById('condicoes');
    
    if (!condicoesInput.value) {
        alert('Por favor, responda se está em condições de treinar.');
        return;
    }
    
    // Coleta todos os dados do formulário
    const formData = new FormData(form);
    const selectedPlayer = localStorage.getItem('selectedPlayer');
    const tipoTreino = localStorage.getItem('tipo_treino') || 'pre';
    
    const response = {
        nome: getPlayerNameById(selectedPlayer),
        data: getCurrentDate(),
        condicao: condicoesInput.value,
        recuperacao: parseInt(formData.get('recuperacao')),
        fadiga: parseInt(formData.get('fadiga')),
        sono: parseInt(formData.get('sono')),
        dorMuscular: parseInt(formData.get('dor_muscular')),
        estresse: parseInt(formData.get('estresse')),
        humor: parseInt(formData.get('humor')),
        // Usa os nomes "bonitinhos" para o dashboard
        regiaoDor: Array.from(loadFromStorage('temp_dor_local', [])).map(part => PRETTY_NAMES[part] || part)
    };
    
    // Salva resposta
    saveResponse(response);
    
    // Marca jogador como completo
    markPlayerComplete(selectedPlayer);
    
    localStorage.removeItem('temp_dor_local'); // Limpa o estado temporário após envio
    // Redireciona para confirmação
    window.location.href = 'confirm.html';
}

// ... existing code ...

// ========== INICIALIZAÇÃO ==========
document.addEventListener('DOMContentLoaded', () => {
  // Index: Carregar estado dos jogadores e adicionar event listeners
  if (document.querySelector('.grid')) {
    // Verifica se estamos na tela do técnico (tecnico.html)
    if (window.location.pathname.includes('tecnico.html')) {
        initTecnicoSelection();
    } else {
        loadPlayers();
    }
  }
    
    // Botão de voltar (funciona em todas as páginas que tiverem o botão)
    const backButton = document.getElementById('backButton');
    if (backButton) {
        // Verificar se estamos na tela do técnico
        if (document.querySelector('h1.site-title')?.textContent === 'Seleção de Jogadores Presentes' || 
            document.querySelector('h1.site-title')?.textContent === 'Seleção de Jogadores Pós-Treino') {
            backButton.addEventListener('click', () => {
                window.location.href = 'inicio.html';
            });
        } else if (document.querySelector('.grid') && 
                  !loadFromStorage(document.querySelector('h1.site-title')?.textContent === 'Avaliação Pós-Treino' ? SELECTION_COMPLETED_KEY_POS : SELECTION_COMPLETED_KEY, false)) {
            // Estamos no index.html E a seleção ainda não foi feita
            backButton.addEventListener('click', () => {
                window.location.href = 'inicio.html';
            });
        } else if (document.querySelector('.grid') && 
                  loadFromStorage(document.querySelector('h1.site-title')?.textContent === 'Avaliação Pós-Treino' ? SELECTION_COMPLETED_KEY_POS : SELECTION_COMPLETED_KEY, false)) {
            // Estamos no index.html MAS a seleção já foi feita - esconder botão
            backButton.style.display = 'none';
        } else {
            // Estamos no form.html
            backButton.addEventListener('click', () => {
                const tipoTreino = localStorage.getItem('tipo_treino') || 'pre';
                window.location.href = tipoTreino === 'pos' ? 'pos_treino.html' : 'index.html';
            });
        }
    }
    
 // Form: Inicializar formulário quando o SVG estiver pronto
 const checkSVG = () => {
    const muscles = document.querySelectorAll('g.muscle');
    if (muscles.length > 0) {
        initForm();
    } else {
        setTimeout(checkSVG, 50);
    }
};
checkSVG();

  // Form Pós-Treino: Inicializar formulário simples
  const esforcoInput = document.querySelector('input[name="esforco"]');
  const tempoInput = document.querySelector('input[name="tempo_treino"]');
  if (esforcoInput && tempoInput) {
      console.log('Both esforco and tempo_treino inputs found, calling initFormPos');
      initFormPos();
  }

    // Dashboard: Inicializar dashboard
    initDashboard();
    
   // Botão de Reset no Form
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Tem certeza que deseja reiniciar tudo? Todos os dados serão perdidos.')) {
                clearAllData();
                alert('Dados reiniciados com sucesso!');
                window.location.href = 'index.html';
            }
        });
    }
});

/**
 * Inicializa formulário de pós-treino
 */
function initFormPos() {
    console.log('initFormPos called');
    const form = document.getElementById('assessmentForm');
    if (!form) {
        console.log('Form not found');
        return;
    }
    
    const selectedPlayer = localStorage.getItem('selectedPlayer');
    console.log('Selected player:', selectedPlayer);
    
    // Botão de voltar
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = 'pos-treino.html';
        });
    }
    
    const esforcoInput = document.getElementById('esforco');
    const tempoTreinoInput = document.getElementById('tempo_treino');
    console.log('Inputs found:', esforcoInput, tempoTreinoInput);
    
    // Os range inputs funcionam automaticamente
    
    // Submissão do formulário
    form.addEventListener('submit', handleFormPosSubmit);
    console.log('Submit event listener added');
}

const esforcoInput = document.getElementById('esforco');
const tempoTreinoInput = document.getElementById('tempo_treino');

// Os range inputs funcionam automaticamente

// Opções da pergunta de tempo de treino
tempoTreinoOptions.forEach(option => {
    option.addEventListener('click', () => {
        tempoTreinoOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        tempoTreinoInput.value = option.dataset.value;
    });
});

/**
 * Processa envio do formulário de pós-treino
 * @param {Event} e - Evento de submit
 */
function handleFormPosSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const esforcoInput = document.getElementById('esforco');
    const tempoTreinoInput = document.getElementById('tempo_treino');

    // Coleta dados do formulário
    const selectedPlayer = localStorage.getItem('selectedPlayer');
    const tipoTreino = localStorage.getItem('tipo_treino') || 'pre';
    
    const response = {
        nome: getPlayerNameById(selectedPlayer),
        data: getCurrentDate(),
        tipo: 'pos',
        esforco: parseInt(esforcoInput.value),
        tempoTreino: parseInt(tempoTreinoInput.value),
        condicao: 'Presente' // Pós-treino sempre é para jogadores presentes
    };

    // Salva resposta
    saveResponse(response, STORAGE_KEY_POS);

    // Marca jogador como completo no pós-treino
    markPlayerCompletePos(selectedPlayer);
    
    // Verifica se todos os jogadores responderam e redireciona adequadamente
    if (allPlayersCompleted('pos')) {
        window.location.href = 'treino-liberado.html';
    } else {
        window.location.href = 'dashboard.html';
    }
}

/**
 * Marca jogador como completo no pós-treino
 * @param {string} playerId - ID do jogador
 */
function markPlayerCompletePos(playerId) {
    const completedPlayers = loadFromStorage(PLAYERS_KEY_POS, []);
    if (!completedPlayers.includes(playerId)) {
        completedPlayers.push(playerId);
        saveToStorage(PLAYERS_KEY_POS, completedPlayers);
    }
}}