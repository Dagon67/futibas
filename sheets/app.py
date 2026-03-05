"""
Serviço Flask para sincronização com Google Sheets
Recebe requisições do JavaScript e sincroniza dados
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from sheets_sync import sync_data
import json
import os
import base64
from werkzeug.utils import secure_filename
from datetime import datetime

app = Flask(__name__)
# CORS: permitir qualquer origem (localhost, file:// com origin null, app hospedado)
# Sem isso, ao abrir index.html por file:// o navegador bloqueia por origin 'null'
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type"]}})

# Configuração de upload
UPLOAD_FOLDER = 'uploads/players'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_FILE_SIZE = 2 * 1024 * 1024  # 2MB

# Criar pasta de uploads se não existir
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


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
        
        # Tentar fazer commit no Git (opcional - apenas se configurado)
        # Isso permite que as fotos sejam persistidas no repositório
        try:
            import subprocess
            repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            git_enabled = os.getenv('GIT_AUTO_COMMIT', 'false').lower() == 'true'
            
            if git_enabled:
                # Adicionar arquivo ao Git
                subprocess.run(
                    ['git', 'add', filepath],
                    cwd=repo_root,
                    capture_output=True,
                    timeout=5
                )
                # Fazer commit
                subprocess.run(
                    ['git', 'commit', '-m', f'Add player photo: {filename}'],
                    cwd=repo_root,
                    capture_output=True,
                    timeout=5
                )
                # Push (requer autenticação configurada)
                # subprocess.run(['git', 'push'], cwd=repo_root, capture_output=True, timeout=10)
                print(f"✅ Foto commitada no Git: {filename}")
        except Exception as e:
            # Se falhar, continua normalmente (foto foi salva)
            print(f"⚠️ Não foi possível commitar no Git (opcional): {e}")
        
        # Retornar URL relativa
        photo_url = f"/uploads/players/{filename}"
        
        return jsonify({
            "success": True,
            "photoUrl": photo_url,
            "filename": filename
        }), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/uploads/players/<filename>')
def serve_player_photo(filename):
    """Serve fotos de jogadores"""
    return send_from_directory(UPLOAD_FOLDER, filename)


# Pastas de imagens para perguntas (pre/ e pos/) - relativas à raiz do projeto
IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'}


@app.route('/api/images/<folder>', methods=['GET'])
def list_images(folder):
    """Lista todos os arquivos de imagem da pasta pre ou pos"""
    if folder not in ('pre', 'pos'):
        return jsonify({"success": False, "error": "Pasta inválida"}), 400
    try:
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        folder_path = os.path.join(repo_root, folder)
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
