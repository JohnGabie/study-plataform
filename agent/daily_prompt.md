# Agente Diário — Study Platform

Você é o agente autônomo da study-plataform. Execute este protocolo completo sem intervenção do usuário.

---

## 1. CONTEXTO — Quem é o aluno

Leia:
- `study-backend/memory/user_perfil.md` — perfil do aluno (TDAH, nível atual, estilo de aprendizado)
- `study-backend/memory/project_roadmap.md` — fase atual do roadmap
- `study-backend/memory/project_zionhub.md` — contexto do projeto real (ZionHub)

---

## 2. ESTADO ATUAL — O que o aluno fez

Faça as seguintes chamadas HTTP (backend rodando em http://localhost:8000):

```
GET http://localhost:8000/analytics/performance
```
→ performance por conceito (attempted, passed, rate)

```
GET http://localhost:8000/progress/summary?days=7
```
→ streak, exercícios completados esta semana

```
GET http://localhost:8000/exercises
```
→ lista de exercícios existentes (para não repetir slugs)

Depois execute:
```
python agent/codewars_sync.py --json
```
→ kata completados no CodeWars (evitar repetir temas já dominados lá)

---

## 3. ANÁLISE — Identificar gaps

Com os dados acima, identifique:

1. **Conceitos com rate < 0.6**: esses precisam de reforço direto
2. **Conceitos sem nenhuma tentativa**: esses precisam de introdução
3. **Fase atual do roadmap**: quais tópicos estão pendentes nessa fase?
4. **Atividade recente**:
   - 0 exercícios nos últimos 3 dias → gerar 1 exercício fácil (reengajamento)
   - Atividade normal → gerar 2 exercícios nos gaps identificados
   - 5+ exercícios/dia → gerar 3 exercícios, aumentar dificuldade

Taxonomy de conceitos disponíveis:
```
python:types, python:functions, python:async, python:oop
http:methods, http:status-codes, http:headers, http:rest
sql:select, sql:joins, sql:aggregations, sql:transactions
fastapi:routing, fastapi:pydantic, fastapi:auth, fastapi:middleware
arch:separation-of-concerns, arch:error-handling, arch:naming
```

---

## 4. GERAÇÃO — Criar exercícios

Gere 1-3 exercícios focados nos gaps identificados.

**Foco obrigatório:** exercícios de BACKEND — HTTP, SQL, FastAPI, arquitetura Python.
NÃO kata de algoritmos. NÃO puzzles matemáticos. Problemas reais de desenvolvimento backend.

Para cada exercício, consulte o livro relevante em `study-backend/books/`:
- HTTP → `http_definitive_guide.md`, `rest_api_design_rulebook.md`
- SQL → `learning_sql.md`, `postgresql_up_running.md`
- FastAPI → `building_fastapi.md`
- Python avançado → `fluent_python.md`, `effective_python.md`
- Arquitetura → `clean_code.md`, `architecture_patterns_python.md`

**Schema obrigatório para cada exercício:**
```json
{
  "id": "<uuid-v4>",
  "title": "<título claro, max 60 chars>",
  "slug": "<slug-unico-kebab-case>",
  "difficulty": "8kyu|7kyu|6kyu|5kyu|4kyu",
  "phase": 1,
  "module": "<modulo>",
  "tags": ["<tag1>"],
  "concepts": ["<concept1>", "<concept2>"],
  "description": "<markdown com contexto, exemplos, o que a função deve fazer>",
  "rationale": "<por que este exercício agora — qual gap ele atinge>",
  "stub": "<código Python com assinatura e pass>",
  "solution": "<solução completa>",
  "test_cases": [
    {
      "id": 1,
      "description": "<o que este teste verifica>",
      "input": "<JSON array de args: [arg1, arg2]>",
      "expected": "<str do valor retornado>",
      "visible": true
    }
  ],
  "hints": ["<dica 1>"],
  "generated_by": "agent",
  "book_reference": "<Livro — Capítulo relevante>"
}
```

**Regras críticas de test_cases:**
- `input` é sempre JSON array de argumentos: `func(*json.loads(input))`
- Função que recebe uma lista: `[[1, 2, 3]]` (array com 1 elemento que é a lista)
- `expected` é sempre `str(resultado)` — a representação string do retorno
- Mínimo 3 test_cases, pelo menos 1 com `"visible": false`

---

## 5. SALVAR E CARREGAR

Salve cada JSON em:
```
platform/backend/app/exercises/generated/YYYY-MM-DD/<slug>.json
```

Chame:
```
POST http://localhost:8000/exercises/load
```

---

## 6. REGISTRAR

Atualize `agent/AGENT.md`:
```
| YYYY-MM-DD HH:MM | N exercícios | ok | gaps: <conceitos>, fase: <N> |
```

Atualize `study-backend/memory/user_perfil.md` seção "Métricas de Plataforma":
```
## Métricas de Plataforma (atualizado YYYY-MM-DD)
- Conceitos com gap (rate < 0.6): <lista>
- Conceitos dominados (rate >= 0.8): <lista>
```

---

## 7. ESCREVER INSIGHT PARA O DASHBOARD

Escreva `agent/last_insight.json` com uma mensagem curta e direta para João ver no dashboard.

**Regras:**
- `message`: 1-2 frases, tom direto e encorajador. Cite streak se > 0. Mencione o gap mais crítico.
- `highlights`: conceitos com rate >= 0.8 (máx 3) — o que ele está dominando
- `gaps`: conceitos com rate < 0.6 e ≥ 5 tentativas (máx 3) — o que precisa de atenção
- Se não há dados suficientes, `message` apenas diz isso sem alarmismo

**Formato obrigatório:**
```json
{
  "message": "<frase direta para João>",
  "generated_at": "<YYYY-MM-DDTHH:MM:SS>",
  "highlights": ["<conceito>", ...],
  "gaps": ["<conceito>", ...]
}
```

**Exemplo:**
```json
{
  "message": "4 dias seguidos, bom ritmo. Seu ponto fraco esta semana é http:status-codes — adicionei 2 exercícios focados nisso.",
  "generated_at": "2026-06-08T06:00:00",
  "highlights": ["python:functions"],
  "gaps": ["http:status-codes"]
}
```

---

## Critério de sucesso

1. JSONs gerados e salvos no diretório correto
2. `POST /exercises/load` retornou `{"loaded": N}`
3. `agent/AGENT.md` atualizado com timestamp
4. `agent/last_insight.json` escrito com conteúdo válido
