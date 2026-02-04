"""
Módulo de sincronização com Google Sheets
Sincroniza jogadores, treinos, respostas e perguntas com a planilha
"""

from sheets_app import SheetsEditor, SPREADSHEET_ID
from typing import List, Dict, Any, Optional
import json


class SheetsSync:
    """Classe para sincronizar dados do app com Google Sheets"""
    
    def __init__(self, use_oauth: bool = True, credentials_path: Optional[str] = None):
        """Inicializa o sincronizador"""
        # Se credentials_path foi fornecido e não é OAuth, passa para o editor
        if credentials_path and not use_oauth:
            self.editor = SheetsEditor(use_oauth=False, credentials_path=credentials_path)
        else:
            self.editor = SheetsEditor(use_oauth=use_oauth, credentials_path=credentials_path)
        self.editor.connect(SPREADSHEET_ID)
        if self.editor.use_api_key:
            raise PermissionError("API Key não permite edição. Use OAuth ou Service Account.")
        self.spreadsheet = self.editor.spreadsheet
        
    def _get_or_create_worksheet(self, name: str) -> Any:
        """Obtém ou cria uma aba na planilha (só cria com o nome pedido: pre, pos, Jogadores, etc.)."""
        try:
            worksheet = self.spreadsheet.worksheet(name)
        except Exception:
            worksheet = self.spreadsheet.add_worksheet(title=name, rows=1000, cols=26)
        return worksheet

    def _delete_worksheet_if_exists(self, name: str) -> None:
        """Remove a aba com o nome dado se existir (evita aba 'Respostas' antiga)."""
        try:
            ws = self.spreadsheet.worksheet(name)
            self.spreadsheet.del_worksheet(ws)
            print(f"🗑️ Aba '{name}' removida (não é mais usada).")
        except Exception:
            pass  # aba não existe, nada a fazer
    
    def _update_worksheet_batch(self, worksheet, rows: List[List[Any]]):
        """Atualiza aba com lista de linhas em 2 chamadas (clear + update) para economizar quota da API."""
        worksheet.clear()
        if rows:
            worksheet.update('A1', rows, value_input_option='USER_ENTERED')

    def sync_players(self, players: List[Dict[str, Any]]):
        """Sincroniza lista de jogadores na aba 'Jogadores'"""
        worksheet = self._get_or_create_worksheet("Jogadores")
        header = ["ID", "Nome", "Número", "Posição", "Idade", "Altura (cm)", "Peso (kg)"]
        rows = [header]
        if players:
            for player in players:
                rows.append([
                    self._str(player.get("id")),
                    self._str(player.get("name")),
                    self._str(player.get("number")),
                    self._str(player.get("position")),
                    self._str(player.get("age")),
                    self._str(player.get("height")),
                    self._str(player.get("weight")),
                ])
        self._update_worksheet_batch(worksheet, rows)
        print(f"✅ {len(players)} jogadores sincronizados")
    
    def _str(self, val):
        """Converte valor para string de forma segura (evita erro 500 por tipo inesperado)."""
        if val is None:
            return ""
        if isinstance(val, (list, dict)):
            return json.dumps(val, ensure_ascii=False) if val else ""
        return str(val)

    def sync_trainings(self, trainings: List[Dict[str, Any]]):
        """Sincroniza lista de treinos na aba 'Treinos'"""
        worksheet = self._get_or_create_worksheet("Treinos")
        header = ["ID", "Data", "Data Formatada", "Data/Hora", "Modo", "Período", "Jogadores IDs", "Número de Respostas"]
        rows = [header]
        if trainings:
            for training in trainings:
                player_ids_raw = training.get("playerIds") or training.get("player_ids") or []
                if not isinstance(player_ids_raw, list):
                    player_ids_raw = []
                player_ids = ",".join(str(pid) for pid in player_ids_raw)
                responses_list = training.get("responses") or []
                num_responses = len(responses_list) if isinstance(responses_list, list) else 0
                rows.append([
                    self._str(training.get("id")),
                    self._str(training.get("date")),
                    self._str(training.get("dateFormatted")),
                    self._str(training.get("datetime")),
                    self._str(training.get("mode")),
                    self._str(training.get("period")),
                    player_ids,
                    str(num_responses),
                ])
        self._update_worksheet_batch(worksheet, rows)
        print(f"✅ {len(trainings)} treinos sincronizados")
    
    def sync_responses(self, responses: List[Dict[str, Any]], questions: Dict[str, List[Dict[str, Any]]], trainings: Optional[List[Dict[str, Any]]] = None):
        """Sincroniza respostas nas abas 'pre' e 'pos' (coluna H = Estado atual). Remove aba 'Respostas' se existir."""
        # Remover aba antiga "Respostas" se existir (só usamos "pre" e "pos")
        self._delete_worksheet_if_exists("Respostas")
        self._delete_worksheet_if_exists("Respostas Pós Treino")

        # Se trainings for fornecido, coletar todas as respostas de todos os treinos
        all_responses = []
        if trainings:
            for training in trainings:
                training_responses = training.get("responses", [])
                for resp in training_responses:
                    all_responses.append({
                        **resp,
                        "mode": training.get("mode", ""),
                        "trainingId": training.get("id", ""),
                        "trainingDate": training.get("dateFormatted", training.get("date", ""))
                    })
        else:
            all_responses = responses

        pre_responses = [r for r in all_responses if r.get("mode") == "pre"]
        post_responses = [r for r in all_responses if r.get("mode") == "post"]

        # Perguntas de pré e pós (ordem das colunas)
        pre_questions = []
        for q in questions.get("pre", []):
            t = q.get("texto", "")
            if t:
                pre_questions.append(t)

        post_questions = []
        for q in questions.get("post", []):
            t = q.get("texto", "")
            if t:
                post_questions.append(t)

        # --- Aba "pre": usa os textos das perguntas do payload (igual ao app) para buscar em answers ---
        # Assim as chaves enviadas pelo frontend (ex: "Nível de fadiga") batem com o que o backend procura
        worksheet_pre = self._get_or_create_worksheet("pre")
        header_pre = [
            "ID Treino", "Data Treino", "Modo", "ID Jogador", "Nome Jogador", "Data/Hora", "Comentário"
        ] + pre_questions + ["Estado atual"]
        rows_pre = [header_pre]
        for response in pre_responses:
            answers = response.get("answers", {})
            row = [
                self._str(response.get("trainingId", "")),
                self._str(response.get("trainingDate", "")),
                "Pré",
                self._str(response.get("playerId", response.get("playerNumber", ""))),
                self._str(response.get("playerName", "")),
                self._str(response.get("timestamp", "")),
                self._str(response.get("comment", "")),
            ]
            for q_text in pre_questions:
                answer = answers.get(q_text, "")
                if isinstance(answer, list):
                    answer = "; ".join(str(a) for a in answer)
                else:
                    answer = str(answer) if answer is not None else ""
                row.append(self._str(answer))
            row.append("")  # Estado atual (pre)
            rows_pre.append(row)
        self._update_worksheet_batch(worksheet_pre, rows_pre)
        print(f"✅ {len(pre_responses)} respostas (pré-treino) sincronizadas na aba pre")

        # --- Aba "pos": estrutura igual ao tester - pos.csv ---
        # ID Treino, Data Treino, Modo, ID Jogador, Nome Jogador, Data/Hora, Comentário, Estado atual (coluna H)
        worksheet_pos = self._get_or_create_worksheet("pos")
        header_post = ["ID Treino", "Data Treino", "Modo", "ID Jogador", "Nome Jogador", "Data/Hora", "Comentário", "Estado atual"]
        rows_post = [header_post]
        for response in post_responses:
            answers = response.get("answers", {})
            parts = []
            for q_text in post_questions:
                answer = answers.get(q_text, "")
                if isinstance(answer, list):
                    answer = "; ".join(str(a) for a in answer)
                else:
                    answer = str(answer) if answer is not None else ""
                if answer:
                    parts.append(answer)
            estado_atual = "; ".join(parts) if parts else ""
            row = [
                self._str(response.get("trainingId", "")),
                self._str(response.get("trainingDate", "")),
                "Pós",
                self._str(response.get("playerId", response.get("playerNumber", ""))),
                self._str(response.get("playerName", "")),
                self._str(response.get("timestamp", "")),
                self._str(response.get("comment", "")),
                self._str(estado_atual),  # coluna H = Estado atual
            ]
            rows_post.append(row)
        self._update_worksheet_batch(worksheet_pos, rows_post)
        if post_responses:
            print(f"✅ {len(post_responses)} respostas (pós-treino) sincronizadas na aba pos (coluna H = Estado atual)")
        else:
            print("ℹ️ Aba 'pos' criada/atualizada (sem linhas de pós-treino ainda)")
    
    def sync_questions(self, questions: Dict[str, List[Dict[str, Any]]]):
        """Sincroniza configuração de perguntas na aba 'Perguntas'"""
        worksheet = self._get_or_create_worksheet("Perguntas")
        header = ["Modo", "Tipo", "Texto", "Opções", "Imagem"]
        rows = [header]
        for mode in ["pre", "post"]:
            for q in questions.get(mode, []):
                opcoes = "; ".join(q.get("opcoes", [])) if q.get("opcoes") else ""
                rows.append([
                    "Pré" if mode == "pre" else "Pós",
                    self._str(q.get("tipo")),
                    self._str(q.get("texto")),
                    self._str(opcoes),
                    self._str(q.get("imagem")),
                ])
        self._update_worksheet_batch(worksheet, rows)
        total = len(questions.get("pre", [])) + len(questions.get("post", []))
        print(f"✅ {total} perguntas sincronizadas")
    
    def sync_all(self, players: List[Dict], trainings: List[Dict], 
                 responses: List[Dict], questions: Dict[str, List[Dict]]):
        """Sincroniza todos os dados de uma vez"""
        print("🔄 Iniciando sincronização completa...")
        self.sync_players(players)
        self.sync_trainings(trainings)
        self.sync_responses(responses, questions, trainings)
        self.sync_questions(questions)
        print("✅ Sincronização completa finalizada!")


