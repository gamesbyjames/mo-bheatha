export const MOODS = [
  { v: 1, face: '😣', label: 'Awful' },
  { v: 2, face: '😕', label: 'Low' },
  { v: 3, face: '😐', label: 'OK' },
  { v: 4, face: '🙂', label: 'Good' },
  { v: 5, face: '😄', label: 'Great' },
]

export const moodFace = (m: number | null) => (m ? MOODS[Math.round(m) - 1].face : '·')
