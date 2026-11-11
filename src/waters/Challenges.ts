import type { Challenge } from '../loops/Challenge.ts'

export const challenges: Challenge[] = [
  { goal: 'Faz o chafariz jorrar.', needs: { litLamps: 1 } },
  { goal: 'Faz a roda de água girar.', needs: { runningMotors: 1 } },
  { goal: 'Faz o borbulhador borbulhar.', needs: { soundingBuzzers: 1 } },
  { goal: 'Faz o chafariz jorrar e controla-o com uma torneira.', needs: { litLamps: 1, mainSwitch: true } },
  { goal: 'Faz dois chafarizes jorrar com uma só bomba.', needs: { litLamps: 2, maxBatteries: 1 } },
  { goal: 'Faz o chafariz jorrar e a roda girar ao mesmo tempo.', needs: { litLamps: 1, runningMotors: 1 } },
  {
    goal: 'Faz o chafariz jorrar, a roda girar e o borbulhador borbulhar.',
    needs: { litLamps: 1, runningMotors: 1, soundingBuzzers: 1 },
  },
  {
    goal: 'Faz dois chafarizes jorrar de modo a que, se tirares um, o outro continue a jorrar.',
    needs: { litLamps: 2, lampsEachOnTheirOwnPath: true },
  },
  {
    goal: 'Faz dois chafarizes jorrar de modo a que, se tirares um, o outro pare.',
    needs: { litLamps: 2, lampsOneAfterTheOther: true },
  },
  { goal: 'Faz duas rodas girar com uma só bomba.', needs: { runningMotors: 2, maxBatteries: 1 } },
  {
    goal: 'Faz uma torneira geral: o chafariz, a roda e o borbulhador ligam e desligam todos com ela.',
    needs: { litLamps: 1, runningMotors: 1, soundingBuzzers: 1, mainSwitch: true },
  },
  { goal: 'Faz o chafariz jorrar mais alto do que com uma só bomba.', needs: { litLamps: 1, everyLampAtLeast: 1.5 } },
  {
    goal: 'Faz dois chafarizes jorrar, cada um tão alto como se estivesse sozinho.',
    needs: { litLamps: 2, everyLampAtLeast: 0.85 },
  },
  {
    goal: 'Faz um desvio sem resistência de propósito: um cano direto de um lado da bomba ao outro.',
    needs: { shortCircuit: true },
  },
]