def sync_data(data_type: str, data: Any, questions: Optional[Dict] = None):
    """
    Função auxiliar para sincronizar um tipo específico de dado
    
    Args:
        data_type: 'players', 'trainings', 'responses', 'questions', ou 'all'
        data: Os dados a serem sincronizados
        questions: Perguntas (necessário apenas para sync_responses)
    """
    try:
        import os
        import json
        
        # Em produção (Render), tenta Service Account primeiro, depois OAuth
        use_oauth = True
        credentials_path = None
        
        if os.getenv('RENDER') or os.getenv('PORT'):
            # Em produção, tenta Service Account primeiro
            # Render coloca Secret Files em /etc/secrets/ ou na raiz
            possible_paths = [
                os.getenv('GOOGLE_APPLICATION_CREDENTIALS'),  # Variável de ambiente com caminho
                '/etc/secrets/GOOGLE_APPLICATION_CREDENTIALS',  # Render Secret File padrão
                'GOOGLE_APPLICATION_CREDENTIALS',  # Na raiz do projeto
                'service-account.json',  # Nome alternativo
                'futsal-476923-19e955d7ed78.json',  # Nome do arquivo existente
            ]
            
            # Tenta encontrar o arquivo
            for path in possible_paths:
                if path and os.path.exists(path):
                    credentials_path = path
                    use_oauth = False
                    print(f"📊 Service Account encontrado: {path}")
                    break
            
            # Se não encontrou arquivo, tenta ler da variável de ambiente (JSON direto)
            if use_oauth:
                creds_json_str = os.getenv('GOOGLE_CREDENTIALS_JSON')
                if creds_json_str:
                    try:
                        # Valida se é JSON válido
                        json.loads(creds_json_str)
                        # Cria arquivo temporário
                        temp_path = '/tmp/service-account.json'
                        with open(temp_path, 'w') as f:
                            f.write(creds_json_str)
                        credentials_path = temp_path
                        use_oauth = False
                        print("📊 Service Account encontrado em variável de ambiente GOOGLE_CREDENTIALS_JSON")
                    except Exception as e:
                        print(f"⚠️  Erro ao processar GOOGLE_CREDENTIALS_JSON: {e}")
                
                # Tenta também ler do Secret File do Render (conteúdo direto)
                if use_oauth:
                    secret_file_path = '/etc/secrets/GOOGLE_APPLICATION_CREDENTIALS'
                    if os.path.exists(secret_file_path):
                        # Pode ser um arquivo JSON ou caminho para arquivo
                        try:
                            with open(secret_file_path, 'r') as f:
                                content = f.read().strip()
                                # Se parece com JSON, tenta usar
                                if content.startswith('{'):
                                    json.loads(content)  # Valida
                                    temp_path = '/tmp/service-account-from-secret.json'
                                    with open(temp_path, 'w') as f:
                                        f.write(content)
                                    credentials_path = temp_path
                                    use_oauth = False
                                    print("📊 Service Account encontrado em Secret File do Render")
                                else:
                                    # Pode ser um caminho
                                    if os.path.exists(content):
                                        credentials_path = content
                                        use_oauth = False
                                        print(f"📊 Service Account encontrado no caminho: {content}")
                        except Exception as e:
                            print(f"⚠️  Erro ao ler Secret File: {e}")
            
            if use_oauth:
                print("⚠️  Service Account não encontrado, tentando OAuth...")
        
        sync = SheetsSync(use_oauth=use_oauth, credentials_path=credentials_path)
        
        if data_type == "players":
            sync.sync_players(data)
        elif data_type == "trainings":
            sync.sync_trainings(data)
        elif data_type == "responses":
            if questions is None:
                raise ValueError("Perguntas são necessárias para sincronizar respostas")
            # Se data é dict com trainings, usar trainings; senão usar lista de respostas
            if isinstance(data, dict) and "trainings" in data:
                trainings = data.get("trainings")
                responses_list = data.get("responses", [])
            else:
                trainings = None
                responses_list = data if isinstance(data, list) else []
            sync.sync_responses(responses_list, questions, trainings)
        elif data_type == "questions":
            sync.sync_questions(data)
        elif data_type == "all":
            if isinstance(data, dict) and "players" in data and "trainings" in data:
                sync.sync_all(
                    data["players"],
                    data["trainings"],
                    data.get("responses", []),
                    data.get("questions", {"pre": [], "post": []})
                )
            else:
                raise ValueError("Para 'all', data deve ser um dict com 'players', 'trainings', etc.")
        else:
            raise ValueError(f"Tipo de dado desconhecido: {data_type}")
        
        return {"success": True, "message": f"Dados sincronizados com sucesso"}
    except Exception as e:
        print(f"❌ Erro ao sincronizar: {e}")
        return {"success": False, "error": str(e)}
