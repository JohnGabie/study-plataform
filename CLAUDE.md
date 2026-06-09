# CLAUDE.md — Arquiteto da Study Platform

> Este arquivo é carregado automaticamente a cada sessão. É a única fonte de verdade
> sobre COMO trabalhar. Para saber ONDE estamos, leia STATE.md e TASKS.md.

---

## BOOT SEQUENCE — Execute sempre ao iniciar uma sessão

```
1. Read STATE.md          → o que existe vs o que não existe
2. Read TASKS.md          → o que está pendente e o que está bloqueado
3. Read DECISIONS.md      → por que as coisas foram feitas assim
4. Read agent/AGENT.md    → estado do agente diário
```

Se STATE.md disser que uma feature está "done", verifique se o arquivo/diretório
correspondente existe antes de assumir que está pronto. Estado declarado ≠ estado real.

Após o boot: informe em uma linha — "Estado carregado. Fase X. Próxima tarefa: Y."
Nenhuma outra ação até o usuário confirmar.

---

## MISSÃO

Construir uma plataforma de aprendizado de backend para João — um único usuário com
TDAH que está aprendendo Python/FastAPI/SQL/HTTP para entender o ZionHub (seu projeto
em produção, vibecoded com IA).

A plataforma tem **dois tracks separados**:

### Track 1 — Cursos (estilo Duolingo)
Conteúdo estruturado baseado nos livros de `study-backend/books/`. Cada lição é um
capítulo com texto + exercícios práticos atrelados. Progressão linear por fase do
roadmap. O aluno avança módulo a módulo.

### Track 2 — Prática (estilo CodeWars, adaptativo)
Exercícios avulsos com execução real no browser (Pyodide). O diferencial é o motor
adaptativo: a IA analisa o desempenho por conceito e calibra a próxima leva.

**Foco de conteúdo:** exercícios de BACKEND — HTTP, SQL, FastAPI, arquitetura,
Python para backend. Não kata de algoritmos. Não puzzles. Problemas reais de
desenvolvimento backend.

**O CodeWars API** serve apenas para contexto: saber o que João já resolveu lá
para não repetir e entender seu nível. Não é para copiar exercícios do CodeWars.

**O objetivo final:** João entender o ZionHub titim por titim, sem depender de IA
para saber o que está acontecendo no próprio código.

---

## STACK

| Camada | Tecnologia | Motivo |
|--------|-----------|--------|
| Backend | FastAPI + SQLite → PostgreSQL | Alinha com o que João aprende |
| Frontend | React 18 + Vite + TypeScript | SPA simples |
| Editor | Monaco Editor | Mesmo do VS Code |
| Execução de código | Pyodide (Python no browser) | Sem servidor de execução |
| Fonte tipográfica | JetBrains Mono (única fonte) | Dev tool aesthetic, sem Syne/Outfit |
| Auth | Google OAuth + dev bypass | Zero fricção |
| Agente | Claude Code /schedule (6h) | Usa conta do usuário, sem API key no backend |
| Conteúdo | study-backend/ (21 livros, perfil, quizzes) | Fonte de verdade do conteúdo |

---

## ESTRUTURA DE ARQUIVOS

```
study-plataform/
├── CLAUDE.md               ← este arquivo (arquiteto)
├── ARCHITECTURE.md         ← decisões técnicas detalhadas
├── STATE.md                ← estado atual do build (SEMPRE atualizar)
├── TASKS.md                ← fila de tarefas com dependências
├── DECISIONS.md            ← log ADR (nunca deletar entradas)
├── study-backend/          ← conteúdo fonte — NÃO MODIFICAR estrutura
│   ├── CLAUDE.md           ← instruções do mentor socrático
│   ├── books/              ← 21 livros em MD (Python, FastAPI, SQL, etc.)
│   ├── memory/             ← perfil do aluno, roadmap, feedback
│   ├── quizzes/            ← provas diagnósticas já feitas
│   └── student/            ← perfil dinâmico + sessões
├── platform/
│   ├── backend/            ← FastAPI (porta 8000)
│   │   └── app/
│   │       ├── main.py
│   │       ├── models/     ← Exercise, TestCase, Submission, DailyProgress, User
│   │       ├── routers/    ← exercises, submissions, progress, users, auth
│   │       ├── services/   ← exercise_loader, progress_service
│   │       ├── db/         ← database.py (SQLite)
│   │       └── exercises/generated/  ← JSONs de exercícios (por data)
│   └── frontend/           ← React + Vite (porta 5173)
│       └── src/
│           ├── pages/      ← Dashboard, Exercise, Profile, Courses, Login
│           ├── components/ ← Sidebar (icon rail 60px), AppLayout
│           ├── hooks/      ← usePyodide
│           └── auth/       ← AuthContext
└── agent/
    ├── AGENT.md            ← estado do agente + histórico de execuções
    ├── daily_prompt.md     ← prompt completo que o /schedule executa
    ├── exercise_schema.md  ← schema JSON dos exercícios
    └── codewars_sync.py    ← lê perfil público JohnGabie via API CodeWars
```

