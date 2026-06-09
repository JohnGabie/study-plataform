# Exercise Schema — Formato de Exercícios

Todo exercício gerado pelo agente deve seguir este schema. Validar antes de salvar.

---

## JSON Schema

```json
{
  "id": "string (UUID v4)",
  "title": "string (máx 80 chars)",
  "slug": "string (kebab-case, único)",
  "difficulty": "string (enum: 8kyu|7kyu|6kyu|5kyu|4kyu)",
  "phase": "integer (1-4, alinhado com roadmap)",
  "module": "string (ex: estruturas-de-dados, async-await, sql-fundamentos)",
  "tags": ["array de strings"],
  "description": "string (Markdown — inclui contexto, problema, exemplos)",
  "rationale": "string (por que este exercício agora — lacuna específica do aluno)",
  "stub": "string (código inicial que o aluno vê no editor)",
  "solution": "string (solução completa — não exibida ao aluno)",
  "test_cases": [
    {
      "id": "integer",
      "description": "string (o que este teste verifica)",
      "input": "string (representação Python do input)",
      "expected": "string (representação Python do output esperado)",
      "visible": "boolean (true = aluno vê, false = caso oculto)"
    }
  ],
  "hints": ["array de strings (máx 3 hints)"],
  "created_at": "string (ISO 8601)",
  "generated_by": "string (agent-daily | manual)",
  "book_reference": "string ou null (Livro — Cap. X: Nome)"
}
```

---

## Regras de validação

1. **Pelo menos 2 test cases visíveis e 1 oculto** — os ocultos evitam hardcode
2. **stub deve ter a assinatura correta** — aluno não deve precisar criar a função
3. **solution deve passar em todos os test cases** — validar antes de salvar
4. **rationale é obrigatório** — sem exercício sem justificativa pedagógica
5. **difficulty deve ser consistente com phase:**
   - Phase 1 → 8kyu ou 7kyu
   - Phase 2 → 7kyu ou 6kyu
   - Phase 3 → 6kyu ou 5kyu
   - Phase 4 → 5kyu ou 4kyu

---

## Template de exercício por lacuna ativa

### Para lacuna: `async/await — event loop`
```python
# stub sugerido
import asyncio

async def buscar_dados(url: str) -> str:
    # simule uma operação assíncrona aqui
    # ATENÇÃO: não use time.sleep()
    pass
```

### Para lacuna: `dict como acumulador`
```python
# stub sugerido
def contar_ocorrencias(items: list) -> dict:
    pass
```

### Para lacuna: `return vs print`
```python
# stub sugerido
def calcular_media(numeros: list) -> float:
    # este exercício deve RETORNAR o valor, não imprimir
    pass
```

---

## Exemplo completo válido

```json
{
  "id": "a3f1c2d4-1234-4abc-9def-0123456789ab",
  "title": "Contar frequência de elementos",
  "slug": "contar-frequencia-elementos",
  "difficulty": "8kyu",
  "phase": 1,
  "module": "estruturas-de-dados",
  "tags": ["dict", "acumulador", "list", "fundamentos"],
  "description": "## Contar frequência de elementos\n\nDada uma lista de qualquer tipo, retorne um dicionário com a frequência de cada elemento.\n\n### Exemplo\n```python\ncontar_frequencia([\"a\", \"b\", \"a\"]) == {\"a\": 2, \"b\": 1}\n```\n\n**Nota:** Não use `collections.Counter` — o objetivo é implementar o acumulador manualmente.",
  "rationale": "O aluno tem lacuna ativa em 'dict como acumulador' (student/profile.md, seção Lacunas Ativas). Este exercício força o padrão de inicialização condicional com dict.get() sem teoria prévia — avaliação por ação, conforme feedback_avaliacao.md.",
  "stub": "def contar_frequencia(lista: list) -> dict:\n    pass",
  "solution": "def contar_frequencia(lista: list) -> dict:\n    resultado = {}\n    for item in lista:\n        resultado[item] = resultado.get(item, 0) + 1\n    return resultado",
  "test_cases": [
    {
      "id": 1,
      "description": "lista com repetições simples",
      "input": "[\"a\", \"b\", \"a\", \"c\", \"b\", \"a\"]",
      "expected": "{\"a\": 3, \"b\": 2, \"c\": 1}",
      "visible": true
    },
    {
      "id": 2,
      "description": "lista vazia",
      "input": "[]",
      "expected": "{}",
      "visible": true
    },
    {
      "id": 3,
      "description": "todos elementos iguais",
      "input": "[1, 1, 1, 1]",
      "expected": "{1: 4}",
      "visible": true
    },
    {
      "id": 4,
      "description": "caso oculto — tipos mistos",
      "input": "[1, \"1\", 1, True]",
      "expected": "{1: 3, \"1\": 1}",
      "visible": false
    }
  ],
  "hints": [
    "dict.get(chave, valor_padrão) retorna o valor_padrão se a chave não existir",
    "Pense: o que acontece na primeira vez que você encontra um elemento novo?"
  ],
  "created_at": "2026-06-04T06:00:00",
  "generated_by": "agent-daily",
  "book_reference": "Fluent Python — Cap. 3: Dictionaries and Sets"
}
```
