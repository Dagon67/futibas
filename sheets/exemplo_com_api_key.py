"""
Exemplo usando API Key (apenas leitura)
Para editar, você precisa de OAuth ou Service Account
"""

from sheets_app import SheetsEditor

# Usa a API Key configurada
editor = SheetsEditor(api_key=None)  # None usa a API Key padrão do config.py

# Conecta à planilha
editor.connect()

# ✅ OPERAÇÕES DE LEITURA (funcionam com API Key)
print("\n--- Lendo célula A1 ---")
valor = editor.read_cell('A1')
print(f"Valor em A1: {valor}")

print("\n--- Lendo intervalo A1:B10 ---")
dados = editor.read_range('A1:B10')
for row in dados:
    print(row)

print("\n--- Todos os valores ---")
todos = editor.get_all_values()
for row in todos:
    print(row)

# ❌ OPERAÇÕES DE EDIÇÃO (NÃO funcionam com API Key)
print("\n--- Tentando escrever (vai dar erro) ---")
try:
    editor.write_cell('B1', 'Teste')
except PermissionError as e:
    print(f"Erro esperado: {e}")
    print("\n💡 Para editar, você precisa:")
    print("1. OAuth: editor = SheetsEditor(use_oauth=True)")
    print("2. Service Account: editor = SheetsEditor('credentials.json')")
