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
        self.editor = SheetsEditor(use_oauth=use_oauth, credentials_path=credentials_path)
        self.editor.connect(SPREADSHEET_ID)
        if self.editor.use_api_key:
            raise PermissionError("API Key não permite edição. Use OAuth ou Service Account.")
        self.spreadsheet = self.editor.spreadsheet
        
    def _get_or_create_worksheet(self, name: str) -> Any:
        """Obtém ou cria uma aba na planilha"""
        try:
            worksheet = self.spreadsheet.worksheet(name)
        except:
            # Se não existe, cria
            worksheet = self.spreadsheet.add_worksheet(title=name, rows=1000, cols=26)
        return worksheet
    
    def sync_players(self, players: List[Dict[str, Any]]):
        """Sincroniza lista de jogadores na aba 'Jogadores'"""
        worksheet = self._get_or_create_worksheet("Jogadores")
        
        # Cabeçalho
        header = ["ID", "Nome", "Número", "Posição", "Idade", "Altura (cm)", "Peso (kg)"]
        worksheet.clear()
        worksheet.append_row(header)
        
        # Dados
        if players:
            for player in players:
                row = [
                    player.get("id", ""),
                    player.get("name", ""),
                    player.get("number", ""),
                    player.get("position", ""),
                    player.get("age", ""),
                    player.get("height", ""),
                    player.get("weight", "")
                ]
                worksheet.append_row(row)
        
        print(f"✅ {len(players)} jogadores sincronizados")
    
    def sync_trainings(self, trainings: List[Dict[str, Any]]):
        """Sincroniza lista de treinos na aba 'Treinos'"""
        worksheet = self._get_or_create_worksheet("Treinos")
        
        # Cabeçalho
        header = ["ID", "Data", "Data Formatada", "Data/Hora", "Modo", "Período", "Jogadores IDs", "Número de Respostas"]
        worksheet.clear()
        worksheet.append_row(header)
        
        # Dados
        if trainings:
            for training in trainings:
                player_ids = ",".join(training.get("playerIds", []))
                num_responses = len(training.get("responses", []))
                
                row = [
                    training.get("id", ""),
                    training.get("date", ""),
                    training.get("dateFormatted", ""),
                    training.get("datetime", ""),
                    training.get("mode", ""),
                    training.get("period", ""),
                    player_ids,
                    num_responses
                ]
                worksheet.append_row(row)
        
        print(f"✅ {len(trainings)} treinos sincronizados")
    
    def sync_responses(self, responses: List[Dict[str, Any]], questions: Dict[str, List[Dict[str, Any]]], trainings: Optional[List[Dict[str, Any]]] = None):
        """Sincroniza todas as respostas na aba 'Respostas'"""
        worksheet = self._get_or_create_worksheet("Respostas")
        
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
        
        # Coletar todas as perguntas possíveis para criar cabeçalho dinâmico
        all_questions = []
        question_map = {}
        
        for mode in ["pre", "post"]:
            for q in questions.get(mode, []):
                q_text = q.get("texto", "")
                if q_text and q_text not in question_map:
                    question_map[q_text] = len(all_questions)
                    all_questions.append(q_text)
        
        # Cabeçalho
        header = ["ID Treino", "Data Treino", "Modo", "ID Jogador", "Nome Jogador", "Data/Hora", "Comentário"]
        header.extend(all_questions)
        worksheet.clear()
        worksheet.append_row(header)
        
        # Dados
        for response in all_responses:
            answers = response.get("answers", {})
            row = [
                response.get("trainingId", ""),
                response.get("trainingDate", ""),
                "Pré" if response.get("mode") == "pre" else "Pós",
                response.get("playerId", ""),
                response.get("playerName", ""),
                response.get("timestamp", ""),
                response.get("comment", "")
            ]
            
            # Adicionar respostas na ordem das perguntas
            for q_text in all_questions:
                answer = answers.get(q_text, "")
                if isinstance(answer, list):
                    answer = "; ".join(str(a) for a in answer)
                else:
                    answer = str(answer) if answer is not None else ""
                row.append(answer)
            
            worksheet.append_row(row)
        
        print(f"✅ {len(all_responses)} respostas sincronizadas")
    
    def sync_questions(self, questions: Dict[str, List[Dict[str, Any]]]):
        """Sincroniza configuração de perguntas na aba 'Perguntas'"""
        worksheet = self._get_or_create_worksheet("Perguntas")
        
        # Cabeçalho
        header = ["Modo", "Tipo", "Texto", "Opções", "Imagem"]
        worksheet.clear()
        worksheet.append_row(header)
        
        # Dados
        for mode in ["pre", "post"]:
            for q in questions.get(mode, []):
                opcoes = "; ".join(q.get("opcoes", [])) if q.get("opcoes") else ""
                row = [
                    "Pré" if mode == "pre" else "Pós",
                    q.get("tipo", ""),
                    q.get("texto", ""),
                    opcoes,
                    q.get("imagem", "")
                ]
                worksheet.append_row(row)
        
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
        # Em produção (Render), tenta Service Account primeiro, depois OAuth
        use_oauth = True
        if os.getenv('RENDER') or os.getenv('PORT'):
            # Em produção, tenta Service Account primeiro
            service_account_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
            if service_account_path and os.path.exists(service_account_path):
                use_oauth = False
                print("📊 Usando Service Account em produção")
            else:
                print("⚠️  Service Account não encontrado, tentando OAuth...")
        
        sync = SheetsSync(use_oauth=use_oauth)
        
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
