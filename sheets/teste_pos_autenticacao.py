"""
Teste após autenticação OAuth bem-sucedida
Execute este script para verificar se tudo está funcionando
"""

from sheets_app import SheetsEditor
import os

print("="*70)
print("✅ AUTENTICAÇÃO OAuth CONCLUÍDA!")
print("="*70)
print("\nO token foi salvo. Agora vamos testar a conexão com a planilha...\n")

try:
    # Inicializa o editor (vai usar o token salvo)
    print("🔐 Carregando token salvo...")
    editor = SheetsEditor(use_oauth=True)
    
    print("✅ Token carregado com sucesso!")
    print("\n📊 Conectando à planilha 'tester', aba 'primeiro'...")
    
    # Conecta à planilha
    editor.connect()
    
    print("\n" + "="*70)
    print("🧪 TESTANDO OPERAÇÕES")
    print("="*70)
    
    # Testa leitura
    print("\n1️⃣ Testando LEITURA (célula A1)...")
    valor = editor.read_cell('A1')
    print(f"   ✅ Valor em A1: '{valor}'")
    
    # Testa escrita
    print("\n2️⃣ Testando EDIÇÃO (célula B1)...")
    editor.write_cell('B1', '✅ OAuth funcionando perfeitamente!')
    print("   ✅ Escrita bem-sucedida!")
    
    # Verifica o que foi escrito
    print("\n3️⃣ Verificando o que foi escrito...")
    valor_escrito = editor.read_cell('B1')
    print(f"   ✅ Valor em B1: '{valor_escrito}'")
    
    # Lê um intervalo
    print("\n4️⃣ Lendo intervalo A1:B5...")
    dados = editor.read_range('A1:B5')
    print("   Dados encontrados:")
    for i, row in enumerate(dados, 1):
        print(f"   Linha {i}: {row}")
    
    # Adiciona uma nova linha
    print("\n5️⃣ Adicionando nova linha...")
    editor.append_row(['Teste', 'OAuth', 'Python', '2024'])
    print("   ✅ Nova linha adicionada!")
    
    # Lista todos os valores
    print("\n6️⃣ Listando todos os valores da planilha...")
    todos = editor.get_all_values()
    print(f"   ✅ Total de linhas: {len(todos)}")
    print("   Primeiras 5 linhas:")
    for i, row in enumerate(todos[:5], 1):
        print(f"   Linha {i}: {row}")
    
    print("\n" + "="*70)
    print("🎉 TUDO FUNCIONANDO PERFEITAMENTE!")
    print("="*70)
    print("\n✅ Autenticação OAuth: OK")
    print("✅ Conexão com planilha: OK")
    print("✅ Leitura: OK")
    print("✅ Edição: OK")
    print("\n💡 Agora você pode usar o editor em seus próprios scripts!")
    print("   Exemplo:")
    print("   from sheets_app import SheetsEditor")
    print("   editor = SheetsEditor(use_oauth=True)")
    print("   editor.connect()")
    print("   editor.write_cell('A1', 'Meu valor')")
    
except FileNotFoundError as e:
    print(f"\n❌ Erro: {e}")
    print("\nVerifique se o arquivo credentials_oauth.json está na pasta do projeto")
except Exception as e:
    error_str = str(e).lower()
    
    # Verifica se é erro de API não ativada
    if 'drive api' in error_str and ('not been used' in error_str or 'disabled' in error_str or '403' in error_str):
        print("\n" + "="*70)
        print("❌ ERRO: Google Drive API não está ativada")
        print("="*70)
        print("\n🔧 SOLUÇÃO:")
        print("\n1. Ative a Google Drive API:")
        print("   https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=680015352457")
        print("   Clique em 'ENABLE' (Ativar)")
        print("\n2. Ative a Google Sheets API:")
        print("   https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=680015352457")
        print("   Clique em 'ENABLE' (Ativar)")
        print("\n3. Aguarde 1-2 minutos e execute novamente:")
        print("   python teste_pos_autenticacao.py")
        print("\n📄 Veja o arquivo: ATIVAR_APIS.md para instruções detalhadas")
        print("="*70)
    elif 'sheets api' in error_str and ('not been used' in error_str or 'disabled' in error_str or '403' in error_str):
        print("\n" + "="*70)
        print("❌ ERRO: Google Sheets API não está ativada")
        print("="*70)
        print("\n🔧 SOLUÇÃO:")
        print("\n1. Ative a Google Sheets API:")
        print("   https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=680015352457")
        print("   Clique em 'ENABLE' (Ativar)")
        print("\n2. Ative a Google Drive API:")
        print("   https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=680015352457")
        print("   Clique em 'ENABLE' (Ativar)")
        print("\n3. Aguarde 1-2 minutos e execute novamente:")
        print("   python teste_pos_autenticacao.py")
        print("\n📄 Veja o arquivo: ATIVAR_APIS.md para instruções detalhadas")
        print("="*70)
    else:
        print(f"\n❌ Erro: {e}")
        print("\nPossíveis causas:")
        print("- A planilha não está compartilhada com sua conta Google")
        print("- As APIs Google Sheets e Drive não estão ativadas")
        print("- Problema com o token salvo (tente deletar token.pickle e autenticar novamente)")
