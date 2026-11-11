import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { advanceRoadCar, type RoadCar } from './RoadCar.ts'

describe('A car on the road of a barrier', () => {
  test('a car drives across the crossing while the gates are open', () => {
    const car: RoadCar = { progress: -0.62, pause: 0 }

    const later = advanceRoadCar(car, 1, false)

    assert.ok(later.progress > -0.1)
  })

  test('a car waits before the closed gates', () => {
    const car: RoadCar = { progress: -0.62, pause: 0 }

    const later = advanceRoadCar(car, 5, true)

    assert.ok(Math.abs(later.progress - -0.53) < 0.001)
  })

  test('a car already beyond the gates keeps going when they close', () => {
    const car: RoadCar = { progress: -0.2, pause: 0 }

    const later = advanceRoadCar(car, 0.5, true)

    assert.ok(later.progress > 0)
  })

  test('a waiting car goes on when the gates open', () => {
    const car: RoadCar = advanceRoadCar({ progress: -0.62, pause: 0 }, 5, true)

    const later = advanceRoadCar(car, 1, false)

    assert.ok(later.progress > -0.2)
  })

  test('a car that has crossed rests out of sight for a while', () => {
    const car: RoadCar = { progress: 0.62, pause: 0 }

    const later = advanceRoadCar(car, 1, false)

    assert.ok(later.pause > 0)
  })

  test('a car that rested comes back to the start of the road', () => {
    const car: RoadCar = { progress: 0.66, pause: 0.5 }

    const later = advanceRoadCar(car, 1, false)

    assert.deepEqual(later, { progress: -0.62, pause: 0 })
  })

  test('a car that is resting does not move', () => {
    const car: RoadCar = { progress: 0.66, pause: 2 }

    const later = advanceRoadCar(car, 1, false)

    assert.equal(later.progress, 0.66)
  })
})
