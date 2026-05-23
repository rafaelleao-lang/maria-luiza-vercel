# MEMORIA_GIT — Projeto Maria Luiza

## Estrutura do Deploy (Vercel)

```
Claude Code (edita arquivos no disco)
     ↓
Git (commit + push)
     ↓
GitHub: rafaelleaoeng08-source/projeto_maria_luiza  (branch: main)
     ↓
Vercel (auto-deploy ao receber push no main)
     ↓
App em produção (URL: seu-projeto.vercel.app)
```

---

## Repositório

| Campo              | Valor                                                                |
|--------------------|----------------------------------------------------------------------|
| Pasta local        | `C:\Users\notebook\Desktop\projeto_maria_luiza`                      |
| Remote             | `https://github.com/rafaelleaoeng08-source/projeto_maria_luiza.git` |
| Branch             | `main`                                                               |
| Plataforma deploy  | Vercel (migrado do Render em 23/05/2026)                             |

---

## Como funciona a Vercel

### Arquitetura serverless

A Vercel não roda um servidor permanente como o Render. Em vez disso:

1. **Cada requisição** aciona uma "função serverless" (AWS Lambda por baixo)
2. O Python/Flask é executado **por demanda**, sem ficar rodando em idle
3. **Cold start**: primeira requisição após período idle leva ~500ms a 1s (muito mais rápido que o Render gratuito que chega a 30s)
4. **Warm**: requisições seguintes são instantâneas

### Estrutura de arquivos para a Vercel

```
projeto_maria_luiza/
├── api/
│   └── index.py          ← Ponto de entrada da Vercel (importa o Flask app)
├── main.py               ← Flask app completo (sem alterações)
├── static/               ← Arquivos estáticos (CSS, JS, SW, ícones)
├── templates/            ← HTML templates
├── vercel.json           ← Configuração da Vercel
├── requirements.txt      ← Dependências Python (sem gunicorn)
└── ...
```

### Como a Vercel serve o app

- **`vercel.json`** diz à Vercel: "toda requisição vai para `api/index.py`"
- **`api/index.py`** importa o Flask app de `main.py`
- **Flask** processa a requisição e retorna HTML ou JSON
- **Headers especiais** no `vercel.json` garantem que o service worker funcione

---

## Como fazer o primeiro deploy na Vercel

### Passo 1 — Criar conta na Vercel
1. Acesse https://vercel.com e crie conta com GitHub
2. Autorize a Vercel a acessar seus repositórios

### Passo 2 — Importar o projeto
1. No dashboard da Vercel, clique em **"Add New Project"**
2. Selecione o repositório `projeto_maria_luiza`
3. Framework Preset: **Other** (não Next.js, não Vite)
4. Root Directory: deixe vazio (raiz do projeto)
5. Clique em **Deploy**

### Passo 3 — Configurar variáveis de ambiente
Na Vercel, vá em: **Project → Settings → Environment Variables**

Adicione estas variáveis (as mesmas que estavam no Render):

| Variável         | Valor                              |
|------------------|------------------------------------|
| `SUPABASE_URL`   | `https://baiussfhwaxbnymhksff.supabase.co` |
| `SUPABASE_KEY`   | sua chave Supabase                 |
| `SECRET_KEY`     | uma chave aleatória segura         |
| `ONESIGNAL_APP_ID` | `adc50cce-7803-4997-b030-16e794a792bb` |

> **IMPORTANTE**: Após adicionar variáveis, faça um **Redeploy** para que entrem em vigor.

### Passo 4 — Verificar deploy
1. Acesse a URL gerada (ex: `https://projeto-maria-luiza.vercel.app`)
2. O app deve abrir normalmente
3. Teste todas as funcionalidades

---

## Como atualizar o app (deploy automático)

Qualquer `git push origin main` aciona automaticamente um novo deploy na Vercel.

```bash
# Fluxo normal após o Claude fazer alterações:
git status              # ver o que mudou
git add -A              # ou: git add arquivo_especifico.py
git commit -m "descrição da alteração"
git push origin main    # ← isso dispara o deploy automático
```

O deploy leva ~30 a 60 segundos. Acompanhe em: https://vercel.com/dashboard

---

## Comandos Git essenciais

### Verificar estado atual
```bash
git status              # arquivos modificados / não commitados
git log --oneline -5    # últimos 5 commits
git diff origin/main HEAD  # diferença entre local e GitHub
```

### Commit e push
```bash
git add -A
git commit -m "fix: descrição do que mudou"
git push origin main
```

### Se o push falhar (branch desatualizada)
```bash
git pull origin main --rebase
git push origin main
```

### Ver histórico completo
```bash
git log --oneline
```

