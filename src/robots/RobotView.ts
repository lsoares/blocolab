import * as THREE from 'three'
import { BoardStage } from '../stage/BoardStage.ts'
import type { BoardSize } from '../stage/Grid.ts'
import { box, disposeChildrenOf, part, standingCylinder } from '../stage/Parts.ts'
import type { Course } from './Course.ts'
import type { RobotPlace } from './Mission.ts'

export class RobotView {
  private readonly stage: BoardStage
  private readonly course = new THREE.Group()
  private readonly robot = createRobot()
  private star?: THREE.Object3D

  constructor(canvas: HTMLCanvasElement, size: BoardSize) {
    this.stage = new BoardStage(canvas, size)
    this.stage.surface.add(this.course, this.robot)
  }

  start(onFrame: (elapsedSeconds: number) => void) {
    this.stage.start((seconds) => {
      if (this.star) this.star.rotation.y = seconds
      onFrame(seconds)
    })
  }

  showCourse({ star, rocks }: Course) {
    disposeChildrenOf(this.course)
    this.star = createStar()
    this.star.position.set(star.x + 0.5, 0.45, star.z + 0.5)
    this.course.add(
      standingCylinder(0.42, 0.05, '#f6e7a0', [star.x + 0.5, 0.03, star.z + 0.5]),
      this.star,
      ...rocks.map(({ x, z }) => createRock(x, z)),
    )
  }

  showRobot({ x, z, yaw }: RobotPlace) {
    this.robot.position.set(x, 0, z)
    this.robot.rotation.y = yaw
  }
}

function createRobot() {
  const robot = new THREE.Group()
  robot.add(
    box([0.55, 0.3, 0.42], '#4f8cff', [0, 0.3, 0]),
    box([0.3, 0.22, 0.32], '#dfe9ff', [0.04, 0.58, 0]),
    box([0.04, 0.07, 0.07], '#1d2733', [0.2, 0.6, 0.08]),
    box([0.04, 0.07, 0.07], '#1d2733', [0.2, 0.6, -0.08]),
    box([0.72, 0.14, 0.1], '#2f3a46', [0, 0.1, 0.27]),
    box([0.72, 0.14, 0.1], '#2f3a46', [0, 0.1, -0.27]),
    standingCylinder(0.015, 0.16, '#59636f', [0, 0.78, 0]),
    part(new THREE.SphereGeometry(0.045, 12, 8), '#ff7a45', [0, 0.88, 0]),
  )
  const nose = part(new THREE.ConeGeometry(0.1, 0.18, 12), '#ff7a45', [0.36, 0.3, 0])
  nose.rotation.z = -Math.PI / 2
  robot.add(nose)
  return robot
}

function createStar() {
  const outline = new THREE.Shape()
  for (let point = 0; point < 10; point++) {
    const radius = point % 2 === 0 ? 0.3 : 0.14
    const angle = (point * Math.PI) / 5
    const [x, y] = [radius * Math.sin(angle), radius * Math.cos(angle)]
    if (point === 0) outline.moveTo(x, y)
    else outline.lineTo(x, y)
  }
  const geometry = new THREE.ExtrudeGeometry(outline, { depth: 0.1, bevelEnabled: false })
  geometry.rotateX(-Math.PI / 2)
  return part(geometry, '#f2b705', [0, 0, 0])
}

function createRock(x: number, z: number) {
  const rock = part(new THREE.DodecahedronGeometry(0.4), '#8d949b', [x + 0.5, 0.3, z + 0.5])
  rock.scale.y = 0.8
  return rock
}
