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
        header = ["ID", "Nome", "Número", "Posição", "Lateralidade", "Idade", "Altura (cm)", "Peso (kg)"]
        rows = [header]
        if players:
            for player in players:
                rows.append([
                    self._str(player.get("id")),
                    self._str(player.get("name")),
                    self._str(player.get("number")),
                    self._str(player.get("position")),
                    self._str(player.get("lateralidade")),
                    self._str(player.get("age")),
                    self._str(player.get("height")),
                    self._str(player.get("weight")),
                ])
        self._update_worksheet_batch(worksheet, rows)
        print(f"✅ {len(players)} jogadores sincronizados")

    def get_players(self) -> List[Dict[str, Any]]:
        """Lê a lista de jogadores da aba 'Jogadores'. Retorna lista de dict com id, name, number, position, lateralidade."""
        try:
            worksheet = self.spreadsheet.worksheet("Jogadores")
            all_rows = worksheet.get_all_values()
            if not all_rows or len(all_rows) < 2:
                return []
            # Cabeçalho: ID, Nome, Número, Posição, Lateralidade, ...
            data_rows = all_rows[1:]
            result = []
            for row in data_rows:
                if not row or not self._str(row[0]).strip():
                    continue
                num_val = None
                if len(row) > 2 and row[2].strip():
                    try:
                        num_val = int(float(str(row[2]).replace(",", ".")))
                    except (ValueError, TypeError):
                        num_val = row[2]
                result.append({
                    "id": self._str(row[0]).strip() or None,
                    "name": self._str(row[1]).strip() if len(row) > 1 else "",
                    "number": num_val if num_val is not None else (row[2] if len(row) > 2 else None),
                    "position": self._str(row[3]).strip() if len(row) > 3 else "",
                    "lateralidade": self._str(row[4]).strip() if len(row) > 4 else None,
                })
            return result
        except Exception as e:
            print(f"⚠️ get_players: {e}")
            raise
    
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

        # Coletar respostas: de training.responses e também do array "responses" (totem pode só enviar responses)
        all_responses = []
        seen = set()  # (playerId, trainingId, mode, timestamp) para evitar duplicata
        if trainings:
            for training in trainings:
                training_responses = training.get("responses", [])
                for resp in training_responses:
                    key = (resp.get("playerId"), training.get("id"), training.get("mode", ""), resp.get("timestamp", ""))
                    if key not in seen:
                        seen.add(key)
                        all_responses.append({
                            **resp,
                            "mode": training.get("mode", ""),
                            "trainingId": training.get("id", ""),
                            "trainingDate": training.get("dateFormatted", training.get("date", ""))
                        })
        # Incluir respostas do payload (ex.: totem que não salva no treino)
        for resp in (responses or []):
            key = (resp.get("playerId"), resp.get("trainingId", ""), resp.get("mode", ""), resp.get("timestamp", ""))
            if key not in seen:
                seen.add(key)
                all_responses.append({
                    **resp,
                    "mode": resp.get("mode", ""),
                    "trainingId": resp.get("trainingId", ""),
                    "trainingDate": resp.get("trainingDate", resp.get("dateFormatted", ""))
                })

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

        # --- Aba "pre": formato igual ao tester - pre.csv (referência) ---
        # Colunas: ID Treino, Data Treino, Modo, ID Jogador, Nome Jogador, Data/Hora, Comentário, depois uma coluna por pergunta (sem "Estado atual")
        worksheet_pre = self._get_or_create_worksheet("pre")
        header_pre = [
            "ID Treino", "Data Treino", "Modo", "ID Jogador", "Nome Jogador", "Data/Hora", "Comentário"
        ] + pre_questions
        rows_pre = [header_pre]
        for response in pre_responses:
            answers = response.get("answers", {}) or {}
            row = [
                self._str(response.get("trainingId", "")),
                self._str(response.get("trainingDate", "")),
                "Pré",
                self._str(response.get("playerId", response.get("playerNumber", ""))),
                self._str(response.get("playerName", "")),
                self._str(response.get("timestamp", "")),
                self._str(response.get("comment", "")),
            ]
            # Se answers vier como lista por índice (fallback), usar por posição
            answers_list = response.get("answers_list")
            if answers_list is None and isinstance(answers, list):
                answers_list = answers
            for idx, q_text in enumerate(pre_questions):
                answer = ""
                if isinstance(answers, dict):
                    answer = answers.get(q_text)
                    if answer is None and q_text:
                        for k, v in answers.items():
                            if (k or "").strip() == (q_text or "").strip():
                                answer = v
                                break
                if answer is None and answers_list is not None and 0 <= idx < len(answers_list):
                    answer = answers_list[idx]
                if isinstance(answer, list):
                    answer = "; ".join(str(a) for a in answer)
                else:
                    answer = str(answer) if answer is not None and answer != "" else ""
                row.append(self._str(answer))
            rows_pre.append(row)
        self._update_worksheet_batch(worksheet_pre, rows_pre)
        print(f"✅ {len(pre_responses)} respostas (pré-treino) sincronizadas na aba pre")
        for i, r in enumerate(pre_responses):
            name = r.get("playerName", "")
            n_answers = len(r.get("answers") or {})
            print(f"   [DEBUG] pré resposta {i+1}: jogador={name}, respostas={n_answers}")

        # --- Aba "pos": uma coluna por pergunta (igual ao pre) ---
        # Colunas: ID Treino, Data Treino, Modo, ID Jogador, Nome Jogador, Data/Hora, Comentário, depois uma por pergunta
        worksheet_pos = self._get_or_create_worksheet("pos")
        header_post = [
            "ID Treino", "Data Treino", "Modo", "ID Jogador", "Nome Jogador", "Data/Hora", "Comentário"
        ] + post_questions
        rows_post = [header_post]
        for response in post_responses:
            answers = response.get("answers", {}) or {}
            row = [
                self._str(response.get("trainingId", "")),
                self._str(response.get("trainingDate", "")),
                "Pós",
                self._str(response.get("playerId", response.get("playerNumber", ""))),
                self._str(response.get("playerName", "")),
                self._str(response.get("timestamp", "")),
                self._str(response.get("comment", "")),
            ]
            for q_text in post_questions:
                answer = answers.get(q_text)
                if answer is None and q_text:
                    for k, v in answers.items():
                        if (k or "").strip() == (q_text or "").strip():
                            answer = v
                            break
                if isinstance(answer, list):
                    answer = "; ".join(str(a) for a in answer)
                else:
                    answer = str(answer) if answer is not None and answer != "" else ""
                row.append(self._str(answer))
            rows_post.append(row)
        self._update_worksheet_batch(worksheet_pos, rows_post)
        if post_responses:
            print(f"✅ {len(post_responses)} respostas (pós-treino) sincronizadas na aba pos (uma coluna por pergunta)")
        else:
            print("ℹ️ Aba 'pos' criada/atualizada (sem linhas de pós-treino ainda)")

    def sync_single_training_responses(self, training: Dict[str, Any], questions: Dict[str, List[Dict[str, Any]]]):
        """Atualiza o Sheets apenas com as respostas de um treino: remove linhas antigas desse treino e adiciona as atuais."""
        training_id = self._str(training.get("id", ""))
        training_responses = training.get("responses", [])
        all_responses = []
        for resp in training_responses:
            all_responses.append({
                **resp,
                "mode": training.get("mode", ""),
                "trainingId": training.get("id", ""),
                "trainingDate": training.get("dateFormatted", training.get("date", ""))
            })
        pre_responses = [r for r in all_responses if r.get("mode") == "pre"]
        post_responses = [r for r in all_responses if r.get("mode") == "post"]
        pre_questions = [q.get("texto", "") for q in questions.get("pre", []) if q.get("texto")]
        post_questions = [q.get("texto", "") for q in questions.get("post", []) if q.get("texto")]

        def build_pre_row(response):
            answers = response.get("answers", {}) or {}
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
                answer = answers.get(q_text)
                if isinstance(answer, list):
                    answer = "; ".join(str(a) for a in answer)
                else:
                    answer = str(answer) if answer is not None and answer != "" else ""
                row.append(self._str(answer))
            return row

        def build_post_row(response):
            answers = response.get("answers", {}) or {}
            row = [
                self._str(response.get("trainingId", "")),
                self._str(response.get("trainingDate", "")),
                "Pós",
                self._str(response.get("playerId", response.get("playerNumber", ""))),
                self._str(response.get("playerName", "")),
                self._str(response.get("timestamp", "")),
                self._str(response.get("comment", "")),
            ]
            for q_text in post_questions:
                answer = answers.get(q_text)
                if isinstance(answer, list):
                    answer = "; ".join(str(a) for a in answer)
                else:
                    answer = str(answer) if answer is not None and answer != "" else ""
                row.append(self._str(answer))
            return row

        worksheet_pre = self._get_or_create_worksheet("pre")
        all_rows_pre = worksheet_pre.get_all_values()
        header_pre = (all_rows_pre[0] if all_rows_pre else ["ID Treino", "Data Treino", "Modo", "ID Jogador", "Nome Jogador", "Data/Hora", "Comentário"] + pre_questions)
        if len(header_pre) < 7 + len(pre_questions):
            header_pre = header_pre + [""] * (7 + len(pre_questions) - len(header_pre))
        kept_pre = [r for r in (all_rows_pre[1:] if len(all_rows_pre) > 1 else []) if (r[0] if len(r) > 0 else "") != training_id]
        new_pre = [build_pre_row(r) for r in pre_responses]
        rows_pre = [header_pre] + kept_pre + new_pre
        self._update_worksheet_batch(worksheet_pre, rows_pre)
        print(f"✅ Respostas do treino {training_id} (pré): {len(new_pre)} linha(s) atualizadas na aba pre")

        worksheet_pos = self._get_or_create_worksheet("pos")
        header_post = ["ID Treino", "Data Treino", "Modo", "ID Jogador", "Nome Jogador", "Data/Hora", "Comentário"] + post_questions
        all_rows_pos = worksheet_pos.get_all_values()
        kept_pos = [r for r in (all_rows_pos[1:] if len(all_rows_pos) > 1 else []) if (r[0] if len(r) > 0 else "") != training_id]
        new_pos = [build_post_row(r) for r in post_responses]
        rows_post = [header_post] + kept_pos + new_pos
        self._update_worksheet_batch(worksheet_pos, rows_post)
        print(f"✅ Respostas do treino {training_id} (pós): {len(new_pos)} linha(s) atualizadas na aba pos")

        # Atualizar aba Treinos: inserir/atualizar linha deste treino
        worksheet_treinos = self._get_or_create_worksheet("Treinos")
        header_treinos = ["ID", "Data", "Data Formatada", "Data/Hora", "Modo", "Período", "Jogadores IDs", "Número de Respostas"]
        all_rows_treinos = worksheet_treinos.get_all_values()
        data_rows_treinos = all_rows_treinos[1:] if len(all_rows_treinos) > 1 else []
        kept_treinos = [r for r in data_rows_treinos if (r[0] if len(r) > 0 else "") != training_id]
        player_ids_raw = training.get("playerIds") or training.get("player_ids") or []
        if not isinstance(player_ids_raw, list):
            player_ids_raw = []
        player_ids_str = ",".join(str(pid) for pid in player_ids_raw)
        num_responses = len(training_responses) if isinstance(training_responses, list) else 0
        new_row_treinos = [
            self._str(training.get("id")),
            self._str(training.get("date")),
            self._str(training.get("dateFormatted")),
            self._str(training.get("datetime")),
            self._str(training.get("mode")),
            self._str(training.get("period")),
            player_ids_str,
            str(num_responses),
        ]
        rows_treinos = [header_treinos] + kept_treinos + [new_row_treinos]
        self._update_worksheet_batch(worksheet_treinos, rows_treinos)
        print(f"✅ Treino {training_id} registrado na aba Treinos")

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

    def get_pre_last_rows(self, n: int = 5) -> List[List[Any]]:
        """Lê as últimas N linhas da aba 'pre' (para verificação após teste). Retorna lista de linhas (cada linha é lista de células)."""
        try:
            worksheet = self.spreadsheet.worksheet("pre")
            all_rows = worksheet.get_all_values()
            if not all_rows:
                return []
            # Primeira linha é cabeçalho; pegar últimas n linhas de dados
            header = all_rows[0]
            data_rows = all_rows[1:] if len(all_rows) > 1 else []
            last_n = data_rows[-n:] if len(data_rows) >= n else data_rows
            return [header] + last_n
        except Exception as e:
            print(f"⚠️ get_pre_last_rows: {e}")
            return []

    def _get_or_create_worksheet_append(self, name: str, header: List[Any]) -> Any:
        """Obtém ou cria uma aba (no final da planilha) e garante que a primeira linha seja o header."""
        try:
            worksheet = self.spreadsheet.worksheet(name)
        except Exception:
            worksheet = self.spreadsheet.add_worksheet(title=name, rows=1000, cols=26)
        all_rows = worksheet.get_all_values()
        if not all_rows:
            worksheet.update('A1', [header], value_input_option='USER_ENTERED')
        return worksheet

    def append_game(self, payload: Dict[str, Any]) -> None:
        """
        Acrescenta um jogo nas abas 'Jogos' e 'Jogos_Logs' (cria as abas no final se não existirem).
        payload: gameId, datetime, date, time, teamName, note, logs[] (durationMs em saídas),
        minutesPerPlayer[], playerSummaries[] (opcional: detalhe por jogador para aba Jogos_Elenco).
        """
        game_id = self._str(payload.get("gameId", ""))
        dt_raw = self._str(payload.get("datetime", ""))
        team = self._str(payload.get("teamName", ""))
        note = self._str(payload.get("note", ""))
        # date e time para exibição (opcional)
        date_display = self._str(payload.get("date", ""))
        time_display = self._str(payload.get("time", ""))
        if not date_display and dt_raw:
            try:
                from datetime import datetime as dt_parse
                d = dt_parse.fromisoformat(dt_raw.replace("Z", "+00:00"))
                date_display = d.strftime("%d/%m/%Y")
                time_display = d.strftime("%H:%M")
            except Exception:
                date_display = dt_raw
                time_display = ""

        # Aba Jogos: ID Jogo, Data, Horário, Time, ID Jogador, Nome, Número, Minutos
        header_jogos = ["ID Jogo", "Data", "Horário", "Time", "ID Jogador", "Nome", "Número", "Minutos"]
        ws_jogos = self._get_or_create_worksheet_append("Jogos", header_jogos)
        minutes_list = payload.get("minutesPerPlayer") or []
        rows_jogos = []
        for m in minutes_list:
            rows_jogos.append([
                game_id,
                date_display,
                time_display,
                team,
                self._str(m.get("playerId")),
                self._str(m.get("name")),
                self._str(m.get("number")),
                self._str(m.get("minutes")),
            ])
        if rows_jogos:
            ws_jogos.append_rows(rows_jogos, value_input_option='USER_ENTERED')

        # Aba Jogos_Logs: + coluna duração na saída (mm:ss) quando houver durationMs
        header_logs = [
            "ID Jogo",
            "Data/Hora",
            "Minuto do jogo",
            "ID Jogador",
            "Nome",
            "Número",
            "Evento",
            "Posição",
            "Duração saída",
        ]
        ws_logs = self._get_or_create_worksheet_append("Jogos_Logs", header_logs)
        logs_list = payload.get("logs") or []
        rows_logs = []
        for ev in logs_list:
            at_ms = ev.get("atMs", 0)
            min_label = self._str(ev.get("minuteLabel", ""))
            if not min_label and isinstance(at_ms, (int, float)):
                total_m = at_ms / 60000
                m = int(total_m)
                s = int((total_m - m) * 60)
                min_label = f"{m}:{s:02d}"
            dur_lbl = ""
            if ev.get("type") == "OUT" and ev.get("durationMs") is not None:
                try:
                    ms = float(ev["durationMs"])
                    dm = int(ms // 60000)
                    ds = int((ms % 60000) // 1000)
                    dur_lbl = f"{dm}:{ds:02d}"
                except (TypeError, ValueError):
                    dur_lbl = ""
            rows_logs.append([
                game_id,
                self._str(ev.get("timestamp", dt_raw)),
                min_label,
                self._str(ev.get("playerId")),
                self._str(ev.get("playerName")),
                self._str(ev.get("number")),
                "Entrada" if ev.get("type") == "IN" else "Saída",
                self._str(ev.get("posLabel", ev.get("posId", ""))),
                dur_lbl,
            ])
        if rows_logs:
            ws_logs.append_rows(rows_logs, value_input_option='USER_ENTERED')

        # Resumo por jogador: entradas, tempos, detalhe textual das permanências
        header_elenco = [
            "ID Jogo",
            "ID Jogador",
            "Nome",
            "Número",
            "Qtd entradas",
            "Tempo total em quadra",
            "Tempo no banco",
            "Detalhe permanências",
        ]
        ws_elenco = self._get_or_create_worksheet_append("Jogos_Elenco", header_elenco)
        summaries = payload.get("playerSummaries") or []
        rows_elenco = []
        for s in summaries:
            rows_elenco.append([
                game_id,
                self._str(s.get("playerId")),
                self._str(s.get("name")),
                self._str(s.get("number")),
                self._str(s.get("entryCount", "")),
                self._str(s.get("totalOnFieldLabel", "")),
                self._str(s.get("benchLabel", "")),
                self._str(s.get("stintsDetailText", "")),
            ])
        if rows_elenco:
            ws_elenco.append_rows(rows_elenco, value_input_option='USER_ENTERED')

        print(
            f"✅ Jogo {game_id} registrado: {len(rows_jogos)} Jogos, "
            f"{len(rows_logs)} Jogos_Logs, {len(rows_elenco)} Jogos_Elenco"
        )

    def get_analytics_data(self) -> Dict[str, Any]:
        """Lê abas pre, pos e Jogadores para o dashboard de acompanhamento. Retorna dados estruturados para gráficos."""
        try:
            players = self.get_players()
            pre_headers = []
            pre_rows = []
            pos_headers = []
            pos_rows = []
            try:
                ws_pre = self.spreadsheet.worksheet("pre")
                all_pre = ws_pre.get_all_values()
                if all_pre:
                    pre_headers = all_pre[0]
                    pre_rows = all_pre[1:] if len(all_pre) > 1 else []
            except Exception:
                pass
            try:
                ws_pos = self.spreadsheet.worksheet("pos")
                all_pos = ws_pos.get_all_values()
                if all_pos:
                    pos_headers = all_pos[0]
                    pos_rows = all_pos[1:] if len(all_pos) > 1 else []
            except Exception:
                pass
            return {
                "success": True,
                "players": players,
                "pre": {"headers": pre_headers, "rows": pre_rows},
                "pos": {"headers": pos_headers, "rows": pos_rows},
            }
        except Exception as e:
            print(f"⚠️ get_analytics_data: {e}")
            raise


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
        
        if data_type == "get_players":
            players = sync.get_players()
            return {"success": True, "players": players}
        if data_type == "append_game":
            if not isinstance(data, dict):
                raise ValueError("append_game requer payload como dict com gameId, datetime, logs, minutesPerPlayer")
            sync.append_game(data)
            return {"success": True, "message": "Jogo registrado nas abas Jogos e Jogos_Logs"}
        if data_type == "get_analytics":
            return sync.get_analytics_data()
        if data_type == "verify_pre":
            n = int(data) if data is not None else 5
            rows = sync.get_pre_last_rows(n)
            print(f"🔍 [DEBUG] Verificação aba pre: {len(rows)} linha(s) lida(s)")
            return {"success": True, "rows": rows}
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
        elif data_type == "single_training":
            if isinstance(data, dict) and "training" in data and "questions" in data:
                sync.sync_single_training_responses(data["training"], data["questions"])
            else:
                raise ValueError("Para 'single_training', data deve ser um dict com 'training' e 'questions'.")
        else:
            raise ValueError(f"Tipo de dado desconhecido: {data_type}")
        
        return {"success": True, "message": f"Dados sincronizados com sucesso"}
    except Exception as e:
        print(f"❌ Erro ao sincronizar: {e}")
        return {"success": False, "error": str(e)}