---

## COMO O AGENTE ADAPTATIVO FUNCIONA

O agente NÃO valida exercícios em tempo real. Opera em ciclos assíncronos:

```
Rodada de exercícios
    ↓ (Pyodide valida se código passou/falhou)
Submission salva no banco com: status, test_results, time_spent, concepts
    ↓
Agente executa a cada 6h via /schedule
    ↓
Lê: GET /analytics/performance  → taxa de acerto por conceito
Lê: study-backend/memory/user_perfil.md  → quem é o aluno
Lê: study-backend/memory/project_roadmap.md  → onde está no roadmap
Lê: codewars_sync.py output  → o que já resolveu no CodeWars
    ↓
Analisa: quais conceitos têm taxa < 60%? o que veio da sessão anterior?
    ↓
Gera: 1-3 exercícios JSON focados nos gaps identificados
    ↓
Salva em: platform/backend/app/exercises/generated/YYYY-MM-DD/
Chama: POST http://localhost:8000/exercises/load
Registra: agent/AGENT.md com timestamp e o que foi gerado
```

**Calibração de quantidade:**
- 0 exercícios nos últimos 3 dias → 1 exercício fácil (reengajamento)
- Atividade normal → 2 exercícios nos gaps identificados
- Alta atividade (5+/dia) → 3 exercícios, dificuldade cresce

**Conceitos rastreados** (campo `concepts` em cada exercício):
```
python:types, python:functions, python:async, python:oop
http:methods, http:status-codes, http:headers, http:rest
sql:select, sql:joins, sql:aggregations, sql:transactions
fastapi:routing, fastapi:pydantic, fastapi:auth, fastapi:middleware
arch:separation-of-concerns, arch:error-handling, arch:naming
```

---

## PROTOCOLO DE TRABALHO

### Ao iniciar uma tarefa
1. Leia a task — entenda o critério de conclusão antes de começar
2. Se depende de outra não concluída, pare e sinalize
3. Escreva o código mínimo que satisfaz o critério. Nada além.

### Ao concluir uma tarefa
1. Marque `[done]` em TASKS.md
2. Atualize STATE.md
3. Se fecha uma fase: adicione ADR em DECISIONS.md

### Quando o contexto estiver ficando longo
1. Atualize STATE.md + TASKS.md antes de qualquer compactação
2. Anote tarefas em progresso com contexto suficiente para retomar

### Quando bloqueado
1. Escreva em TASKS.md seção BLOCKED: o que precisa + por quê está bloqueado
2. Adicione ao DECISIONS.md como "PENDENTE — aguardando usuário"
3. Não invente soluções que aumentam acoplamento

---

## PRINCÍPIOS DE CÓDIGO

1. **Mínimo que funciona** — sem abstrações para "futuro"
2. **Um arquivo por responsabilidade** — router, service, model separados
3. **Sem comentários óbvios** — nome de função já documenta
4. **Estado nunca em memória** — tudo no banco
5. **Zero dependência de context window** — os arquivos contam tudo

---

## ANTI-PADRÕES

- ❌ Exercícios de algoritmo puro (ordenação, busca binária) — foco é backend
- ❌ Validação de resposta em tempo real por IA — agente opera em batch
- ❌ Adicionar ANTHROPIC_API_KEY ao backend — agente roda via Claude Code /schedule
- ❌ Copiar exercícios do CodeWars — CodeWars API é só para contexto de perfil
- ❌ Modificar `study-backend/` exceto `student/profile.md` via agente
- ❌ Usar Syne, Outfit ou qualquer fonte que não seja JetBrains Mono
- ❌ Fazer commit sem atualizar STATE.md
- ❌ Decidir arquitetura sem registrar em DECISIONS.md
- ❌ Confiar na conversa para reconstruir contexto — sempre leia os arquivos
