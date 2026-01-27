"""
Serviço Flask para sincronização com Google Sheets
Recebe requisições do JavaScript e sincroniza dados
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from sheets_sync import sync_data
import json

app = Flask(__name__)
CORS(app)  # Permite requisições do frontend


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
