# 🔧 Ativar Google Drive API e Google Sheets API

## ❌ Erro:
```
Google Drive API has not been used in project 680015352457 before or it is disabled.
```

## ✅ Solução: Ativar as APIs

### Passo 1: Ativar Google Drive API

**Link direto:**
https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=680015352457

1. Clique no link acima
2. Clique no botão **"ENABLE"** (Ativar)
3. Aguarde alguns segundos

### Passo 2: Ativar Google Sheets API

**Link direto:**
https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=680015352457

1. Clique no link acima
2. Clique no botão **"ENABLE"** (Ativar)
3. Aguarde alguns segundos

### Passo 3: Verificar se estão ativadas

Acesse: https://console.cloud.google.com/apis/library?project=futsal-476923

Procure por:
- ✅ **Google Drive API** - deve estar marcada como "Enabled"
- ✅ **Google Sheets API** - deve estar marcada como "Enabled"

### Passo 4: Teste novamente

Após ativar as APIs, aguarde 1-2 minutos e execute:

```bash
python teste_pos_autenticacao.py
```

## ⚠️ Importante:

- Pode levar 1-2 minutos para as APIs serem totalmente ativadas
- Certifique-se de estar no projeto correto: **futsal-476923** (ID: 680015352457)
- Ambas as APIs precisam estar ativadas para o editor funcionar

## 🎯 Links Rápidos:

- **Ativar Drive API**: https://console.developers.google.com/apis/api/drive.googleapis.com/overview?project=680015352457
- **Ativar Sheets API**: https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=680015352457
- **Ver todas as APIs**: https://console.cloud.google.com/apis/library?project=futsal-476923
