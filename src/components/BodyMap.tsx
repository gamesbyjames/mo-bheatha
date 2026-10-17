import { PAIN_COLORS, REGION_LABELS, SHAPES, VIEW_H, VIEW_W, type BodyView, type Shape } from '../lib/body'

interface Props {
  view: BodyView
  /** Pain intensities 0-3 (input mode) */
  values?: Record<string, number>
  /** 0..1 per region (heatmap mode) */
  heat?: Record<string, number>
  onTap?: (id: string) => void
  className?: string
}

export default function BodyMap({ view, values = {}, heat, onTap, className }: Props) {
  const [leftLabel, rightLabel] = view === 'front' ? ['R', 'L'] : ['L', 'R']

  const fill = (id: string) => {
    if (heat) {
      const h = heat[id] ?? 0
      return h > 0 ? `rgba(239, 68, 68, ${0.2 + h * 0.8})` : PAIN_COLORS[0]
    }
    return PAIN_COLORS[values[id] ?? 0]
  }

  const props = (s: Shape) => ({
    fill: fill(s.id),
    stroke: '#0f172a',
    strokeWidth: 1.5,
    style: { transition: 'fill 0.15s', cursor: onTap ? 'pointer' : 'default' },
    onClick: onTap ? () => onTap(s.id) : undefined,
    role: onTap ? 'button' : undefined,
    'aria-label': REGION_LABELS[s.id],
  })

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={className} style={{ touchAction: 'manipulation' }}>
      <text x={12} y={24} fill="#64748b" fontSize={14} fontWeight={700}>
        {leftLabel}
      </text>
      <text x={VIEW_W - 22} y={24} fill="#64748b" fontSize={14} fontWeight={700}>
        {rightLabel}
      </text>
      {SHAPES[view].map((s) =>
        s.kind === 'rect' ? (
          <rect key={s.id} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} {...props(s)}>
            <title>{REGION_LABELS[s.id]}</title>
          </rect>
        ) : (
          <ellipse key={s.id} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} {...props(s)}>
            <title>{REGION_LABELS[s.id]}</title>
          </ellipse>
        ),
      )}
    </svg>
  )
}
