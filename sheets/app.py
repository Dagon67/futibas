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
CORS(app)  # Permite requisições do frontend

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
            "sync_all": "/sync/all"
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


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    print("🚀 Serviço de sincronização iniciado")
    print(f"📡 Aguardando requisições em http://0.0.0.0:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)
