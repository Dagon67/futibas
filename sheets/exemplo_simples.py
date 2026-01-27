"""
Exemplo simples de uso do editor de planilhas
"""

from sheets_app import SheetsEditor

# Opção 1: Usar OAuth (mais fácil - abre navegador para autorizar)
# Requer: credentials_oauth.json do Google Cloud Console
editor = SheetsEditor(use_oauth=True)

# Opção 2: Usar Service Account (melhor para aplicações)
# Requer: credentials.json da Service Account
# editor = SheetsEditor('credentials.json')

# Conecta à planilha "tester", aba "primeiro"
editor.connect()

# Lê o valor da célula A1
valor = editor.read_cell('A1')
print(f"Valor em A1: {valor}")

# Escreve na célula B1
editor.write_cell('B1', 'Teste do Python!')

# Adiciona uma nova linha
editor.append_row(['Dado1', 'Dado2', 'Dado3'])

print("✅ Operações concluídas!")
