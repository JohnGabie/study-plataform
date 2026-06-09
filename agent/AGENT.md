# AGENT.md — Agente Diário

**Horário:** 06:00 (diário)
**Status:** `[done]` — Task Scheduler configurado em 2026-06-04
**Última execução:** nunca (primeira execução: 2026-06-05 06:00)

---

## O que o agente faz

A cada execução às 6h, o agente:

1. **Lê o estado do aluno**
   - `study-backend/student/profile.md` — lacunas ativas e pontos fortes
   - Últimas 3 sessões em `study-backend/student/sessions/`
   - Banco: quantos exercícios completados nos últimos 7 dias via `GET /progress/summary`

2. **Calibra a geração**
   - 0 exercícios nos últimos 3 dias → 1 exercício de reengajamento (dificuldade baixa, prazer alto)
   - Atividade normal → 2 exercícios alinhados com próxima lacuna do roadmap
   - Alta atividade (5+/dia) → 3 exercícios, aumentar dificuldade gradualmente

3. **Gera exercícios**
   - Seguindo o schema em `agent/exercise_schema.md`
   - Cada exercício tem `rationale` explicando por que foi gerado
   - Referência ao livro relevante quando aplicável

4. **Escreve os exercícios**
   - Salva JSONs em `platform/backend/app/exercises/generated/YYYY-MM-DD/`
   - Faz POST para `http://localhost:8000/exercises/load` para carregar no banco

5. **Atualiza métricas**
   - Registra em `study-backend/student/profile.md` seção "Métricas de Plataforma"
   - Atualiza este arquivo (AGENT.md) com timestamp da última execução

---

## Protocolo de falha

Se o backend não estiver rodando (POST falhar):
- Salva os JSONs normalmente
- Registra falha neste arquivo com timestamp
- **Não** tenta reenviar em loop
- Na próxima execução, verifica exercícios pendentes de carga e tenta novamente

---

## Histórico de execuções

| Data | Exercícios gerados | Status | Notas |
|------|--------------------|--------|-------|
| 2026-06-08 06:00 | 1 exercício | ok | gaps: python:functions (*args), fase: 1, reengajamento (0 atividade) |

---

## Configuração local (Windows Task Scheduler)

O agente NÃO usa CCR remoto — acessa localhost:8000 e arquivos locais.

**Tarefa registrada:** `StudyPlatformDailyAgent`
**Script:** `agent/run_daily_agent.ps1`
**Logs:** `agent/logs/YYYY-MM-DD.log`

Para gerenciar:
```powershell
# Ver status
schtasks /query /tn "StudyPlatformDailyAgent"

# Rodar agora (teste)
schtasks /run /tn "StudyPlatformDailyAgent"

# Desabilitar
schtasks /change /tn "StudyPlatformDailyAgent" /disable

# Deletar
schtasks /delete /tn "StudyPlatformDailyAgent" /f
```
