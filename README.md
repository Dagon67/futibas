# 🏆 Tutem - Sistema de Monitoramento de Treinos

Sistema completo para gerenciamento de treinos, jogadores e questionários para equipes de futsal.

## 🎯 Funcionalidades

- ✅ Cadastro de jogadores com fotos
- ✅ Criação e gerenciamento de treinos
- ✅ Questionários pré e pós-treino
- ✅ Sincronização com Google Sheets
- ✅ Interface moderna e responsiva
- ✅ Modo Totem para exibição em telas

## 🚀 Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Flask (Python)
- **Integração**: Google Sheets API
- **Armazenamento**: LocalStorage + Google Sheets

## 📋 Pré-requisitos

- Python 3.8+
- Navegador moderno
- Conta Google (para Google Sheets)

## 🔧 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/Dagon67/tutem.git
cd tutem
```

### 2. Instale as dependências do backend

```bash
cd sheets
pip install -r requirements.txt
```

### 3. Configure as credenciais do Google Sheets

Veja as instruções em `sheets/README.md` para configurar OAuth ou Service Account.

### 4. Inicie o servidor Flask

```bash
cd sheets
python app.py
```

O servidor estará rodando em `http://localhost:5000`

### 5. Abra o frontend

Abra `index.html` no navegador ou use um servidor local:

```bash
# Python
python -m http.server 8000

# Node.js
npx serve
```

Acesse: `http://localhost:8000`

## 📁 Estrutura do Projeto

```
tutem/
├── index.html          # Interface principal
├── totem.html          # Modo totem (tela cheia)
├── js/                 # JavaScript do frontend
│   ├── app.js          # Aplicação principal
│   ├── state.js        # Gerenciamento de estado
│   ├── storage.js      # LocalStorage
│   ├── sheets_sync.js  # Sincronização com Sheets
│   └── screens/        # Telas da aplicação
├── sheets/             # Backend Flask
│   ├── app.py          # Servidor Flask
│   ├── sheets_sync.py  # Lógica de sincronização
│   └── requirements.txt
└── README.md
```

## 🎨 Cores da Identidade Visual

- **Amarelo Principal**: `#feec02`
- **Amarelo Secundário**: `#ffcc01`
- **Preto**: `#000000`
- **Branco**: `#ffffff` (texto)

## 🌐 Deploy

### Render (Recomendado)

Veja o guia completo em `DEPLOY_RENDER.md`

1. Faça push do código para GitHub
2. Crie um Web Service no Render
3. Configure as variáveis de ambiente
4. Deploy automático!

## 📝 Licença

Este projeto é de uso privado.

## 👤 Autor

**Dagon67**

---

## 🆘 Suporte

Para problemas com:
- **Google Sheets**: Veja `sheets/README.md`
- **Deploy**: Veja `DEPLOY_RENDER.md`
- **OAuth**: Veja `CONFIGURAR_OAUTH_WEB.md`
