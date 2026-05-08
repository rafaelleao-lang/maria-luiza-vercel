# Maria Luiza 💖

Aplicativo PWA de acompanhamento diário da bebê Maria Luiza.  
Backend Flask + Supabase PostgreSQL · Mobile First · Instalável no celular.

---

## Funcionalidades

- 🍼 Mamadas — horário, ML e timer de arroto (15min)
- 💊 Remédios — doses com próximo horário automático
- 🏥 Consultas — por especialidade com alertas
- 🔬 Exames — local e observações
- 💉 Vacinas — SUS/Particular, marcar como aplicada
- 📏 Crescimento — gráfico de peso e altura
- 🛒 Compras — checklist de itens
- 📌 Lembretes — notas rápidas
- 📅 Próximos eventos — feed unificado
- 📸 Foto — avatar personalizado da Maria Luiza

---

## Instalar e rodar localmente

```bash
# 1. Clone
git clone https://github.com/seu-usuario/projeto-maria-luiza.git
cd projeto-maria-luiza

# 2. Crie e ative o ambiente virtual
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Mac/Linux

# 3. Instale dependências
pip install -r requirements.txt

# 4. Configure variáveis de ambiente
copy .env.example .env         # Windows
# cp .env.example .env         # Mac/Linux
# Edite o .env com seus dados

# 5. Execute as tabelas no Supabase (uma única vez)
#    Abra supabase_setup.sql no SQL Editor do Supabase e execute

# 6. Rode
python main.py
# Acesse http://localhost:5000
```

---

## Configurar Supabase

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá em **SQL Editor** e cole/execute o conteúdo de `supabase_setup.sql`
4. Vá em **Settings → API** e copie:
   - `URL` → `SUPABASE_URL` no seu `.env`
   - `anon public key` → `SUPABASE_KEY` no seu `.env`

---

## Deploy no Render (passo a passo)

### 1. Suba o projeto no GitHub

```bash
git init
git branch -M main
git add .
git commit -m "deploy: app Maria Luiza"
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

### 2. Crie o serviço no Render

1. Acesse [render.com](https://render.com) e faça login
2. Clique em **New → Web Service**
3. Selecione **Connect a repository** → escolha seu repositório
4. Configure:
   - **Name:** `maria-luiza`
   - **Region:** `São Paulo` (se disponível) ou `Oregon`
   - **Branch:** `main`
   - **Runtime:** `Python`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 main:app`

> ⚠️ **IMPORTANTE:** O Start Command é crítico. Use EXATAMENTE este comando.

### 3. Configure as variáveis de ambiente

Na tela do serviço, vá em **Environment** e adicione:

| Variável | Valor |
|---|---|
| `SUPABASE_URL` | `https://seu-projeto.supabase.co` |
| `SUPABASE_KEY` | `sua_anon_key` |
| `SECRET_KEY` | qualquer string aleatória longa |
| `ONESIGNAL_APP_ID` | `adc50cce-7803-4997-b030-16e794a792bb` |

### 4. Deploy

Clique em **Create Web Service**. O Render vai:
1. Clonar o repositório
2. Instalar dependências
3. Iniciar o Gunicorn na porta `$PORT` (que o Render define automaticamente)
4. O app fica disponível em `https://maria-luiza.onrender.com`

---

## Instalar no celular (PWA)

### Android (Chrome)
1. Abra o app no Chrome no celular
2. Toque no menu ⋮ → **"Adicionar à tela inicial"**
3. Confirme → o app aparece como ícone nativo

### iPhone (Safari)
1. Abra no Safari (funciona APENAS no Safari)
2. Toque no botão de compartilhar 📤
3. Role e toque em **"Adicionar à Tela de Início"**
4. Confirme

---

## Estrutura do projeto

```
projeto_maria_luiza/
├── main.py              ← Backend Flask (todas as rotas API)
├── Procfile             ← Comando de start para Render
├── requirements.txt     ← Dependências Python
├── supabase_setup.sql   ← Script SQL para criar as tabelas
├── .env.example         ← Template de variáveis de ambiente
├── .gitignore
├── templates/
│   └── index.html       ← App completo (SPA)
└── static/
    ├── style.css        ← CSS mobile-first
    ├── script.js        ← JavaScript (timezone, foto, UI)
    ├── sw.js            ← Service Worker (PWA + notificações)
    ├── manifest.json    ← PWA manifest
    └── OneSignalSDKWorker.js
```

---

## Tabelas do Supabase

| Tabela | Uso |
|---|---|
| `mamadas` | Registros de mamadas (horario, ml) |
| `remedios` | Medicamentos com próximo horário |
| `consultas` | Consultas médicas agendadas |
| `exames` | Exames agendados |
| `vacinas` | Vacinas SUS/Particular |
| `crescimento` | Peso e altura ao longo do tempo |
| `compras` | Lista de compras com checklist |
| `lembretes` | Notas rápidas |
| `notificacoes` | Histórico de notificações |

---

## Solução de problemas

### Deploy falha no Render: "No open ports detected"

**Causa:** Gunicorn não está ligado à porta correta.  
**Solução:** Verifique se o Start Command é exatamente:
```
gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 main:app
```

### Horário errado (ex: cadastrei 22:00, aparece 19:00)

**Causa:** Bug de timezone (UTC vs Brasil).  
**Status:** Corrigido. O app usa `America/Sao_Paulo` para salvar e exibir.

### PWA não aparece no iPhone

**Causa:** Precisa ser acessado pelo **Safari** (não Chrome no iOS).  
Abra no Safari → Compartilhar → Adicionar à Tela de Início.

---

Feito com 💖 para a Maria Luiza
