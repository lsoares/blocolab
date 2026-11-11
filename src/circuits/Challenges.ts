import type { Challenge } from '../loops/Challenge.ts'

export const challenges: Challenge[] = [
  {
    goal: 'Acende a lâmpada.',
    needs: { litLamps: 1 },
  },
  {
    goal: 'Faz o motor rodar.',
    needs: { runningMotors: 1 },
  },
  {
    goal: 'Faz a campainha tocar.',
    needs: { soundingBuzzers: 1 },
  },
  {
    goal: 'Acende a lâmpada e controla-a com um interruptor.',
    needs: { litLamps: 1, mainSwitch: true },
  },
  {
    goal: 'Acende duas lâmpadas com uma só pilha.',
    needs: { litLamps: 2, maxBatteries: 1 },
  },
  {
    goal: 'Faz a lâmpada acender e o motor rodar ao mesmo tempo.',
    needs: { litLamps: 1, runningMotors: 1 },
  },
  {
    goal: 'Faz a lâmpada acender, o motor rodar e a campainha tocar.',
    needs: { litLamps: 1, runningMotors: 1, soundingBuzzers: 1 },
  },
  {
    goal: 'Acende duas lâmpadas de modo a que, se tirares uma, a outra continue acesa.',
    needs: { litLamps: 2, lampsEachOnTheirOwnPath: true },
  },
  {
    goal: 'Acende duas lâmpadas de modo a que, se tirares uma, a outra se apague.',
    needs: { litLamps: 2, lampsOneAfterTheOther: true },
  },
  {
    goal: 'Faz dois motores rodar com uma só pilha.',
    needs: { runningMotors: 2, maxBatteries: 1 },
  },
  {
    goal: 'Faz um interruptor geral: a lâmpada, o motor e a campainha ligam e desligam todos com ele.',
    needs: { litLamps: 1, runningMotors: 1, soundingBuzzers: 1, mainSwitch: true },
  },
  {
    goal: 'Faz a lâmpada brilhar mais forte do que com uma só pilha.',
    needs: { litLamps: 1, everyLampAtLeast: 1.5 },
  },
  {
    goal: 'Acende duas lâmpadas, cada uma tão forte como se estivesse sozinha.',
    needs: { litLamps: 2, everyLampAtLeast: 0.85 },
  },
  {
    goal: 'Faz um curto-circuito de propósito.',
    needs: { shortCircuit: true },
  },
]
