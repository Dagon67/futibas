# 🔧 Configuração do Service Account

## ✅ Arquivo Service Account

Você já tem o arquivo: `futsal-476923-19e955d7ed78.json`

## 📋 Passos para usar:

### 1. Renomeie o arquivo

Renomeie `futsal-476923-19e955d7ed78.json` para `credentials.json`

Ou copie o conteúdo para um arquivo chamado `credentials.json`

### 2. Compartilhe a planilha com a Service Account

**IMPORTANTE:** A planilha DEVE ser compartilhada com o email da Service Account:

1. Abra a planilha no Google Sheets
2. Clique no botão **"Compartilhar"** (canto superior direito)
3. Adicione o email: **`futilouco@futsal-476923.iam.gserviceaccount.com`**
4. Dê permissão de **"Editor"**
5. Clique em **"Enviar"**

### 3. Use no código

```python
from sheets_app import SheetsEditor

editor = SheetsEditor('credentials.json')
editor.connect()

# Agora você pode editar!
editor.write_cell('C1', 'Teste Service Account!')
```

## 📧 Email da Service Account

```
futilouco@futsal-476923.iam.gserviceaccount.com
```

**Este email DEVE ter acesso à planilha para funcionar!**
