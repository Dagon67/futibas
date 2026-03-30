"""
Serviço Flask para sincronização com Google Sheets
Recebe requisições do JavaScript e sincroniza dados
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from sheets_sync import sync_data
import json
import os
import time
import base64
import urllib.error
import urllib.request
from urllib.parse import quote
from werkzeug.utils import secure_filename
from datetime import datetime
from contextlib import nullcontext

# Raiz do repositório (uploads/ e pastas pre|pos ficam na raiz, não em backend/legacy)
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.dirname(os.path.dirname(_BACKEND_DIR))

app = Flask(__name__)
# CORS: permitir qualquer origem (localhost, file:// com origin null, app hospedado)
# Sem isso, ao abrir index.html por file:// o navegador bloqueia por origin 'null'
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type"]}})

# Configuração de upload (sempre relativo à raiz do repo)
UPLOAD_FOLDER = os.path.join(_REPO_ROOT, 'uploads', 'players')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB

# Criar pasta de uploads se não existir
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _truthy_env(name, default=False):
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in ('1', 'true', 'yes', 'on')


def _try_git_commit_player_photo(filepath, filename):
    """
    git add + commit do ficheiro (persistência no repositório até migrares p. ex. Storage).
    Por defeito ativo (GIT_AUTO_COMMIT=true). Desativar: GIT_AUTO_COMMIT=false
    Push opcional: GIT_AUTO_PUSH=true (requer credenciais no ambiente, ex. gh ou SSH).
    """
    if not _truthy_env('GIT_AUTO_COMMIT', default=True):
        return
    try:
        import subprocess
        repo_root = _REPO_ROOT
        git_dir = os.path.join(repo_root, '.git')
        if not os.path.isdir(git_dir):
            print(
                "⚠️ Git: pasta .git não encontrada — commit ignorado "
                "(normal em deploy sem repo; em local, clone com .git)."
            )
            return

        rel = os.path.relpath(filepath, repo_root).replace('\\', '/')
        r = subprocess.run(
            ['git', 'add', '--', rel],
            cwd=repo_root,
            capture_output=True,
            text=True,
            timeout=15,
        )
        if r.returncode != 0:
            print("⚠️ git add:", (r.stderr or r.stdout or '').strip())
            return

        msg = f'chore(photos): jogador {filename}'
        name = os.getenv('GIT_COMMITTER_NAME', '').strip()
        email = os.getenv('GIT_COMMITTER_EMAIL', '').strip()
        if name and email:
            commit_cmd = [
                'git',
                '-c', f'user.name={name}',
                '-c', f'user.email={email}',
                'commit',
                '-m', msg,
            ]
        else:
            commit_cmd = ['git', 'commit', '-m', msg]

        r2 = subprocess.run(
            commit_cmd,
            cwd=repo_root,
            capture_output=True,
            text=True,
            timeout=15,
        )
        out = (r2.stdout or '') + (r2.stderr or '')
        if r2.returncode != 0:
            if 'nothing to commit' in out.lower() or 'no changes added to commit' in out.lower():
                print("ℹ️ Git: nada de novo a commitar para esta foto.")
            else:
                print("⚠️ git commit:", out.strip())
            return

        print(f"✅ Foto commitada no Git: {filename}")

        if _truthy_env('GIT_AUTO_PUSH', default=False):
            r3 = subprocess.run(
                ['git', 'push'],
                cwd=repo_root,
                capture_output=True,
                text=True,
                timeout=90,
                env={**os.environ, 'GIT_TERMINAL_PROMPT': '0'},
            )
            if r3.returncode != 0:
                print("⚠️ git push:", (r3.stderr or r3.stdout or '').strip())
            else:
                print("✅ git push concluído")
    except Exception as e:
        print(f"⚠️ Git (commit/push opcional): {e}")


def _try_github_upload_player_photo(image_data: bytes, filename: str):
    """
    Grava a imagem no repositório GitHub via Contents API (funciona no Render sem pasta .git).
    Requer: GITHUB_TOKEN (fine-grained: Contents read/write no repo) e GITHUB_REPO=owner/nome.
    Opcional: GITHUB_BRANCH (default main).

    Retorna URL absoluta (raw.githubusercontent.com) se o upload tiver sucesso e
    PLAYER_PHOTO_USE_RENDER_URL não for true; caso contrário None (usa URL do próprio servidor).
    Repositório privado: raw pode falhar no browser; use PLAYER_PHOTO_USE_RENDER_URL=true.
    """
    token = os.getenv("GITHUB_TOKEN", "").strip()
    repo = os.getenv("GITHUB_REPO", "").strip()
    if not token or not repo or "/" not in repo:
        return None
    branch = (os.getenv("GITHUB_BRANCH") or "main").strip() or "main"
    path_in_repo = f"uploads/players/{filename}"
    path_encoded = quote(path_in_repo, safe="/")
    api_url = f"https://api.github.com/repos/{repo}/contents/{path_encoded}"

    payload = {
        "message": f"chore(photos): jogador {filename}",
        "content": base64.b64encode(image_data).decode("ascii"),
        "branch": branch,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(api_url, data=data, method="PUT")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    req.add_header("User-Agent", "Tutem-Backend-PlayerPhoto")
    req.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            if resp.status not in (200, 201):
                print(f"⚠️ GitHub API: status inesperado {resp.status}")
                return None
            resp.read()
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        print(f"⚠️ GitHub API upload falhou ({e.code}): {err_body[:800]}")
        return None
    except Exception as e:
        print(f"⚠️ GitHub API upload: {e}")
        return None

    if _truthy_env("PLAYER_PHOTO_USE_RENDER_URL", default=False):
        print(f"✅ Foto enviada ao GitHub (repo); URL de resposta = servidor Render")
        return None

    owner, repo_name = repo.split("/", 1)
    raw_url = (
        f"https://raw.githubusercontent.com/{owner}/{repo_name}/{branch}/{path_in_repo}"
    )
    print(f"✅ Foto gravada no GitHub: {path_in_repo}")
    return raw_url


@app.route('/', methods=['GET'])
def root():
    """Endpoint raiz"""
    return jsonify({
        "status": "ok",
        "service": "Tutem - Sistema de Monitoramento de Treinos",
        "endpoints": {
            "health": "/health",
            "sync": "/sync",
            "sync_all": "/sync/all",
            "sync_training": "/sync/training"
        }
    })


@app.route('/health', methods=['GET'])
def health():
    """Endpoint de health check"""
    return jsonify({"status": "ok"})


@app.route('/upload/player-photo', methods=['POST'])
def upload_player_photo():
    """Endpoint para upload de foto de jogador"""
    try:
        data = request.json
        
        if not data or 'photo' not in data:
            return jsonify({"success": False, "error": "Foto não fornecida"}), 400
        
        # Foto vem como Base64 data URL
        photo_data = data['photo']
        player_id = data.get('playerId', 'unknown')
        
        # Validar formato Base64
        if not photo_data.startswith('data:image/'):
            return jsonify({"success": False, "error": "Formato de imagem inválido"}), 400
        
        # Extrair dados da imagem
        header, encoded = photo_data.split(',', 1)
        image_format = header.split('/')[1].split(';')[0]  # jpeg, png, etc
        
        # Decodificar Base64
        image_data = base64.b64decode(encoded)
        
        # Validar tamanho
        if len(image_data) > MAX_FILE_SIZE:
            return jsonify({"success": False, "error": "Imagem muito grande (máximo 2MB)"}), 400
        
        # Gerar nome do arquivo
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"{player_id}_{timestamp}.{image_format}"
        filename = secure_filename(filename)
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        # Salvar arquivo
        with open(filepath, 'wb') as f:
            f.write(image_data)

        _try_git_commit_player_photo(filepath, filename)

        github_url = _try_github_upload_player_photo(image_data, filename)
        if github_url:
            photo_url = github_url
            stored_github = True
        else:
            photo_url = f"/uploads/players/{filename}"
            stored_github = False

        return jsonify({
            "success": True,
            "photoUrl": photo_url,
            "filename": filename,
            "storedInGithub": stored_github,
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/uploads/players/<filename>')
def serve_player_photo(filename):
    """Serve fotos de jogadores"""
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.route('/times/<path:filename>')
def serve_times_logo(filename):
    """Serve logos/asset dos tenants (pasta /times na raiz do repo)."""
    times_dir = os.path.join(_REPO_ROOT, "times")
    return send_from_directory(times_dir, filename)


# Pastas de imagens para perguntas (pre/ e pos/) - relativas à raiz do projeto
IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'}


@app.route('/api/images/<folder>', methods=['GET'])
def list_images(folder):
    """Lista todos os arquivos de imagem da pasta pre ou pos"""
    if folder not in ('pre', 'pos'):
        return jsonify({"success": False, "error": "Pasta inválida"}), 400
    try:
        folder_path = os.path.join(_REPO_ROOT, folder)
        if not os.path.isdir(folder_path):
            return jsonify({"success": True, "images": []}), 200
        files = []
        for name in os.listdir(folder_path):
            if os.path.isfile(os.path.join(folder_path, name)):
                ext = name.rsplit('.', 1)[-1].lower() if '.' in name else ''
                if ext in IMAGE_EXTENSIONS:
                    files.append(name)
        files.sort()
        return jsonify({"success": True, "images": files}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/sync', methods=['POST'])
def sync():
    """Endpoint principal para sincronização"""
    try:
        data = request.json
        
        if not data:
            return jsonify({"success": False, "error": "Nenhum dado fornecido"}), 400
        
        data_type = data.get("type")
        payload = data.get("data")
        questions = data.get("questions")
        trainings = data.get("trainings")  # Para respostas, pode incluir treinos
        
        if not data_type:
            return jsonify({"success": False, "error": "Tipo de dado não especificado"}), 400
        
        if not payload:
            return jsonify({"success": False, "error": "Dados não fornecidos"}), 400
        
        # Para respostas, incluir treinos se disponível
        if data_type == "responses" and trainings:
            payload = {"responses": payload, "trainings": trainings}
        
        # Sincronizar
        result = sync_data(data_type, payload, questions)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/sync/all', methods=['POST'])
def sync_all():
    """Sincroniza todos os dados de uma vez"""
    try:
        data = request.json
        
        if not data:
            return jsonify({"success": False, "error": "Nenhum dado fornecido"}), 400
        
        result = sync_data("all", data)
        
        if result["success"]:
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/sync/training', methods=['POST'])
def sync_training():
    """Sincroniza apenas as respostas de um treino específico (substitui linhas desse treino no Sheets)."""
    try:
        data = request.json
        if not data or "training" not in data or "questions" not in data:
            return jsonify({"success": False, "error": "Envie { training, questions }"}), 400
        result = sync_data("single_training", data)
        if result["success"]:
            return jsonify(result), 200
        return jsonify(result), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/players', methods=['GET'])
def get_players():
    """Retorna a lista de jogadores da aba 'Jogadores' do Sheets."""
    try:
        result = sync_data("get_players", None)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/sync/players', methods=['POST'])
def sync_players():
    """Envia a lista de jogadores do app para o Sheets (sobrescreve a aba Jogadores)."""
    try:
        data = request.json
        if not data or "players" not in data:
            return jsonify({"success": False, "error": "Envie { players: [...] }"}), 400
        result = sync_data("players", data["players"])
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/analytics', methods=['GET'])
def get_analytics():
    """Retorna dados das abas pre, pos e Jogadores para o dashboard de acompanhamento."""
    try:
        result = sync_data("get_analytics", None)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# --- Insights (Gemini Flash): cache por fingerprint + intervalo global (protege cota gratuita) ---
_INSIGHTS_LOCK = None
try:
    import threading
    _INSIGHTS_LOCK = threading.Lock()
except Exception:
    _INSIGHTS_LOCK = None

_INSIGHTS_BY_FP = {}  # fingerprint -> {"ts": float, "insights": list}
_LAST_GLOBAL_INSIGHTS_CALL = 0.0
# Entre chamadas reais ao modelo (qualquer fingerprint). Env: GEMINI_INSIGHTS_COOLDOWN_S (default 600 = 10 min)
try:
    INSIGHTS_GLOBAL_COOLDOWN_S = max(120, int(os.getenv("GEMINI_INSIGHTS_COOLDOWN_S", "600")))
except ValueError:
    INSIGHTS_GLOBAL_COOLDOWN_S = 600
INSIGHTS_FP_CACHE_TTL_S = 86400  # 24h reutiliza mesma análise se dados iguais

# GET /games/live: cache em memória para não martelar a API do Sheets (vários tablets / dash)
_GAMES_LIVE_READ_CACHE = {}  # chave -> (expiry_ts, dict)
try:
    _GAMES_LIVE_CACHE_TTL = float(os.getenv("GAMES_LIVE_CACHE_SECONDS", "12"))
except ValueError:
    _GAMES_LIVE_CACHE_TTL = 12.0

# Insights por jogo (relatório): no máximo 1 geração nova por jogo a cada 7 dias (configurável)
_GAME_INSIGHTS_BY_GAME_ID = {}
try:
    GAME_INSIGHTS_TTL_S = max(86400, int(os.getenv("GEMINI_GAME_INSIGHTS_TTL_S", str(7 * 86400))))
except ValueError:
    GAME_INSIGHTS_TTL_S = 7 * 86400


def _insights_parse_gemini_json(text):
    """Extrai lista de 5 strings do texto da IA (JSON ou fallback)."""
    if not text:
        return []
    t = text.strip()
    try:
        obj = json.loads(t)
        if isinstance(obj, dict) and "insights" in obj and isinstance(obj["insights"], list):
            return [str(x).strip() for x in obj["insights"] if str(x).strip()][:5]
    except Exception:
        pass
    lines = [ln.strip().lstrip("0123456789.-) ") for ln in t.splitlines() if ln.strip()]
    return lines[:5]


def _parse_game_insights_json(text):
    """JSON da análise de jogo: resumoTime, porAtleta, observacoes."""
    if not text:
        return None
    t = text.strip()
    try:
        obj = json.loads(t)
        if isinstance(obj, dict) and "resumoTime" in obj:
            return obj
    except Exception:
        pass
    return None


def _insights_call_gemini(prompt):
    import requests
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None, "GEMINI_API_KEY não configurada no servidor (Render → Environment).", None, None
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite").strip()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    base_cfg = {
        "temperature": 0.35,
        "maxOutputTokens": 1024,
    }
    attempts = [
        {**base_cfg, "responseMimeType": "application/json"},
        base_cfg,
    ]
    last_err = None
    last_status = None
    retry_after_ms = None
    for gen_cfg in attempts:
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": gen_cfg,
        }
        r = requests.post(url, params={"key": api_key}, json=body, timeout=60)
        if r.status_code != 200:
            try:
                err = r.json()
            except Exception:
                err = {"raw": r.text[:500]}
            last_status = r.status_code
            # RetryInfo costuma vir em details[].retryDelay como "45s"
            try:
                details = (err.get("error") or {}).get("details") or []
                for d in details:
                    rd = d.get("retryDelay")
                    if isinstance(rd, str) and rd.endswith("s"):
                        retry_after_ms = int(float(rd[:-1]) * 1000)
                        break
            except Exception:
                retry_after_ms = None
            last_err = f"Gemini HTTP {r.status_code}: {err}"
            continue
        data = r.json()
        try:
            parts = data["candidates"][0]["content"]["parts"]
            text = "".join(p.get("text", "") for p in parts)
        except (KeyError, IndexError, TypeError):
            last_err = "Resposta Gemini inesperada."
            continue
        return text, None, None, None
    return None, last_err or "Falha ao chamar Gemini.", last_status, retry_after_ms


@app.route('/insights', methods=['POST'])
def post_insights():
    """
    Gera 5 insights em PT-BR a partir de um resumo numérico (JSON) enviado pelo cliente.
    Proteção de cota: cache 24h por fingerprint; intervalo mínimo entre chamadas ao modelo (env GEMINI_INSIGHTS_COOLDOWN_S, default 600s).
    """
    global _LAST_GLOBAL_INSIGHTS_CALL, _INSIGHTS_BY_FP
    try:
        payload = request.get_json(silent=True) or {}
        summary = (payload.get("summary") or "").strip()
        fp = (payload.get("fingerprint") or "").strip()
        if not summary or len(summary) > 12000:
            return jsonify({"success": False, "error": "Resumo inválido ou muito longo."}), 400
        if not fp or len(fp) != 64:
            return jsonify({"success": False, "error": "fingerprint inválido."}), 400

        if not os.getenv("GEMINI_API_KEY", "").strip():
            return jsonify({
                "success": False,
                "error": "GEMINI_API_KEY não configurada no servidor (Render → Environment).",
                "hint": "Adicione a variável GEMINI_API_KEY no serviço Web (não no Static Site), salve e faça redeploy.",
            }), 503

        lock = _INSIGHTS_LOCK if _INSIGHTS_LOCK else nullcontext()
        with lock:
            now = time.time()
            ent = _INSIGHTS_BY_FP.get(fp)
            if ent and now - ent.get("ts", 0) <= INSIGHTS_FP_CACHE_TTL_S:
                cached_insights = ent.get("insights")
                if cached_insights and len(cached_insights) >= 5:
                    return jsonify({
                        "success": True,
                        "insights": cached_insights[:5],
                        "fingerprint": fp,
                        "cached": True,
                    }), 200
            elif ent:
                _INSIGHTS_BY_FP.pop(fp, None)

            if now - _LAST_GLOBAL_INSIGHTS_CALL < INSIGHTS_GLOBAL_COOLDOWN_S:
                retry_ms = int((INSIGHTS_GLOBAL_COOLDOWN_S - (now - _LAST_GLOBAL_INSIGHTS_CALL)) * 1000)
                fallback = None
                if _INSIGHTS_BY_FP:
                    try:
                        newest = max(_INSIGHTS_BY_FP.values(), key=lambda x: x.get("ts", 0))
                        fallback = newest.get("insights")
                    except Exception:
                        fallback = None
                return jsonify({
                    "success": False,
                    "error": "rate_limited",
                    "message": "Limite de frequência: aguarde antes de gerar nova análise (proteção de cota).",
                    "retryAfterMs": max(0, retry_ms),
                    "insights": (fallback or [])[:5],
                }), 429

            prompt = (
                "Você é analista de desempenho de futsal (Jaraguá, Brasil). Use APENAS o JSON abaixo.\n"
                "Gere exatamente 5 insights em português, linguagem clara para comissão técnica (não técnica demais).\n\n"
                "Estilo obrigatório:\n"
                "- Se citar um atleta, use o NOME (campo name/topInjured), nunca só ID.\n"
                "- Para carga, ACWR, monotonia ou percentuais: diga se está ALTO, MODERADO ou BAIXO em relação ao esperado; "
                "se usar número, acompanhe interpretação (ex.: 'ACWR 1,2 — faixa equilibrada').\n"
                "- Para fadiga/dor/estresse (escalas 1–5): prefira 'baixa', 'média' ou 'alta' em vez de só o dígito.\n"
                "- Tendência: diga se a carga 'subiu', 'caiu' ou 'estável' vs período anterior, sem jargão vazio.\n"
                "- Se faltar dado, diga com honestidade que o indicador não está disponível.\n\n"
                "Cada insight: uma frase ou duas curtas (máx. 220 caracteres cada).\n"
                "Responda SOMENTE com JSON válido neste formato exato:\n"
                '{"insights":["...","...","...","...","..."]}\n\n'
                "Dados:\n" + summary
            )

            text, err, gem_status, gem_retry_ms = _insights_call_gemini(prompt)
            if err:
                if gem_status == 429:
                    fallback = None
                    if _INSIGHTS_BY_FP:
                        try:
                            newest = max(_INSIGHTS_BY_FP.values(), key=lambda x: x.get("ts", 0))
                            fallback = newest.get("insights")
                        except Exception:
                            fallback = None
                    # Backoff local para segurar spam quando a cota estoura
                    _LAST_GLOBAL_INSIGHTS_CALL = time.time()
                    return jsonify({
                        "success": False,
                        "error": "quota_exceeded",
                        "message": "Cota Gemini excedida no momento. Aguarde para tentar novamente.",
                        "retryAfterMs": gem_retry_ms if gem_retry_ms is not None else 60000,
                        "insights": (fallback or [])[:5],
                        "providerError": err,
                    }), 429
                return jsonify({"success": False, "error": err}), 503

            insights = _insights_parse_gemini_json(text)
            while len(insights) < 5:
                insights.append("Dado insuficiente para este ponto — colete mais respostas de pré/pós treino.")
            insights = insights[:5]

            _LAST_GLOBAL_INSIGHTS_CALL = time.time()
            _INSIGHTS_BY_FP[fp] = {"ts": _LAST_GLOBAL_INSIGHTS_CALL, "insights": insights}

            return jsonify({
                "success": True,
                "insights": insights,
                "fingerprint": fp,
                "cached": False,
            }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/games', methods=['POST'])
def post_game():
    """Registra um jogo nas abas Jogos e Jogos_Logs do Sheets (append)."""
    try:
        data = request.json
        if not data or not isinstance(data, dict):
            return jsonify({"success": False, "error": "Envie um objeto com gameId, datetime, logs, minutesPerPlayer"}), 400
        result = sync_data("append_game", data)
        if result.get("success"):
            return jsonify(result), 200
        return jsonify(result), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


def _games_live_cache_key():
    gid = (request.args.get("gameId") or "").strip()
    return gid if gid else "__open__"


def _games_live_cache_invalidate():
    """Após escrita no Sheets, leituras seguintes precisam de dados frescos."""
    _GAMES_LIVE_READ_CACHE.clear()


@app.route('/games/live', methods=['POST', 'GET'])
def games_live():
    """
    POST: snapshot ao vivo do Campin → aba Campin_Live (Sheets).
    GET: ?gameId= opcional — último jogo em aberto (status open) se omitido.
    """
    try:
        if request.method == 'POST':
            data = request.json
            if not data or not isinstance(data, dict):
                return jsonify({"success": False, "error": "JSON inválido"}), 400
            result = sync_data("upsert_campin_live", data)
            if result.get("success"):
                _games_live_cache_invalidate()
                return jsonify(result), 200
            return jsonify(result), 500
        game_id = request.args.get('gameId') or None
        ck = _games_live_cache_key()
        now = time.time()
        hit = _GAMES_LIVE_READ_CACHE.get(ck)
        if hit and hit[0] > now:
            body = dict(hit[1])
            body["cached"] = True
            return jsonify(body), 200
        result = sync_data("get_campin_live", game_id)
        if result.get("success"):
            _GAMES_LIVE_READ_CACHE[ck] = (now + _GAMES_LIVE_CACHE_TTL, result)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/games/reports', methods=['GET'])
def list_game_reports_route():
    """Lista jogos com relatório salvo no Sheets (aba Jogos)."""
    try:
        limit = request.args.get('limit', 80, type=int)
        limit = min(max(1, limit), 200)
        result = sync_data("list_game_reports", limit)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/games/reports/detail', methods=['GET'])
def game_report_detail_route():
    """Detalhe de um jogo: minutos, elenco, logs."""
    try:
        gid = (request.args.get('gameId') or '').strip()
        if not gid:
            return jsonify({"success": False, "error": "gameId obrigatório"}), 400
        result = sync_data("get_game_report_detail", gid)
        if not result.get("success"):
            return jsonify(result), 404
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/insights/game', methods=['POST'])
def post_insights_game():
    """
    Análise IA de um jogo passado (relatório). Máx. 1 nova geração por jogo a cada 7 dias (cache).
    """
    try:
        payload = request.get_json(silent=True) or {}
        game_id = (payload.get('gameId') or '').strip()
        if not game_id:
            return jsonify({"success": False, "error": "gameId obrigatório"}), 400
        if not os.getenv("GEMINI_API_KEY", "").strip():
            return jsonify({
                "success": False,
                "error": "GEMINI_API_KEY não configurada no servidor.",
            }), 503

        lock = _INSIGHTS_LOCK if _INSIGHTS_LOCK else nullcontext()
        with lock:
            now = time.time()
            ent = _GAME_INSIGHTS_BY_GAME_ID.get(game_id)
            if ent and now - ent.get("ts", 0) < GAME_INSIGHTS_TTL_S:
                return jsonify({
                    "success": True,
                    "cached": True,
                    "nextRefreshInSec": int(GAME_INSIGHTS_TTL_S - (now - ent["ts"])),
                    "analysis": ent.get("analysis"),
                }), 200

            detail = sync_data("get_game_report_detail", game_id)
            if not detail.get("success"):
                return jsonify({"success": False, "error": detail.get("error", "Jogo não encontrado")}), 404

            compact = {
                "gameId": detail.get("gameId"),
                "date": detail.get("date"),
                "time": detail.get("time"),
                "teamName": detail.get("teamName"),
                "elenco": (detail.get("elenco") or [])[:40],
                "logsSample": (detail.get("logs") or [])[:120],
            }
            prompt = (
                "Você é analista de futsal. Com base no JSON (tempos, entradas, substituições e eventos), "
                "responda SOMENTE em JSON válido neste formato exato:\n"
                '{"resumoTime":"texto sobre o desempenho coletivo (2–4 frases)",'
                '"porAtleta":[{"nome":"nome do atleta","analise":"1–2 frases objetivas"}],'
                '"observacoes":["ponto 1","ponto 2"]}\n'
                "Não invente dados que não estejam no JSON. Use português do Brasil.\n\n"
                "Dados:\n" + json.dumps(compact, ensure_ascii=False)[:14000]
            )

            text, err, gem_status, gem_retry_ms = _insights_call_gemini(prompt)
            if err:
                return jsonify({
                    "success": False,
                    "error": err,
                    "providerStatus": gem_status,
                }), 503

            analysis = _parse_game_insights_json(text)
            if not analysis:
                analysis = {
                    "resumoTime": (text or "")[:4000],
                    "porAtleta": [],
                    "observacoes": [],
                }

            _GAME_INSIGHTS_BY_GAME_ID[game_id] = {"ts": time.time(), "analysis": analysis}
            return jsonify({
                "success": True,
                "cached": False,
                "analysis": analysis,
                "nextRefreshInSec": int(GAME_INSIGHTS_TTL_S),
            }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/verify/pre', methods=['GET'])
def verify_pre():
    """Retorna as últimas linhas da aba 'pre' do Sheets (para teste/verificação após envio)."""
    try:
        last = request.args.get('last', 5, type=int)
        last = min(max(1, last), 50)
        result = sync_data("verify_pre", last)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    print("🚀 Serviço de sincronização iniciado")
    print(f"📡 Aguardando requisições em http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
