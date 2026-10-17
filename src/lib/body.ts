export type BodyView = 'front' | 'back'

export const REGION_LABELS: Record<string, string> = {
  head: 'Head',
  neck: 'Neck',
  shoulder_l: 'Left shoulder',
  shoulder_r: 'Right shoulder',
  chest: 'Chest',
  stomach: 'Stomach',
  upper_back: 'Upper back',
  mid_back: 'Mid back',
  lower_back: 'Lower back',
  arm_l: 'Left arm / elbow',
  arm_r: 'Right arm / elbow',
  hand_l: 'Left forearm / hand',
  hand_r: 'Right forearm / hand',
  hip_l: 'Left hip / glute',
  hip_r: 'Right hip / glute',
  thigh_l: 'Left thigh',
  thigh_r: 'Right thigh',
  knee_l: 'Left knee',
  knee_r: 'Right knee',
  leg_l: 'Left shin / calf',
  leg_r: 'Right shin / calf',
  foot_l: 'Left ankle / foot',
  foot_r: 'Right ankle / foot',
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
  // Front view: the person's right side is on the viewer's left.
  const [leftSide, rightSide] = view === 'front' ? ['r', 'l'] : ['l', 'r']
  return LIMBS.flatMap(([base, s]) => [{ ...s, id: `${base}_${leftSide}` }, mirror(s, `${base}_${rightSide}`)])
}

const HEAD = [ell('head', { cx: 100, cy: 36, rx: 22, ry: 27 }), rect('neck', { x: 90, y: 62, w: 20, h: 16, rx: 5 })]

export const SHAPES: Record<BodyView, Shape[]> = {
  front: [
    ...HEAD,
    rect('chest', { x: 70, y: 80, w: 60, h: 56, rx: 12 }),
    rect('stomach', { x: 72, y: 137, w: 56, h: 50, rx: 10 }),
    ...limbs('front'),
  ],
  back: [
    ...HEAD,
    rect('upper_back', { x: 70, y: 80, w: 60, h: 40, rx: 12 }),
    rect('mid_back', { x: 71, y: 121, w: 58, h: 30, rx: 6 }),
    rect('lower_back', { x: 72, y: 152, w: 56, h: 35, rx: 8 }),
    ...limbs('back'),
  ],
}

export const PAIN_COLORS = ['#334155', '#facc15', '#f97316', '#dc2626']
export const PAIN_LABELS = ['None', 'Mild', 'Moderate', 'Severe']
