"""
Teste completo - OAuth e Service Account
"""

from sheets_app import SheetsEditor

print("="*70)
print("TESTE COMPLETO - Editor de Planilhas Google Sheets")
print("="*70)

# Teste 1: OAuth
print("\n" + "="*70)
print("TESTE 1: OAuth 2.0 (Desktop App)")
print("="*70)

try:
    print("\n🔐 Inicializando OAuth...")
    print("Uma janela do navegador abrirá para você autorizar.\n")
    
    editor_oauth = SheetsEditor(use_oauth=True)
    editor_oauth.connect()
    
    print("\n✅ OAuth conectado com sucesso!")
    
    # Testa leitura
    print("\n--- Testando LEITURA (OAuth) ---")
    valor = editor_oauth.read_cell('A1')
    print(f"✅ Valor em A1: {valor}")
    
    # Testa escrita
    print("\n--- Testando EDIÇÃO (OAuth) ---")
    editor_oauth.write_cell('B1', 'Teste OAuth funcionando!')
    print("✅ Escrita bem-sucedida com OAuth!")
    
except Exception as e:
    print(f"\n❌ Erro com OAuth: {e}")

# Teste 2: Service Account
print("\n\n" + "="*70)
print("TESTE 2: Service Account")
print("="*70)

try:
    print("\n🔐 Inicializando Service Account...")
    
    editor_sa = SheetsEditor('credentials.json')
    editor_sa.connect()
    
    print("\n✅ Service Account conectado com sucesso!")
    
    # Testa leitura
    print("\n--- Testando LEITURA (Service Account) ---")
    valor = editor_sa.read_cell('A1')
    print(f"✅ Valor em A1: {valor}")
    
    # Testa escrita
    print("\n--- Testando EDIÇÃO (Service Account) ---")
    editor_sa.write_cell('C1', 'Teste Service Account funcionando!')
    print("✅ Escrita bem-sucedida com Service Account!")
    
    print("\n⚠️  IMPORTANTE: Certifique-se de que a planilha foi compartilhada com:")
    print("   futilouco@futsal-476923.iam.gserviceaccount.com")
    print("   (com permissão de Editor)")
    
except Exception as e:
    print(f"\n❌ Erro com Service Account: {e}")
    print("\n💡 Dica: Compartilhe a planilha com:")
    print("   futilouco@futsal-476923.iam.gserviceaccount.com")

print("\n" + "="*70)
print("✅ Testes concluídos!")
print("="*70)
