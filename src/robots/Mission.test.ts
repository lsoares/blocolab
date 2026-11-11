import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { buildCourse } from './Course.ts'
import { Mission } from './Mission.ts'

const size = { columns: 8, rows: 6 }

describe('A mission', () => {
  test('the robot reaches the star only after walking all the way', () => {
    const mission = new Mission(buildCourse(['>..*'], size))
    for (const _ of [1, 2, 3]) mission.addCard('forward')
    mission.startRun()

    mission.advance(1.0)

    assert.equal(mission.hasReachedStar(), false)
  })

  test('the robot has reached the star once the run is over', () => {
    const mission = new Mission(buildCourse(['>..*'], size))
    for (const _ of [1, 2, 3]) mission.addCard('forward')
    mission.startRun()

    mission.advance(10)

    assert.equal(mission.hasReachedStar(), true)
  })

  test('changing the cards sends the robot back to the start', () => {
    const mission = new Mission(buildCourse(['>..*'], size))
    mission.addCard('forward')
    mission.startRun()
    mission.advance(10)

    mission.addCard('forward')

    assert.equal(mission.findRobot().x, mission.course.start.spot.x + 0.5)
  })

  test('cards cannot change while the robot is running', () => {
    const mission = new Mission(buildCourse(['>..*'], size))
    mission.addCard('forward')
    mission.startRun()

    mission.addCard('turn-left')

    assert.deepEqual(mission.listCards(), ['forward'])
  })

  test('a run without cards does not start', () => {
    const mission = new Mission(buildCourse(['>..*'], size))

    mission.startRun()

    assert.equal(mission.isRunning(), false)
  })

  test('halfway through a step the robot is between two spots', () => {
    const mission = new Mission(buildCourse(['>..*'], size))
    mission.addCard('forward')
    mission.startRun()

    mission.advance(0.3)

    assert.ok(Math.abs(mission.findRobot().x - (mission.course.start.spot.x + 1)) < 1e-9)
  })
})
