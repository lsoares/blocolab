export type RoadCar = { progress: number; pause: number }

export function advanceRoadCar(car: RoadCar, seconds: number, gatesClosed: boolean): RoadCar {
  if (car.pause > 0) {
    const pause = car.pause - seconds
    return pause > 0 ? { progress: car.progress, pause } : { progress: -0.62, pause: 0 }
  }
  const ahead = car.progress + speed * seconds
  const limit = gatesClosed && car.progress < -0.36 ? Math.max(car.progress, -0.53) : Number.POSITIVE_INFINITY
  const progress = Math.min(ahead, limit)
  return progress > 0.66 ? { progress: 0.66, pause: 2.5 } : { progress, pause: 0 }
}

const speed = 0.6
