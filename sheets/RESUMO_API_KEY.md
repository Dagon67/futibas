# Resumo: O que você precisa com sua API Key

## ✅ O que você JÁ TEM

Você tem uma **API Key**: `AIzaSyCNGBeLmFAenRisgbapUPEEl5iiFG1CS5k`

Esta API Key está configurada no arquivo `config.py` e permite:
- ✅ **LER** dados de planilhas públicas
- ❌ **NÃO permite EDITAR** planilhas

## ❌ O que você PRECISA para EDITAR

Para **editar** a planilha, você precisa de uma das opções:

### Opção 1: OAuth 2.0 (Mais fácil) ⭐

1. Acesse: https://console.cloud.google.com/
2. No mesmo projeto onde criou a API Key:
   - Vá em "APIs & Services" > "Credentials"
   - Clique em "Create Credentials" > "OAuth client ID"
   - Escolha "Desktop app"
   - Baixe o arquivo JSON
3. Salve como `credentials_oauth.json` na pasta do projeto
4. Use no código:
   ```python
   editor = SheetsEditor(use_oauth=True)
   ```

### Opção 2: Service Account

1. No Google Cloud Console:
   - Vá em "APIs & Services" > "Credentials"
   - Clique em "Create Credentials" > "Service Account"
   - Crie e baixe o JSON
2. Compartilhe a planilha com o email da Service Account
3. Use no código:
   ```python
   editor = SheetsEditor('credentials.json')
   ```

## 🚀 Como usar AGORA (só leitura)

```python
from sheets_app import SheetsEditor

# Usa a API Key do config.py
editor = SheetsEditor()
editor.connect()

# ✅ Funciona - Ler dados
valor = editor.read_cell('A1')
dados = editor.read_range('A1:B10')

# ❌ NÃO funciona - Editar
# editor.write_cell('B1', 'Teste')  # Vai dar erro!
```

## 📝 Checklist

- [x] API Key configurada (permite leitura)
- [ ] OAuth configurado (permite edição) - **PRÓXIMO PASSO**
- [ ] Ou Service Account configurado (permite edição)

## 🔗 Links úteis

- Google Cloud Console: https://console.cloud.google.com/
- Documentação Google Sheets API: https://developers.google.com/sheets/api