---

## Como limpar cache e reinstalar o PWA

### Limpeza do cache no Android (Chrome)

Quando o app parece não atualizar após um novo deploy:

1. **Chrome → Menu ⋮ → Configurações**
2. **Privacidade e segurança → Limpar dados de navegação**
3. Marque: **Imagens e arquivos em cache**
4. Clique em **Limpar dados**

### Reinstalação do PWA no Android

Se o ícone na tela inicial está com comportamento antigo:

1. Pressione o ícone do app na tela inicial
2. **Remover** ou **Desinstalar**
3. Abra o Chrome e acesse a URL do app
4. **Menu ⋮ → Adicionar à tela inicial**

### Forçar atualização do Service Worker

No Chrome (desktop ou Android):

1. Acesse `chrome://inspect/#service-workers` (desktop)
2. Ou: **DevTools → Application → Service Workers → Update**

---

## Como a Vercel serve o Service Worker e PWA

### Por que o PWA funciona na Vercel

O `vercel.json` configura headers especiais para o service worker:

```json
{
  "source": "/sw.js",
  "headers": [
    { "key": "Service-Worker-Allowed", "value": "/" },
    { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }
  ]
}
```

- `Service-Worker-Allowed: /` → permite que o SW controle toda a origem
- `Cache-Control: no-cache` → garante que o SW seja sempre verificado por atualização

### Rotas PWA no Flask (permanecem iguais)

```
/              → index.html (SPA)
/manifest.json → static/manifest.json
/sw.js         → static/sw.js (com headers corretos)
/OneSignalSDKWorker.js → static/OneSignalSDKWorker.js
```

---

## Variáveis de ambiente

As variáveis ficam configuradas **no painel da Vercel** (nunca no .env em produção):

- `SUPABASE_URL` — URL do projeto Supabase
- `SUPABASE_KEY` — chave pública (anon key) do Supabase
- `SECRET_KEY` — chave secreta Flask
- `ONESIGNAL_APP_ID` — ID do app OneSignal

O arquivo `.env` existe APENAS localmente para desenvolvimento.

---

## Diferenças Render vs Vercel

| Aspecto           | Render (antigo)       | Vercel (atual)               |
|-------------------|-----------------------|------------------------------|
| Tipo              | Servidor persistente  | Serverless functions         |
| Cold start        | ~15-30s               | ~500ms a 1s                  |
| Idle timeout      | 15 min → cold start   | Escala automático            |
| Configuração      | Procfile + gunicorn   | vercel.json + api/index.py   |
| Deploy trigger    | git push              | git push (igual)             |
| Variáveis env     | Dashboard Render      | Dashboard Vercel             |
| Logs              | dashboard.render.com  | vercel.com/dashboard → Logs  |

---

## Limitações da Vercel (plano gratuito)

| Limite               | Valor                          |
|----------------------|--------------------------------|
| Execuções/mês        | 100.000 funções                |
| Timeout por função   | 10 segundos                    |
| Tamanho da função    | 50MB (configurado no vercel.json) |
| Bandwidth            | 100GB/mês                      |

> O app Maria Luiza está bem dentro desses limites.

---

## Diagnóstico: Interpreting `git status`

| Mensagem                          | Significado                        | Ação necessária |
|-----------------------------------|------------------------------------|-----------------|
| `nothing to commit, working tree clean` | Tudo salvo e enviado ✓       | Nenhuma         |
| `Changes not staged for commit`   | Arquivos modificados, não stagados | `git add`       |
| `Changes to be committed`         | Stagado, não commitado             | `git commit`    |
| `Your branch is ahead of origin`  | Commitado localmente, não enviado  | `git push`      |
| `Everything up-to-date`           | GitHub já tem este commit ✓        | Nenhuma         |

---

## Histórico de Commits do Projeto

```
(ver com: git log --oneline)
ba346ba  fix: remedio tomar do agora, dashboard paralelo, contagens corretas
e488157  docs: MEMORIA_GIT.md com diagnóstico do fluxo Git/GitHub/Render
8a5be6f  fix: PWA reinstall, ícone ML premium, dashboard consultas e timer SW
ce1ca3b  feat: timer real em background, cards consultas, ícone ML e PWA
0e2408d  fix: Render deploy, SW unificado, foto mobile
```

---

## .gitignore — O que NÃO é enviado ao GitHub

- `.env` — variáveis de ambiente (nunca commitar!)
- `__pycache__/` — cache Python
- `venv/` — ambiente virtual Python
- `.vscode/` — configurações locais do VS Code

Estes arquivos ficam APENAS no computador local. As variáveis de ambiente
são configuradas diretamente no painel da Vercel (Environment Variables).
