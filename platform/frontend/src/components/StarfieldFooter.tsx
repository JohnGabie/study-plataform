function makeShadows(n: number, color: string): string {
  const s: string[] = []
  for (let i = 0; i < n; i++)
    s.push(`${Math.floor(Math.random() * 2000)}px ${Math.floor(Math.random() * 2000)}px ${color}`)
  return s.join(', ')
}

const S1 = makeShadows(700, 'rgba(255, 255, 255, 0.35)')
const S2 = makeShadows(200, 'rgba(255, 255, 255, 0.55)')
const S3 = makeShadows(80,  'rgba(255, 255, 255, 0.85)')

function StarLayer({ shadows, size, duration }: { shadows: string; size: number; duration: number }) {
  const style: React.CSSProperties = {
    position: 'absolute',
    width: size, height: size,
    background: 'transparent',
    boxShadow: shadows,
    animation: `animStar ${duration}s linear infinite`,
  }
  return (
    <>
      <div style={style} />
      <div style={{ ...style, top: 2000 }} />
    </>
  )
}

export default function StarfieldFooter({ height = 220 }: { height?: number }) {
  return (
    <div style={{
      position: 'relative',
      height,
      overflow: 'hidden',
      flexShrink: 0,
      background: 'linear-gradient(to top, rgba(13,26,42,0.65) 0%, transparent 100%)',
    }}>
      <StarLayer shadows={S1} size={1} duration={50} />
      <StarLayer shadows={S2} size={2} duration={100} />
      <StarLayer shadows={S3} size={3} duration={150} />
    </div>
  )
}
