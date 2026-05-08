# Maria Luiza 💖

Aplicativo PWA de acompanhamento diário da bebê Maria Luiza.  
Backend Flask + Supabase PostgreSQL. Mobile-first. Instalável no celular.

---

## Funcionalidades

- 🍼 **Mamadas** — registro com horário, ML e timer de arroto (15min)
- 💊 **Remédios** — doses com cálculo automático do próximo horário
- 🏥 **Consultas** — agendamento por especialidade
- 🔬 **Exames** — agendamento com local e observações
- 💉 **Vacinas** — SUS/Particular, marcar como aplicada
- 📏 **Crescimento** — gráfico de peso e altura
- 🛒 **Compras** — lista de itens com checklist
- 📌 **Lembretes** — notas rápidas
- 📅 **Próximos eventos** — feed unificado ordenado
- 📸 **Foto** — foto personalizada da Maria Luiza no header

---

## Instalação local

### 1. Pré-requisitos

- Python 3.9+
- pip

### 2. Clone o repositório

```bash
git clone https://github.com/seu-usuario/projeto-maria-luiza.git
cd projeto-maria-luiza
```

### 3. Crie o ambiente virtual

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate
```

### 4. Instale as dependências

```bash
pip install -r requirements.txt
```

### 5. Configure as variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com seus dados reais
```

### 6. Configure o banco de dados Supabase

Execute o arquivo `supabase_setup.sql` no **SQL Editor** do Supabase Dashboard.

### 7. Rode localmente

```bash
python main.py
```

Acesse: `http://localhost:5000`

---

## Configurar Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **SQL Editor** e execute o conteúdo de `supabase_setup.sql`
3. Copie a **URL** e a **anon key** em **Settings > API**
4. Cole no seu `.env`

---

## Deploy no Render (recomendado)

1. Faça push do projeto para o GitHub
2. Acesse [render.com](https://render.com) e crie uma conta
3. Clique em **New > Web Service**
4. Conecte seu repositório GitHub
5. Configure:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn main:app`
6. Em **Environment Variables**, adicione:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SECRET_KEY`
   - `ONESIGNAL_APP_ID`
7. Clique em **Deploy**

O app ficará disponível em `https://seu-app.onrender.com`

---

## Deploy no Railway

1. Faça push para o GitHub
2. Acesse [railway.app](https://railway.app)
3. Clique em **New Project > Deploy from GitHub repo**
4. Selecione o repositório
5. Adicione as variáveis de ambiente nas **Settings**
6. O deploy é automático

---

## Subir no GitHub

```bash
# Inicializar (se necessário)
git init
git branch -M main

# Adicionar arquivos
git add .
git commit -m "feat: app Maria Luiza PWA completo"

# Conectar ao GitHub
git remote add origin https://github.com/seu-usuario/seu-repo.git
git push -u origin main
```

---

## Instalar no celular (PWA)

### Android (Chrome)
1. Abra o app no Chrome
2. Toque no menu (⋮) > **Adicionar à tela inicial**
3. Confirme a instalação

### iPhone (Safari)
1. Abra o app no Safari
2. Toque em **Compartilhar** (ícone de seta)
3. Toque em **Adicionar à Tela de Início**
4. Confirme

---

## Tecnologias

- **Backend:** Flask (Python)
- **Banco de dados:** Supabase (PostgreSQL)
- **Frontend:** HTML5 + CSS3 + JavaScript puro
- **PWA:** Service Worker + Web App Manifest
- **Notificações:** OneSignal
- **Gráficos:** Chart.js
- **Deploy:** Gunicorn / Render / Railway

---

## Timezone

O app usa `America/Sao_Paulo` (UTC-3).  
Todos os horários são salvos com offset correto e exibidos sem conversão errada.

---

Feito com 💖 para a Maria Luiza
