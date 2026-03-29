"""
Script para configurar credenciais do Google Sheets no Render
Este script pode ser executado localmente para preparar as credenciais
"""

import json
import os

def create_credentials_file():
    """Cria arquivo de credenciais a partir de variável de ambiente ou arquivo local"""
    
    # Tenta ler de variável de ambiente primeiro (Render)
    creds_json = os.getenv('GOOGLE_CREDENTIALS_JSON')
    
    if not creds_json:
        # Tenta ler de arquivo local
        local_files = [
            'futsal-476923-19e955d7ed78.json',
            'service-account.json',
            'credentials.json'
        ]
        
        for filename in local_files:
            if os.path.exists(filename):
                with open(filename, 'r') as f:
                    creds_json = f.read()
                print(f"✅ Arquivo encontrado: {filename}")
                break
    
    if creds_json:
        # Valida JSON
        try:
            creds_data = json.loads(creds_json)
            # Cria arquivo no local esperado
            output_path = 'service-account.json'
            with open(output_path, 'w') as f:
                json.dump(creds_data, f, indent=2)
            print(f"✅ Arquivo criado: {output_path}")
            return output_path
        except json.JSONDecodeError as e:
            print(f"❌ Erro ao validar JSON: {e}")
            return None
    else:
        print("❌ Nenhuma credencial encontrada")
        return None

if __name__ == '__main__':
    create_credentials_file()
