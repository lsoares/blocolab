import type { Game, GameSession } from '../Game.ts'
import { measureBoardThatFits } from '../stage/BoardCamera.ts'
import { CardTray } from './CardTray.ts'
import { challenges } from './Challenges.ts'
import { buildCourse } from './Course.ts'
import { Mission } from './Mission.ts'
import { RobotView } from './RobotView.ts'

export const robots: Game = {
  id: 'robo',
  name: 'Robô',
  icon: '🤖',
  tools: [],
  goals: challenges.map(({ goal }) => goal),
  startSession,
}

function startSession(canvas: HTMLCanvasElement, onChanged: () => void): GameSession {
  const size = measureBoardThatFits(canvas.clientWidth / 2, canvas.clientHeight / 2)
  const view = new RobotView(canvas, size)
  let mission = new Mission(buildCourse(challenges[0].drawing, size))
  let wasShowing = ''
  const show = () => {
    tray.show({
      cards: mission.listCards(),
      running: mission.isRunning(),
      canRepeat: mission.canRepeat(),
      current: mission.findCardInProgress(),
    })
    wasShowing = describeMission(mission)
    onChanged()
  }
  const tray = new CardTray(canvas, {
    onCard: (card) => {
      mission.addCard(card)
      show()
    },
    onRun: () => {
      mission.startRun()
      show()
    },
    onClear: () => {
      mission.clearCards()
      show()
    },
  })
  view.showCourse(mission.course)
  view.start((seconds) => {
    mission.advance(Math.min(seconds - lastSeconds, 0.1))
    lastSeconds = seconds
    view.showRobot(mission.findRobot())
    if (describeMission(mission) !== wasShowing) show()
  })
  let lastSeconds = 0
  show()

  return {
    describeBoard: () => describeMission(mission),
    isChallengeMet: () => mission.hasReachedStar(),
    canUndo: () => mission.canRemoveCard(),
    undo: () => {
      mission.removeLastCard()
      show()
    },
    startOver: () => {
      mission.clearCards()
      show()
    },
    startChallenge: (level) => {
      mission = new Mission(buildCourse(challenges[Math.min(level, challenges.length - 1)].drawing, size))
      view.showCourse(mission.course)
      show()
    },
    chooseTool: () => undefined,
    nameUnder: () => undefined,
  }
}

function describeMission(mission: Mission) {
  const count = mission.listCards().length
  const cards = `${count} ${count === 1 ? 'carta' : 'cartas'}`
  if (mission.hasReachedStar()) return `${cards}, o robô chegou à estrela`
  if (mission.hasBumped()) return `${cards}, o robô bateu numa pedra`
  if (mission.isRunning()) return `${cards}, o robô está a andar ${mission.findCardInProgress()}`
  return cards
}
