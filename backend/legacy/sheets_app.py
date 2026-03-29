"""
Aplicativo para editar planilha do Google Sheets
Planilha: tester
Aba: primeiro
"""

import gspread
from google.oauth2.service_account import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow, Flow
from google.auth.transport.requests import Request
import os
import pickle
import requests
import json
from typing import Optional, List, Any

# ID da planilha extraído da URL
SPREADSHEET_ID = "1CEqiaKayIJOVBU7IYu4yMm8olomwWJJp4mYu9yofgoI"
SPREADSHEET_NAME = "tester"
WORKSHEET_NAME = "primeiro"

# API Key (pode ser configurada via variável de ambiente ou config.py)
try:
    from config import GOOGLE_API_KEY as CONFIG_API_KEY
    API_KEY = os.getenv('GOOGLE_API_KEY', CONFIG_API_KEY)
except ImportError:
    API_KEY = os.getenv('GOOGLE_API_KEY', 'AIzaSyCNGBeLmFAenRisgbapUPEEl5iiFG1CS5k')

# Escopos necessários para editar a planilha
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]


class SheetsEditor:
    """Classe para editar planilhas do Google Sheets"""
    
    def __init__(self, credentials_path: Optional[str] = None, use_oauth: bool = False, api_key: Optional[str] = None):
        """
        Inicializa o editor de planilhas
        
        Args:
            credentials_path: Caminho para o arquivo JSON de credenciais
                             - Service Account: se use_oauth=False
                             - OAuth Client: se use_oauth=True
                             Se None, tenta usar variável de ambiente GOOGLE_APPLICATION_CREDENTIALS
            use_oauth: Se True, usa autenticação OAuth (mais fácil para uso pessoal)
                      Se False, usa Service Account (melhor para aplicações)
            api_key: API Key do Google (só funciona para leitura de planilhas públicas)
                    Para editar, use OAuth ou Service Account
        """
        self.api_key = api_key or API_KEY
        self.use_api_key = False
        
        # Se API Key fornecida, tenta usar método direto (só leitura)
        if api_key or (not credentials_path and not use_oauth):
            try:
                # Tenta usar API Key primeiro (só leitura)
                self.use_api_key = True
                self.spreadsheet_id = SPREADSHEET_ID
                self.worksheet_name = WORKSHEET_NAME
                print("⚠️  Usando API Key - apenas leitura disponível")
                print("💡 Para editar, configure OAuth ou Service Account")
                return
            except:
                pass
        
        # Se não usar API Key, usa autenticação completa
        if use_oauth:
            self.client = self._authenticate_oauth(credentials_path)
        else:
            self.client = self._authenticate_service_account(credentials_path)
        
        self.spreadsheet = None
        self.worksheet = None
    
    def _authenticate_service_account(self, credentials_path: Optional[str] = None):
        """Autenticação usando Service Account"""
        if credentials_path is None:
            credentials_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        
        if credentials_path is None or not os.path.exists(credentials_path):
            raise FileNotFoundError(
                "\n" + "="*60 + "\n"
                "❌ Arquivo de credenciais não encontrado!\n\n"
                "Para usar Service Account:\n"
                "1. Crie um projeto no Google Cloud Console\n"
                "2. Ative Google Sheets API e Google Drive API\n"
                "3. Crie uma Service Account e baixe o JSON\n"
                "4. Compartilhe a planilha com o email da Service Account\n"
                "5. Configure uma das opções:\n"
                "   - Variável de ambiente: GOOGLE_APPLICATION_CREDENTIALS=caminho/para/credentials.json\n"
                "   - Ou passe o caminho: SheetsEditor('credentials.json')\n\n"
                "OU use OAuth (mais fácil): SheetsEditor(use_oauth=True)\n"
                "="*60
            )
        
        creds = Credentials.from_service_account_file(
            credentials_path,
            scopes=SCOPES
        )
        
        return gspread.authorize(creds)
    
    def _authenticate_oauth(self, credentials_path: Optional[str] = None):
        """Autenticação usando OAuth 2.0 - Suporta Desktop app (local) e Web application (produção)"""
        creds = None
        token_file = 'token.pickle'
        
        # Tenta carregar token salvo
        if os.path.exists(token_file):
            with open(token_file, 'rb') as token:
                creds = pickle.load(token)
        
        # Se não há credenciais válidas, faz login
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if credentials_path is None:
                    # Tenta encontrar arquivo de credenciais automaticamente
                    web_creds = 'credentials_oauth_web.json'
                    desktop_creds = 'credentials_oauth.json'
                    
                    # Prioriza web application se estiver em produção (Render)
                    if os.getenv('RENDER') or os.getenv('PORT'):
                        if os.path.exists(web_creds):
                            credentials_path = web_creds
                        elif os.path.exists(desktop_creds):
                            credentials_path = desktop_creds
                    else:
                        # Local: prioriza desktop app
                        if os.path.exists(desktop_creds):
                            credentials_path = desktop_creds
                        elif os.path.exists(web_creds):
                            credentials_path = web_creds
                    
                    if credentials_path is None:
                        credentials_path = desktop_creds  # Default
                
                if not os.path.exists(credentials_path):
                    raise FileNotFoundError(
                        "\n" + "="*60 + "\n"
                        "❌ Arquivo de credenciais OAuth não encontrado!\n\n"
                        "Arquivos procurados:\n"
                        f"  - {desktop_creds} (Desktop app - local)\n"
                        f"  - {web_creds} (Web application - produção)\n\n"
                        "Para usar OAuth:\n"
                        "1. Acesse: https://console.cloud.google.com/\n"
                        "2. Crie um projeto e ative Google Sheets API e Drive API\n"
                        "3. Vá em 'Credentials' > 'Create Credentials' > 'OAuth client ID'\n"
                        "4. Baixe o JSON e salve em backend/legacy/ (ou defina GOOGLE_APPLICATION_CREDENTIALS)\n"
                        "="*60
                    )
                
                # Detecta tipo de credencial (web ou installed)
                with open(credentials_path, 'r') as f:
                    creds_data = json.load(f)
                
                is_web_app = 'web' in creds_data
                
                if is_web_app:
                    # Web Application - para produção (Render)
                    # Em produção, não podemos usar método interativo
                    # Tenta usar token salvo ou Service Account como fallback
                    print("\n⚠️  Web Application detectado")
                    print("💡 Em produção, OAuth interativo não está disponível.")
                    print("💡 Use Service Account ou configure token OAuth previamente.")
                    raise FileNotFoundError(
                        "OAuth Web Application requer autenticação interativa que não está disponível em produção.\n"
                        "Soluções:\n"
                        "1. Use Service Account (recomendado para produção)\n"
                        "2. Ou configure token OAuth localmente e faça upload do token.pickle"
                    )
                    
                else:
                    # Desktop Application - para local
                    flow = InstalledAppFlow.from_client_secrets_file(
                        credentials_path, SCOPES)
                    # Tenta usar local server
                    try:
                        creds = flow.run_local_server(port=0)
                    except Exception as e:
                        # Se der erro de redirect_uri, mostra instruções
                        error_msg = str(e).lower()
                        if 'redirect_uri_mismatch' in error_msg or 'redirect' in error_msg:
                            print("\n" + "="*70)
                            print("❌ ERRO: redirect_uri_mismatch")
                            print("="*70)
                            print("\n🔧 SOLUÇÃO:")
                            print("\n1. Acesse: https://console.cloud.google.com/apis/credentials?project=futsal-476923")
                            print("2. Clique no OAuth Client ID para editar")
                            print("3. Adicione 'http://localhost' e 'http://localhost:5000' nas URIs de redirecionamento")
                            print("\n📄 Veja: CORRIGIR_REDIRECT_URI.md para instruções detalhadas")
                            print("="*70)
                            raise FileNotFoundError(
                                "Configure as URIs de redirecionamento no Google Cloud Console. "
                                "Veja CORRIGIR_REDIRECT_URI.md para instruções."
                            )
                        elif '403' in error_msg or 'access_denied' in error_msg or 'test' in error_msg:
                            print("\n" + "="*70)
                            print("❌ ERRO 403: access_denied")
                            print("="*70)
                            print("\n🔧 SOLUÇÃO:")
                            print("Seu email precisa ser adicionado como 'Test user' no Google Cloud Console.")
                            print("\n1. Acesse: https://console.cloud.google.com/apis/credentials/consent?project=futsal-476923")
                            print("2. Vá na seção 'Test users'")
                            print("3. Clique em '+ ADD USERS'")
                            print("4. Adicione seu email do Google")
                            print("5. Salve e execute novamente")
                            print("\n📄 Veja: CORRIGIR_403_ACCESS_DENIED.md para instruções detalhadas")
                            print("="*70)
                            raise PermissionError(
                                "Adicione seu email como 'Test user' na tela de consentimento OAuth. "
                                "Veja CORRIGIR_403_ACCESS_DENIED.md para instruções."
                            )
                        else:
                            raise
            
            # Salva o token para próximas execuções
            with open(token_file, 'wb') as token:
                pickle.dump(creds, token)
        
        return gspread.authorize(creds)
    
    def connect(self, spreadsheet_id: Optional[str] = None, 
                spreadsheet_name: Optional[str] = None,
                worksheet_name: Optional[str] = None):
        """
        Conecta à planilha e à aba especificada
        
        Args:
            spreadsheet_id: ID da planilha (opcional, usa o padrão se None)
            spreadsheet_name: Nome da planilha (opcional, usa o padrão se None)
            worksheet_name: Nome da aba (opcional, usa o padrão se None)
        """
        if self.use_api_key:
            # Modo API Key (só leitura)
            self.spreadsheet_id = spreadsheet_id or SPREADSHEET_ID
            self.worksheet_name = worksheet_name or WORKSHEET_NAME
            print(f"Conectado via API Key (apenas leitura)")
            print(f"Planilha ID: {self.spreadsheet_id}")
            print(f"Aba: {self.worksheet_name}")
            return
        
        # Modo autenticação completa (leitura e escrita)
        spreadsheet_id = spreadsheet_id or SPREADSHEET_ID
        spreadsheet_name = spreadsheet_name or SPREADSHEET_NAME
        worksheet_name = worksheet_name or WORKSHEET_NAME
        
        try:
            # Tenta abrir por ID primeiro
            self.spreadsheet = self.client.open_by_key(spreadsheet_id)
        except Exception as e:
            error_str = str(e).lower()
            # Verifica se é erro de API não ativada
            if 'drive api' in error_str and ('not been used' in error_str or 'disabled' in error_str or '403' in error_str):
                print("\n" + "="*70)
                print("❌ ERRO: Google Drive API não está ativada")
                print("="*70)
                print("\n🔧 SOLUÇÃO:")
                print("1. Ative a Google Drive API:")
                print("   https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=680015352457")
                print("2. Ative a Google Sheets API:")
                print("   https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=680015352457")
                print("\n📄 Veja: ATIVAR_APIS.md para instruções detalhadas")
                print("="*70)
                raise
            # Se falhar, tenta abrir por nome
            try:
                self.spreadsheet = self.client.open(spreadsheet_name)
            except Exception:
                raise
        
        # Abre a aba específica
        self.worksheet = self.spreadsheet.worksheet(worksheet_name)
        print(f"Conectado à planilha: {self.spreadsheet.title}")
        print(f"Aba ativa: {self.worksheet.title}")
    
    def _read_via_api(self, range_name: str) -> List[List[Any]]:
        """Lê dados usando API REST diretamente (só leitura)"""
        url = f"https://sheets.googleapis.com/v4/spreadsheets/{self.spreadsheet_id}/values/{self.worksheet_name}!{range_name}"
        params = {'key': self.api_key}
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get('values', [])
    
    def read_cell(self, cell: str) -> Any:
        """Lê o valor de uma célula (ex: 'A1')"""
        if self.use_api_key:
            values = self._read_via_api(cell)
            return values[0][0] if values and len(values) > 0 and len(values[0]) > 0 else None
        return self.worksheet.acell(cell).value
    
    def write_cell(self, cell: str, value: Any):
        """Escreve um valor em uma célula (ex: 'A1', 'Hello')"""
        if self.use_api_key:
            raise PermissionError(
                "❌ API Key não permite edição!\n"
                "Para editar, você precisa:\n"
                "1. OAuth: SheetsEditor(use_oauth=True)\n"
                "2. Service Account: SheetsEditor('credentials.json')\n"
                "Veja o README.md para instruções"
            )
        # O método update precisa do valor como lista de listas
        self.worksheet.update(cell, [[value]])
        print(f"Valor '{value}' escrito na célula {cell}")
    
    def read_range(self, range_name: str) -> List[List[Any]]:
        """Lê um intervalo de células (ex: 'A1:B10')"""
        if self.use_api_key:
            return self._read_via_api(range_name)
        return self.worksheet.get(range_name)
    
    def write_range(self, range_name: str, values: List[List[Any]]):
        """Escreve valores em um intervalo de células"""
        if self.use_api_key:
            raise PermissionError(
                "❌ API Key não permite edição!\n"
                "Para editar, você precisa:\n"
                "1. OAuth: SheetsEditor(use_oauth=True)\n"
                "2. Service Account: SheetsEditor('credentials.json')\n"
                "Veja o README.md para instruções"
            )
        self.worksheet.update(range_name, values)
        print(f"Valores escritos no intervalo {range_name}")
    
    def append_row(self, values: List[Any]):
        """Adiciona uma nova linha no final da planilha"""
        if self.use_api_key:
            raise PermissionError(
                "❌ API Key não permite edição!\n"
                "Para editar, você precisa:\n"
                "1. OAuth: SheetsEditor(use_oauth=True)\n"
                "2. Service Account: SheetsEditor('credentials.json')\n"
                "Veja o README.md para instruções"
            )
        self.worksheet.append_row(values)
        print(f"Nova linha adicionada: {values}")
    
    def get_all_values(self) -> List[List[Any]]:
        """Retorna todos os valores da planilha"""
        if self.use_api_key:
            return self._read_via_api('A1:ZZZ1000')  # Lê um range grande
        return self.worksheet.get_all_values()
    
    def clear_worksheet(self):
        """Limpa todo o conteúdo da aba"""
        if self.use_api_key:
            raise PermissionError(
                "❌ API Key não permite edição!\n"
                "Para editar, você precisa:\n"
                "1. OAuth: SheetsEditor(use_oauth=True)\n"
                "2. Service Account: SheetsEditor('credentials.json')\n"
                "Veja o README.md para instruções"
            )
        self.worksheet.clear()
        print("Planilha limpa")
    
    def find_cell(self, search_value: str) -> Optional[str]:
        """Encontra a primeira célula com o valor especificado"""
        if self.use_api_key:
            # Busca simples via API
            all_values = self.get_all_values()
            for i, row in enumerate(all_values):
                for j, cell in enumerate(row):
                    if str(cell) == str(search_value):
                        col = chr(65 + j) if j < 26 else chr(65 + j // 26 - 1) + chr(65 + j % 26)
                        return f"{col}{i+1}"
            return None
        try:
            cell = self.worksheet.find(search_value)
            return cell.address if cell else None
        except:
            return None


def main():
    """Exemplo de uso do editor de planilhas"""
    
    print("="*60)
    print("Editor de Planilhas Google Sheets")
    print("="*60)
    
    try:
        # Tenta usar API Key primeiro (se disponível)
        print("\n🔑 Tentando usar API Key (apenas leitura)...")
        editor = SheetsEditor(api_key=API_KEY)
        editor.connect()
        
        # Testa leitura
        print("\n--- Lendo célula A1 ---")
        value = editor.read_cell('A1')
        print(f"Valor em A1: {value}")
        
        # Tenta ler um intervalo
        print("\n--- Lendo intervalo A1:B5 ---")
        range_data = editor.read_range('A1:B5')
        print(range_data)
        
        # Tenta escrever (vai falhar com API Key)
        print("\n--- Tentando escrever (requer OAuth/Service Account) ---")
        try:
            editor.write_cell('B1', 'Olá do Python!')
        except PermissionError as e:
            print(str(e))
        
    except Exception as e:
        print(f"\n⚠️  API Key não funcionou ou não permite acesso: {e}")
        print("\n🔐 Tentando autenticação OAuth...")
        
        try:
            editor = SheetsEditor(use_oauth=True)
            editor.connect()
            
            # Exemplos de operações completas:
            
            # 1. Ler uma célula
            print("\n--- Lendo célula A1 ---")
            value = editor.read_cell('A1')
            print(f"Valor em A1: {value}")
            
            # 2. Escrever em uma célula
            print("\n--- Escrevendo na célula B1 ---")
            editor.write_cell('B1', 'Olá do Python!')
            
            # 3. Ler um intervalo
            print("\n--- Lendo intervalo A1:B5 ---")
            range_data = editor.read_range('A1:B5')
            print(range_data)
            
            # 4. Adicionar uma nova linha
            print("\n--- Adicionando nova linha ---")
            editor.append_row(['Nova', 'Linha', '2024'])
            
            # 5. Listar todos os valores
            print("\n--- Todos os valores da planilha ---")
            all_data = editor.get_all_values()
            for row in all_data:
                print(row)
                
        except FileNotFoundError:
            print("\n⚠️  OAuth não configurado. Tentando Service Account...")
            try:
                editor = SheetsEditor()
                editor.connect()
                
                # Mesmas operações...
                print("\n--- Lendo célula A1 ---")
                value = editor.read_cell('A1')
                print(f"Valor em A1: {value}")
                
            except FileNotFoundError as e:
                print(str(e))
                print("\n💡 Dica: Veja o README.md para instruções detalhadas de configuração")
            except Exception as e:
                print(f"\n❌ Erro: {e}")
                print("\nVerifique se:")
                print("- As credenciais estão configuradas corretamente")
                print("- A planilha foi compartilhada com a Service Account (se usar Service Account)")
                print("- Você tem permissão para editar a planilha")


if __name__ == "__main__":
    main()
