# 🚀 Guia Rápido - Tudo Configurado!

## ✅ O que você tem agora:

1. **API Key**: `AIzaSyCNGBeLmFAenRisgbapUPEEl5iiFG1CS5k` (permite leitura)
2. **Credenciais OAuth**: Configuradas em `credentials_oauth.json` (permite edição!)

## 🎯 Como usar AGORA:

### Opção 1: Usar OAuth (Permite EDITAR) ⭐

```python
from sheets_app import SheetsEditor

# Inicializa com OAuth
editor = SheetsEditor(use_oauth=True)

# Conecta à planilha
editor.connect()

# ✅ Agora você pode LER E EDITAR!
editor.write_cell('B1', 'Olá!')
valor = editor.read_cell('A1')
```

**Na primeira vez**, uma janela do navegador abrirá para você autorizar. Depois disso, o token será salvo e não precisará autorizar novamente.

### Opção 2: Teste rápido

```bash
python teste_oauth.py
```

Este script testa tudo automaticamente!

## 📋 Checklist Final:

- [x] API Key configurada (`config.py`)
- [x] Credenciais OAuth configuradas (`credentials_oauth.json`)
- [x] Código pronto para usar
- [ ] Testar a conexão (execute `python teste_oauth.py`)

## ⚠️ Importante:

1. **Primeira execução**: Uma janela do navegador abrirá para autorizar
2. **APIs necessárias**: Certifique-se de que Google Sheets API e Drive API estão ativadas no seu projeto
3. **Permissões**: Você precisa ter acesso à planilha com sua conta Google

## 🔧 Se der erro:

1. **Erro de APIs não ativadas**:
   - Acesse: https://console.cloud.google.com/
   - Vá em "APIs & Services" > "Library"
   - Ative "Google Sheets API"
   - Ative "Google Drive API"

2. **Erro de permissão**:
   - Certifique-se de que você tem acesso à planilha
   - Abra a planilha no Google Sheets e verifique se consegue editar

3. **Erro de credenciais**:
   - Verifique se `credentials_oauth.json` está na pasta do projeto
   - Verifique se o formato está correto (deve ter "installed" não "web")

## 🎉 Pronto para usar!

Execute `python teste_oauth.py` e comece a editar sua planilha!
