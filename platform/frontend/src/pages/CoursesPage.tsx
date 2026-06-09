const PHASES = [
  {
    phase: 1, label: 'Python com Intenção', status: 'active',
    modules: [
      { title: 'Tipos de dados reais do Python', status: 'next', topics: ['float vs double', 'str vs char', 'bool, list, dict'] },
      { title: 'Funções', status: 'locked', topics: ['return vs print', '*args, **kwargs', 'default arguments'] },
      { title: 'Estruturas de dados', status: 'locked', topics: ['dict como acumulador', 'list comprehension', 'operações em lista'] },
      { title: 'Controle de fluxo', status: 'locked', topics: ['== vs is', 'mutabilidade', 'try/except/finally'] },
      { title: 'Async/Await', status: 'locked', topics: ['event loop', 'coroutines', 'asyncio correto'] },
    ]
  },
  {
    phase: 2, label: 'SQL com Fundamento', status: 'locked',
    modules: [
      { title: 'CRUD completo', status: 'locked', topics: ['INSERT, UPDATE, DELETE', 'transações'] },
      { title: 'Joins e Agregações', status: 'locked', topics: ['INNER, LEFT JOIN', 'GROUP BY, HAVING', 'COUNT, SUM, AVG'] },
      { title: 'Performance', status: 'locked', topics: ['índices', 'EXPLAIN ANALYZE', 'tipos corretos'] },
    ]
  },
  {
    phase: 3, label: 'FastAPI com Intenção', status: 'locked',
    modules: [
      { title: 'Pydantic e Validação', status: 'locked', topics: ['modelos', 'validação', '422 errors'] },
      { title: 'Autenticação', status: 'locked', topics: ['JWT', 'IDOR', 'proteção de endpoints'] },
      { title: 'Arquitetura', status: 'locked', topics: ['endpoint → service → repo', 'REST URIs', 'separação de camadas'] },
    ]
  },
  {
    phase: 4, label: 'ZionHub: Code Review Real', status: 'locked',
    modules: [
      { title: 'Análise de segurança', status: 'locked', topics: ['15 vulnerabilidades', 'IDOR cross-tenant', 'patches'] },
    ]
  },
]

const S: Record<string, { border: string; dot: string; label: string }> = {
  done:   { border: 'rgba(63,185,80,0.3)',    dot: 'var(--green)', label: 'done' },
  active: { border: 'rgba(68,188,211,0.3)',   dot: 'var(--cyan)',  label: 'active' },
  next:   { border: 'rgba(68,188,211,0.18)',  dot: 'var(--cyan)',  label: 'next' },
  locked: { border: 'var(--border)',          dot: 'var(--faint)', label: 'locked' },
}

export default function CoursesPage() {
  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '52px 48px 72px' }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 44 }}>
          <p style={{ fontSize: 11, color: 'var(--cyan)', marginBottom: 8, fontWeight: 500, letterSpacing: '0.06em' }}>
            // trilha de aprendizado
          </p>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: 'var(--text)', margin: '0 0 10px', letterSpacing: '-0.03em' }}>
            cursos
          </h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0, maxWidth: 480, lineHeight: 1.7 }}>
            cada módulo gera exercícios práticos calibrados para você,<br />
            baseados nos livros da biblioteca.
          </p>
        </div>

        {/* Phases */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {PHASES.map((phase, pi) => {
            const ps = S[phase.status]
            const isLocked = phase.status === 'locked'
            return (
              <div key={phase.phase} className="fade-up" style={{ animationDelay: `${pi * 60}ms`, opacity: 0 }}>

                {/* Phase header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isLocked ? 'transparent' : 'rgba(68,188,211,0.07)',
                    border: `1px solid ${ps.border}`,
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: ps.dot }}>{phase.phase}</span>
                  </div>
                  <h2 style={{
                    fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '-0.01em',
                    color: isLocked ? 'var(--faint)' : 'var(--text)',
                  }}>
                    {phase.label}
                  </h2>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 3,
                    border: `1px solid ${ps.border}`, color: ps.dot,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>
                    {ps.label}
                  </span>
                </div>

                {/* Modules grid */}
                <div style={{
                  marginLeft: 40,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 8,
                }}>
                  {phase.modules.map((mod, i) => {
                    const ms = S[mod.status]
                    return (
                      <div key={i} className="card" style={{
                        padding: '14px 16px',
                        borderColor: ms.border,
                        opacity: mod.status === 'locked' ? 0.5 : 1,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0, background: ms.dot }} />
                          <p style={{
                            fontSize: 12, fontWeight: 600, margin: 0,
                            color: mod.status === 'locked' ? 'var(--muted)' : 'var(--text)',
                          }}>
                            {mod.title}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {mod.topics.map(t => (
                            <span key={t} className="tag">{t}</span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>

              </div>
            )
          })}
        </div>

      </div>
    </div>
  )
}
