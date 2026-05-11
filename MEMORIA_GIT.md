# MEMORIA_GIT — Projeto Maria Luiza

## Estrutura do Deploy

```
Claude Code (edita arquivos no disco)
     ↓
Git (commit + push)
     ↓
GitHub: rafaelleaoeng08-source/projeto_maria_luiza  (branch: main)
     ↓
Render.com (auto-deploy ao receber push no main)
     ↓
App em produção
```

## Repositório

| Campo       | Valor                                                                 |
|-------------|-----------------------------------------------------------------------|
| Pasta local | `C:\Users\notebook\Desktop\projeto_maria_luiza`                       |
| Remote      | `https://github.com/rafaelleaoeng08-source/projeto_maria_luiza.git`  |
| Branch      | `main`                                                                |
| Pastas duplicadas? | NÃO — existe apenas UMA pasta do projeto no Desktop         |

## Diagnóstico do "problema" de 10/05/2026

### O que aconteceu

O usuário viu `nothing to commit, working tree clean` e `Everything up-to-date` e
concluiu que as alterações não foram salvas. **Isso é um diagnóstico incorreto.**

### Causa raiz real

`nothing to commit, working tree clean` é a **mensagem de sucesso** do Git.
Ela significa: "todos os arquivos já foram commitados e enviados ao GitHub".
NÃO significa "nenhuma alteração foi feita".

### Prova concreta

O hash do último commit local (`8a5be6f`) é **idêntico** ao hash no GitHub (`origin/main`):

```
Local:  8a5be6fb0addcdcb5d30467217a369f5eb521e02
GitHub: 8a5be6fb0addcdcb5d30467217a369f5eb521e02
```

Isso confirma que:
- Os arquivos foram alterados no disco ✓
- O commit foi criado ✓
- O push chegou no GitHub ✓

### O que o usuário provavelmente fez

1. Claude fez alterações + commit + push (em sessões anteriores)
2. Usuário abriu o terminal em outro momento
3. Rodou `git status` → viu "nothing to commit" (correto: já estava tudo feito)
4. Interpretou como "nenhuma alteração foi feita" (errado)

## Comandos Corretos

### Verificar estado atual
```bash
git status
git log --oneline -5
git diff origin/main HEAD
```

### Após o Claude fazer alterações (fluxo normal)
O Claude já faz `git add`, `git commit` e `git push` automaticamente.
Não é necessário fazer nada manualmente.

### Se quiser forçar um push manual
```bash
cd "C:\Users\notebook\Desktop\projeto_maria_luiza"
git status          # ver o que mudou
git add -A          # adicionar tudo
git commit -m "mensagem"
git push origin main
```

### Para verificar se o Render recebeu o deploy
1. Acesse: https://dashboard.render.com
2. Vá no serviço do projeto
3. Clique em "Deploys" para ver o histórico
4. O último deploy deve mostrar o hash do commit (8a5be6f ou mais recente)

## Interpretando `git status`

| Mensagem                          | Significado                        | Ação necessária |
|-----------------------------------|------------------------------------|-----------------|
| `nothing to commit, working tree clean` | Tudo salvo e enviado ✓       | Nenhuma         |
| `Changes not staged for commit`   | Arquivos modificados, não stagados | `git add`       |
| `Changes to be committed`         | Stagado, não commitado             | `git commit`    |
| `Your branch is ahead of origin`  | Commitado localmente, não enviado  | `git push`      |
| `Everything up-to-date`           | GitHub já tem este commit ✓        | Nenhuma         |

## Histórico de Commits do Projeto

```
8a5be6f  fix: PWA reinstall, ícone ML premium, dashboard consultas e timer SW
ce1ca3b  feat: timer real em background, cards consultas, ícone ML e PWA
0e2408d  fix: Render deploy, SW unificado, foto mobile
e206a68  Corrigindo porta Render
353d815  Primeira versão Maria Luiza
```

## Arquivos Principais e Última Modificação

| Arquivo                   | Última modificação | Conteúdo atual                         |
|---------------------------|-------------------|----------------------------------------|
| `static/script.js`        | 10/05 23:08       | Timer timestamp, floating widget, install |
| `static/sw.js`            | 10/05 23:07       | ml-v5, ML_TIMER_SCHEDULE handler       |
| `static/manifest.json`    | 10/05 23:06       | id: maria-luiza-pwa-v2, ícones locais  |
| `templates/index.html`    | 10/05 23:08       | type=date+time, floating-timer, card-instalar |
| `static/style.css`        | 10/05 23:08       | .consulta-card, .floating-timer, .dash-ev-item |
| `static/icons/ml.svg`     | 10/05 23:06       | Ícone ML rosa premium (local)          |

## Problemas Conhecidos e Soluções

### "Não aparece Adicionar à Tela Inicial"
→ Chrome ainda guarda estado da instalação anterior.
→ Solução: Configurações Android → Apps → Chrome → Armazenamento → Limpar cache

### "Ícone velho ainda aparece"
→ Cache do Chrome ainda usa ícone antigo.
→ Solução: Chrome → Menu ⋮ → Configurações → Privacidade → Limpar dados de navegação → Imagens em cache

### "Render não atualizou"
→ Verificar dashboard.render.com → Deploys
→ Se deploy falhou, ver o log de build
→ Se não há deploy novo, verificar webhook: Settings → Build & Deploy → Auto-Deploy

## .gitignore — O que NÃO é enviado ao GitHub (proposital)

- `.env` — variáveis de ambiente (Supabase URL, OneSignal key, etc.)
- `__pycache__/` — cache Python
- `venv/` — ambiente virtual Python
- `.vscode/` — configurações locais do VS Code

Estes arquivos ficam APENAS no computador local. As variáveis de ambiente
são configuradas diretamente no painel do Render (Environment Variables).
