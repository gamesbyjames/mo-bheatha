export type BodyView = 'front' | 'back'

/** Torso regions that are split into left and right halves. Older entries used the whole region. */
export const SPLIT_REGIONS = ['chest', 'stomach', 'upper_back', 'mid_back', 'lower_back']

const BASE_LABELS: Record<string, string> = {
  head: 'Head',
  neck: 'Neck',
  chest: 'Chest',
  stomach: 'Stomach',
  upper_back: 'Upper back',
  mid_back: 'Mid back',
  lower_back: 'Lower back',
  shoulder: 'shoulder',
  arm: 'arm / elbow',
  hand: 'forearm / hand',
  hip: 'hip / glute',
  thigh: 'thigh',
  knee: 'knee',
  leg: 'shin / calf',
  foot: 'ankle / foot',
}

const SIDED = ['shoulder', 'arm', 'hand', 'hip', 'thigh', 'knee', 'leg', 'foot', ...SPLIT_REGIONS]

export const REGION_LABELS: Record<string, string> = {
  head: BASE_LABELS.head,
  neck: BASE_LABELS.neck,
  // Legacy whole-torso regions, still shown in history
  ...Object.fromEntries(SPLIT_REGIONS.map((r) => [r, BASE_LABELS[r]])),
  ...Object.fromEntries(
    SIDED.flatMap((b) => {
      const l = BASE_LABELS[b]
      const lower = SPLIT_REGIONS.includes(b) ? l.toLowerCase() : l
      return [
        [`${b}_l`, `Left ${lower}`],
        [`${b}_r`, `Right ${lower}`],
      ]
    }),
  ),
}

/** The base region for a split torso half, e.g. lower_back_l → lower_back */
export function splitBase(region: string): string | null {
  if (SPLIT_REGIONS.includes(region)) return region
  const base = region.replace(/_[lr]$/, '')
  return base !== region && SPLIT_REGIONS.includes(base) ? base : null
}

/** Converts old whole-torso regions into both halves (used by "Same as last" and the heatmap). */
export function expandLegacy(pain: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  const set = (r: string, v: number) => (out[r] = Math.max(out[r] ?? 0, v))
  for (const [r, v] of Object.entries(pain)) {
    if (SPLIT_REGIONS.includes(r)) {
      set(`${r}_l`, v)
      set(`${r}_r`, v)
    } else set(r, v)
  }
  return out
}

/**
 * Pain score for one check-in: sum of intensities, where the two halves of a
 * torso region count once (the worse side). This keeps scores comparable with
 * entries made before the torso was split.
 */
export function painScore(pain: Record<string, number>): number {
  const groups: Record<string, number> = {}
  for (const [r, v] of Object.entries(pain)) {
    const g = splitBase(r) ?? r
    groups[g] = Math.max(groups[g] ?? 0, v)
  }
  return Object.values(groups).reduce((a, b) => a + b, 0)
}

/** Short readable list, merging matching torso halves: "Lower back (moderate) · Left knee (mild)" */
export function describePain(pain: Record<string, number>): string[] {
  const p = expandLegacy(pain)
  const out: string[] = []
  const done = new Set<string>()
  for (const [r, v] of Object.entries(p)) {
    if (done.has(r)) continue
    const base = splitBase(r)
    if (base && p[`${base}_l`] === p[`${base}_r`]) {
      done.add(`${base}_l`).add(`${base}_r`)
      out.push(`${BASE_LABELS[base]} (${PAIN_LABELS[v].toLowerCase()})`)
    } else {
      done.add(r)
      out.push(`${REGION_LABELS[r] ?? r} (${PAIN_LABELS[v].toLowerCase()})`)
    }
  }
  return out
}

export type Shape =
  | { id: string; kind: 'rect'; x: number; y: number; w: number; h: number; rx: number }
  | { id: string; kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }

export const VIEW_W = 200
export const VIEW_H = 412

type R = Omit<Extract<Shape, { kind: 'rect' }>, 'id' | 'kind'>
type E = Omit<Extract<Shape, { kind: 'ellipse' }>, 'id' | 'kind'>

const rect = (id: string, r: R): Shape => ({ id, kind: 'rect', ...r })
const ell = (id: string, e: E): Shape => ({ id, kind: 'ellipse', ...e })

/** Which side of the person is on the viewer's left/right. Front view is mirrored. */
const sides = (view: BodyView) => (view === 'front' ? (['r', 'l'] as const) : (['l', 'r'] as const))

/** Limbs drawn on the viewer's left, mirrored to the right. */
const LIMBS: Array<[string, Shape]> = [
  ['arm', rect('', { x: 45, y: 98, w: 17, h: 62, rx: 8 })],
  ['hand', rect('', { x: 41, y: 163, w: 17, h: 68, rx: 8 })],
  ['hip', rect('', { x: 72, y: 188, w: 27, h: 32, rx: 8 })],
  ['thigh', rect('', { x: 73, y: 222, w: 25, h: 74, rx: 10 })],
  ['knee', ell('', { cx: 86, cy: 308, rx: 12, ry: 10 })],
  ['leg', rect('', { x: 76, y: 320, w: 20, h: 68, rx: 9 })],
  ['foot', rect('', { x: 72, y: 390, w: 24, h: 16, rx: 7 })],
  ['shoulder', ell('', { cx: 64, cy: 88, rx: 17, ry: 12 })],
]

function mirror(s: Shape, id: string): Shape {
  return s.kind === 'rect' ? { ...s, id, x: VIEW_W - s.x - s.w } : { ...s, id, cx: VIEW_W - s.cx }
}

function limbs(view: BodyView): Shape[] {
  const [a, b] = sides(view)
  return LIMBS.flatMap(([base, s]) => [{ ...s, id: `${base}_${a}` }, mirror(s, `${base}_${b}`)])
}

/** A torso block split down the middle */
function halves(base: string, r: R, view: BodyView): Shape[] {
  const [a, b] = sides(view)
  const w = r.w / 2
  return [rect(`${base}_${a}`, { ...r, w }), rect(`${base}_${b}`, { ...r, x: r.x + w, w })]
}

const HEAD = [ell('head', { cx: 100, cy: 36, rx: 22, ry: 27 }), rect('neck', { x: 90, y: 62, w: 20, h: 16, rx: 5 })]

export const SHAPES: Record<BodyView, Shape[]> = {
  front: [
    ...HEAD,
    ...halves('chest', { x: 70, y: 80, w: 60, h: 56, rx: 10 }, 'front'),
    ...halves('stomach', { x: 72, y: 137, w: 56, h: 50, rx: 9 }, 'front'),
    ...limbs('front'),
  ],
  back: [
    ...HEAD,
    ...halves('upper_back', { x: 70, y: 80, w: 60, h: 40, rx: 10 }, 'back'),
    ...halves('mid_back', { x: 71, y: 121, w: 58, h: 30, rx: 6 }, 'back'),
    ...halves('lower_back', { x: 72, y: 152, w: 56, h: 35, rx: 8 }, 'back'),
    ...limbs('back'),
  ],
}

export const PAIN_COLORS = ['#334155', '#facc15', '#f97316', '#dc2626']
export const PAIN_LABELS = ['None', 'Mild', 'Moderate', 'Severe']
