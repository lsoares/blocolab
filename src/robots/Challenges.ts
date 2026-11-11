export type Challenge = { goal: string; drawing: string[] }

export const challenges: Challenge[] = [
  { goal: 'Leva o robô até à estrela.', drawing: ['>..*'] },
  { goal: 'Vira para chegar à estrela.', drawing: ['>...', '...*'] },
  { goal: 'Contorna a pedra.', drawing: ['>.#.*', '.....'] },
  { goal: 'Vira à esquerda para chegar à estrela.', drawing: ['...*', '.##.', '>...'] },
  { goal: 'A estrela ficou para trás!', drawing: ['*..>'] },
  { goal: 'Passa por entre as pedras.', drawing: ['>.#.*', '..#..', '.....'] },
  { goal: 'A estrela está longe! Usa Repetir ×3.', drawing: ['>.....*'] },
  { goal: 'Vira e usa o Repetir ×3.', drawing: ['>...', '....', '...*'] },
]
