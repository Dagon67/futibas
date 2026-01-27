"""
Teste alternativo usando método console (não precisa de redirect URI)
"""

from sheets_app import SheetsEditor
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import pickle
import os

print("="*60)
print("Teste OAuth - Método Alternativo (Console)")
print("="*60)

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]

credentials_path = 'credentials_oauth.json'
token_file = 'token.pickle'

try:
    creds = None
    
    # Tenta carregar token salvo
    if os.path.exists(token_file):
        with open(token_file, 'rb') as token:
            creds = pickle.load(token)
    
    # Se não há credenciais válidas, faz login
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            print("\n🔐 Iniciando autenticação OAuth...")
            print("Este método usa código de autorização manual.\n")
            
            flow = InstalledAppFlow.from_client_secrets_file(
                credentials_path, SCOPES)
            
            # Método console - você copia e cola o código
            creds = flow.run_console()
        
        # Salva o token
        with open(token_file, 'wb') as token:
            pickle.dump(creds, token)
        print("\n✅ Token salvo com sucesso!")
    
    # Agora testa a conexão
    print("\n📊 Conectando à planilha...")
    editor = SheetsEditor(use_oauth=True)
    editor.connect()
    
    # Testa leitura
    print("\n--- Testando LEITURA ---")
    valor = editor.read_cell('A1')
    print(f"✅ Valor em A1: {valor}")
    
    # Testa escrita
    print("\n--- Testando EDIÇÃO ---")
    editor.write_cell('B1', 'Teste OAuth funcionando!')
    print("✅ Escrita bem-sucedida!")
    
    print("\n" + "="*60)
    print("✅ Tudo funcionando perfeitamente!")
    print("="*60)
    
except FileNotFoundError as e:
    print(f"\n❌ Erro: {e}")
    print("\nVerifique se o arquivo credentials_oauth.json está na pasta do projeto")
except Exception as e:
    print(f"\n❌ Erro: {e}")
    print("\n💡 Dica: Veja o arquivo CORRIGIR_REDIRECT_URI.md para resolver problemas de redirect_uri")
