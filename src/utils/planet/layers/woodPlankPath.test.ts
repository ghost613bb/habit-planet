import { Group, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { getDirtPathDirectionAt } from './dirtPath'
import {
  createWoodPlankPathGroup,
  getWoodPlankPlacementProgress,
  getWoodPlankPathRevealState,
} from './woodPlankPath'

describe('第三阶段木板小路显现规则', () => {
  it('第 14 天前不显示，第 15/16/17 天依次显示 1/3/4 块木板', () => {
    expect(getWoodPlankPathRevealState(14)).toEqual({
      visible: false,
      visiblePlankCount: 0,
    })
    expect(getWoodPlankPathRevealState(15)).toEqual({
      visible: true,
      visiblePlankCount: 1,
    })
    expect(getWoodPlankPathRevealState(16)).toEqual({
      visible: true,
      visiblePlankCount: 3,
    })
    expect(getWoodPlankPathRevealState(17)).toEqual({
      visible: true,
      visiblePlankCount: 4,
    })
  })
})

describe('第三阶段木板小路网格', () => {
  it('会生成 4 块贴地木板并沿路径分布', () => {
    const group = createWoodPlankPathGroup(3)

    expect(group.children).toHaveLength(4)
    expect(group.children.every((plank) => plank.visible === false)).toBe(true)
  })

  it('木板会贴近路径方向附近摆放，而不是偏到远处', () => {
    const group = createWoodPlankPathGroup(3)
    const firstPlank = group.children[0] as Group
    const firstPathNormal = getDirtPathDirectionAt(getWoodPlankPlacementProgress(0))
    const firstPlankNormal = firstPlank.position.clone().normalize()
    const lastPlank = group.children[3] as Group
    const lastPathNormal = getDirtPathDirectionAt(getWoodPlankPlacementProgress(3))
    const lastPlankNormal = lastPlank.position.clone().normalize()

    expect(firstPlankNormal.angleTo(firstPathNormal)).toBeLessThan(0.12)
    expect(lastPlankNormal.angleTo(lastPathNormal)).toBeLessThan(0.12)
    expect(firstPlank.position.length()).toBeGreaterThan(2.2)
    expect(lastPlank.position.length()).toBeGreaterThan(2.2)
  })

  it('木板之间会保持逐块摆放的弯路间距', () => {
    const group = createWoodPlankPathGroup(3)
    const plankCenters = group.children.map((plank) => plank.position.clone())

    for (let index = 0; index < plankCenters.length - 1; index += 1) {
      const current = plankCenters[index] as Vector3
      const next = plankCenters[index + 1] as Vector3
      expect(current.distanceTo(next)).toBeGreaterThan(0.18)
      expect(current.distanceTo(next)).toBeLessThan(1.4)
    }
  })
})
