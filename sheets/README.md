# Editor de Planilhas Google Sheets

Aplicativo Python para conectar e editar a planilha do Google Sheets "tester" (aba "primeiro").

## Configuração

### 1. Instalar dependências

```bash
pip install -r requirements.txt
```

### 2. Configurar credenciais do Google

**⚠️ IMPORTANTE:** Você já tem uma API Key! Ela permite **apenas LEITURA** de planilhas públicas.

**Para EDITAR a planilha, você precisa de uma das opções abaixo:**

#### Opção 0: Usar API Key (Apenas Leitura) ⚠️

Se você já tem uma API Key (como `AIzaSyCNGBeLmFAenRisgbapUPEEl5iiFG1CS5k`):

1. Coloque a API Key no arquivo `config.py` ou configure a variável de ambiente:
   ```bash
   # Windows PowerShell
   $env:GOOGLE_API_KEY="AIzaSyCNGBeLmFAenRisgbapUPEEl5iiFG1CS5k"
   ```

2. Use assim:
   ```python
   editor = SheetsEditor(api_key="sua_chave_aqui")
   # ou
   editor = SheetsEditor()  # Usa a chave do config.py
   ```

3. **Limitação:** API Key só permite LEITURA. Para editar, veja as opções abaixo.

#### Para EDITAR a planilha, você precisa de uma das opções:

#### Opção A: Service Account (Recomendado para aplicações automatizadas)

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a API do Google Sheets:
   - Vá em "APIs & Services" > "Library"
   - Procure por "Google Sheets API" e ative
   - Procure por "Google Drive API" e ative
4. Crie uma Service Account:
   - Vá em "APIs & Services" > "Credentials"
   - Clique em "Create Credentials" > "Service Account"
   - Dê um nome e crie
   - Clique na Service Account criada
   - Vá na aba "Keys" > "Add Key" > "Create new key"
   - Escolha JSON e baixe o arquivo
5. Compartilhe a planilha com o email da Service Account:
   - Abra a planilha no Google Sheets
   - Clique em "Compartilhar"
   - Adicione o email da Service Account (encontrado no arquivo JSON baixado)
   - Dê permissão de "Editor"
6. Salve o arquivo JSON como `credentials.json` na pasta do projeto
7. Configure a variável de ambiente:
   ```bash
   # Windows PowerShell
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\caminho\para\credentials.json"
   
   # Windows CMD
   set GOOGLE_APPLICATION_CREDENTIALS=C:\caminho\para\credentials.json
   
   # Linux/Mac
   export GOOGLE_APPLICATION_CREDENTIALS="/caminho/para/credentials.json"
   ```

#### Opção B: OAuth 2.0 (⭐ Mais fácil para uso pessoal)

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative as APIs:
   - Vá em "APIs & Services" > "Library"
   - Procure por "Google Sheets API" e ative
   - Procure por "Google Drive API" e ative
4. Configure a tela de consentimento OAuth (se ainda não fez):
   - Vá em "APIs & Services" > "OAuth consent screen"
   - Escolha "External" (ou "Internal" se tiver Google Workspace)
   - Preencha as informações básicas
   - Adicione seu email como usuário de teste
5. Crie credenciais OAuth 2.0:
   - Vá em "APIs & Services" > "Credentials"
   - Clique em "Create Credentials" > "OAuth client ID"
   - Escolha "Desktop app" como tipo de aplicativo
   - Dê um nome (ex: "Sheets Editor")
   - Clique em "Create"
   - Baixe o arquivo JSON
6. Salve o arquivo JSON como `credentials_oauth.json` na pasta do projeto
7. Na primeira execução, uma janela do navegador abrirá para você autorizar
8. O token será salvo em `token.pickle` para próximas execuções (não precisa autorizar novamente)

## Uso

### Uso básico

#### Usando API Key (Apenas Leitura)

```python
from sheets_app import SheetsEditor

# Usa a API Key do config.py ou variável de ambiente
editor = SheetsEditor()  # ou editor = SheetsEditor(api_key="sua_chave")

# Conecta à planilha
editor.connect()

# ✅ Leitura funciona
valor = editor.read_cell('A1')
dados = editor.read_range('A1:B10')

# ❌ Edição NÃO funciona (precisa OAuth ou Service Account)
# editor.write_cell('B1', 'Novo valor')  # Vai dar erro!
```

#### Usando OAuth (Recomendado para começar - Permite Edição)

```python
from sheets_app import SheetsEditor

# Inicializa com OAuth (abre navegador na primeira vez)
editor = SheetsEditor(use_oauth=True)

# Conecta à planilha
editor.connect()

# Lê uma célula
valor = editor.read_cell('A1')
print(valor)

# Escreve em uma célula
editor.write_cell('B1', 'Novo valor')

# Adiciona uma nova linha
editor.append_row(['Dado1', 'Dado2', 'Dado3'])
```

#### Usando Service Account

```python
from sheets_app import SheetsEditor

# Inicializa com Service Account
editor = SheetsEditor('credentials.json')  # ou use variável de ambiente

# Conecta à planilha
editor.connect()

# Lê um intervalo
dados = editor.read_range('A1:C10')
print(dados)
```

### Executar exemplos

```bash
# Exemplo completo com todas as funcionalidades (tenta API Key, depois OAuth/Service Account)
python sheets_app.py

# Exemplo simples e direto (OAuth)
python exemplo_simples.py

# Exemplo usando apenas API Key (só leitura)
python exemplo_com_api_key.py
```

## Funcionalidades

- ✅ Ler células individuais
- ✅ Escrever em células
- ✅ Ler intervalos de células
- ✅ Escrever em intervalos
- ✅ Adicionar novas linhas
- ✅ Listar todos os valores
- ✅ Limpar planilha
- ✅ Buscar células por valor

## Estrutura

- `sheets_app.py`: Classe principal `SheetsEditor` com métodos para editar a planilha
- `exemplo_simples.py`: Exemplo básico de uso
- `requirements.txt`: Dependências do projeto
- `credentials.json`: Arquivo de credenciais Service Account (não versionado)
- `credentials_oauth.json`: Arquivo de credenciais OAuth (não versionado)
- `token.pickle`: Token OAuth salvo (não versionado, criado automaticamente)

## Notas

- O ID da planilha está configurado no código
- **API Key**: Permite apenas LEITURA de planilhas públicas. Não permite editar!
- **Service Account**: A planilha deve ser compartilhada com o email da Service Account (encontrado no JSON)
- **OAuth**: Você precisa ter acesso à planilha com sua conta Google (não precisa compartilhar com Service Account)
- OAuth é mais fácil para uso pessoal, Service Account é melhor para aplicações automatizadas
- Na primeira execução com OAuth, uma janela do navegador abrirá para autorizar

## O que você precisa para EDITAR?

Você já tem uma **API Key** (`AIzaSyCNGBeLmFAenRisgbapUPEEl5iiFG1CS5k`), mas ela só permite **leitura**.

**Para editar, você precisa de:**

1. **OAuth 2.0** (mais fácil):
   - Baixe `credentials_oauth.json` do Google Cloud Console
   - Use: `SheetsEditor(use_oauth=True)`

2. **Service Account** (melhor para automação):
   - Baixe `credentials.json` da Service Account
   - Compartilhe a planilha com o email da Service Account
   - Use: `SheetsEditor('credentials.json')`

Veja as instruções detalhadas acima para cada opção.
