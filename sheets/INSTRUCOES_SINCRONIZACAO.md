# 📊 Instruções de Sincronização com Google Sheets

Este sistema sincroniza automaticamente todos os dados do app com uma planilha do Google Sheets.

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
cd sheets
pip install -r requirements.txt
```

### 2. Configurar Autenticação

Você precisa ter uma das seguintes opções configuradas:

#### Opção A: OAuth (Recomendado para uso pessoal)
- Já deve estar configurado se você já usou o `sheets_app.py` antes
- O arquivo `token.pickle` deve existir
- Se não existir, execute: `python sheets_app.py` e faça a autenticação

#### Opção B: Service Account
- Configure uma Service Account no Google Cloud Console
- Baixe o arquivo JSON de credenciais
- Compartilhe a planilha com o email da Service Account
- Configure a variável de ambiente: `GOOGLE_APPLICATION_CREDENTIALS=caminho/para/credentials.json`

### 3. Iniciar o Serviço de Sincronização

```bash
cd sheets
python app.py
```

O serviço ficará rodando em `http://localhost:5000`

### 4. Usar o App

Agora, sempre que você:
- Adicionar/editar/remover um jogador
- Criar/atualizar um treino
- Salvar uma resposta de questionário
- Editar perguntas

Os dados serão **automaticamente sincronizados** com a planilha do Google Sheets!

## 📋 Estrutura da Planilha

A planilha terá as seguintes abas:

### 1. **Jogadores**
- ID, Nome, Número, Posição, Idade, Altura, Peso

### 2. **Treinos**
- ID, Data, Data Formatada, Data/Hora, Modo (pre/post), Período, IDs dos Jogadores, Número de Respostas

### 3. **Respostas**
- ID Treino, Data Treino, Modo, ID Jogador, Nome Jogador, Data/Hora, Comentário
- Colunas dinâmicas para cada pergunta (pré e pós)

### 4. **Perguntas**
- Modo, Tipo, Texto, Opções, Imagem

## 🔧 Solução de Problemas

### Erro: "Erro ao conectar com serviço de sincronização"
- Certifique-se de que o serviço Flask está rodando (`python sheets/app.py`)
- Verifique se a porta 5000 está livre

### Erro: "API Key não permite edição"
- Configure OAuth ou Service Account (veja passo 2)

### Erro: "403 Access Denied"
- Se usar OAuth, adicione seu email como "Test user" no Google Cloud Console
- Se usar Service Account, compartilhe a planilha com o email da Service Account

### Dados não aparecem na planilha
- Verifique o console do navegador (F12) para ver erros
- Verifique o console do Python para ver mensagens de erro
- Certifique-se de que a planilha está acessível e você tem permissão de edição

## 📝 Notas

- A sincronização acontece automaticamente sempre que dados são salvos
- Se o serviço não estiver rodando, os dados ainda serão salvos localmente, mas não serão sincronizados
- A sincronização é assíncrona e não bloqueia o app
- Os dados são sempre sobrescritos (não há histórico de versões)

## 🔄 Sincronização Manual

Se quiser sincronizar todos os dados manualmente, você pode chamar no console do navegador:

```javascript
syncAllToSheets()
```
