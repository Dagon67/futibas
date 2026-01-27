"""
Teste rápido com suas credenciais OAuth
"""

from sheets_app import SheetsEditor

print("="*60)
print("Testando conexão OAuth com suas credenciais")
print("="*60)

try:
    # Usa as credenciais OAuth configuradas
    print("\n🔐 Inicializando OAuth...")
    print("Uma janela do navegador abrirá para você autorizar.\n")
    
    editor = SheetsEditor(use_oauth=True)
    
    print("\n✅ Autenticação OAuth bem-sucedida!")
    print("\n📊 Conectando à planilha...")
    
    # Conecta à planilha
    editor.connect()
    
    # Testa leitura
    print("\n--- Testando LEITURA ---")
    valor = editor.read_cell('A1')
    print(f"✅ Valor em A1: {valor}")
    
    # Testa escrita
    print("\n--- Testando EDIÇÃO ---")
    editor.write_cell('B1', 'Teste OAuth funcionando!')
    print("✅ Escrita bem-sucedida!")
    
    # Lê um intervalo
    print("\n--- Lendo intervalo A1:B5 ---")
    dados = editor.read_range('A1:B5')
    for i, row in enumerate(dados, 1):
        print(f"Linha {i}: {row}")
    
    print("\n" + "="*60)
    print("✅ Tudo funcionando perfeitamente!")
    print("="*60)
    
except FileNotFoundError as e:
    print(f"\n❌ Erro: {e}")
    print("\nVerifique se o arquivo credentials_oauth.json está na pasta do projeto")
except Exception as e:
    print(f"\n❌ Erro: {e}")
    
    error_str = str(e).lower()
    if '403' in error_str or 'access_denied' in error_str or 'test' in error_str:
        print("\n" + "="*70)
        print("⚠️  ERRO 403: access_denied")
        print("="*70)
        print("\n🔧 SOLUÇÃO:")
        print("Seu email precisa ser adicionado como 'Test user' no Google Cloud Console.")
        print("\n1. Acesse: https://console.cloud.google.com/apis/credentials/consent?project=futsal-476923")
        print("2. Vá na seção 'Test users'")
        print("3. Clique em '+ ADD USERS'")
        print("4. Adicione seu email do Google")
        print("5. Salve e teste novamente")
        print("\n📄 Veja o arquivo: CORRIGIR_403_ACCESS_DENIED.md para instruções detalhadas")
        print("="*70)
    else:
        print("\nPossíveis causas:")
        print("- As APIs Google Sheets e Drive não estão ativadas no projeto")
        print("- A planilha não está compartilhada com sua conta Google")
        print("- Problema com as credenciais OAuth")
