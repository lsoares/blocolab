import RAPIER from '@dimforge/rapier3d-compat'
import type { Facing, Piece, World } from './World.ts'

export type BallPosition = { x: number; y: number; z: number }

export function preparePhysics() {
  return RAPIER.init()
}

export class Run {
  private readonly physics: RAPIER.World
  private readonly balls: RAPIER.RigidBody[]
  private unspentSeconds = 0

  constructor(world: World) {
    const { width, depth } = world.size
    this.physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 })
    this.physics.createCollider(
      RAPIER.ColliderDesc.cuboid(width / 2, 0.5, depth / 2).setTranslation(width / 2, -0.5, depth / 2),
    )
    for (const piece of world.listPieces()) this.addPiece(piece)
    this.balls = world.listBalls().map((spot) => {
      const ball = this.physics.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic().setTranslation(spot.x + 0.5, world.measureHeightAt(spot) + 0.45, spot.z + 0.5),
      )
      this.physics.createCollider(RAPIER.ColliderDesc.ball(0.4).setRestitution(0.3).setFriction(0.6), ball)
      return ball
    })
  }

  advance(seconds: number) {
    this.unspentSeconds += seconds
    while (this.unspentSeconds >= this.physics.timestep) {
      this.physics.step()
      this.unspentSeconds -= this.physics.timestep
    }
  }

  listBallPositions(): BallPosition[] {
    return this.balls.map((ball) => ball.translation())
  }

  stop() {
    this.physics.free()
  }

  private addPiece(piece: Piece) {
    const { x, z } = piece.spot
    if (piece.kind === 'cube') return this.addColumn(x, z, piece.height)
    if (piece.low > 0) this.addColumn(x, z, piece.low)
    const corners = [
      [-0.5, piece.low, -0.5],
      [-0.5, piece.low, 0.5],
      [0.5, piece.low, -0.5],
      [0.5, piece.low, 0.5],
      [0.5, piece.high, -0.5],
      [0.5, piece.high, 0.5],
    ].flatMap(([cornerX, cornerY, cornerZ]) => {
      const [turnedX, turnedZ] = turnTowards(piece.facing, cornerX, cornerZ)
      return [x + 0.5 + turnedX, cornerY, z + 0.5 + turnedZ]
    })
    const slope = RAPIER.ColliderDesc.convexHull(new Float32Array(corners))
    if (slope) this.physics.createCollider(slope)
  }

  private addColumn(x: number, z: number, height: number) {
    this.physics.createCollider(
      RAPIER.ColliderDesc.cuboid(0.5, height / 2, 0.5).setTranslation(x + 0.5, height / 2, z + 0.5),
    )
  }
}

function turnTowards(facing: Facing, x: number, z: number) {
  return { east: [x, z], north: [z, -x], west: [-x, -z], south: [-z, x] }[facing]
}
