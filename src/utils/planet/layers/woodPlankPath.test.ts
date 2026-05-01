import { Group, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { DIRT_PATH_CENTER, getDirtPathDirectionAt } from './dirtPath'
import {
  createWoodPlankPathGroup,
  getWoodPlankSurfaceNormal,
  getWoodPlankPlacementProgress,
  getWoodPlankPathRevealState,
  isGrassPatchBlockedByWoodPlankPath,
} from './woodPlankPath'

function getPerpendicularRouteDirection(progress: number) {
  return getDirtPathDirectionAt(progress)
    .clone()
    .applyAxisAngle(DIRT_PATH_CENTER.clone().normalize(), Math.PI / 2)
    .normalize()
}

function getNearbyGrassNormal(index: number, offsetAngle: number) {
  return getWoodPlankSurfaceNormal(index)
    .clone()
    .applyAxisAngle(DIRT_PATH_CENTER.clone().normalize(), offsetAngle)
    .normalize()
}

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

  it('草簇只会被当天已显示木板的占地范围阻挡', () => {
    expect(isGrassPatchBlockedByWoodPlankPath(getWoodPlankSurfaceNormal(0), 15)).toBe(false)
    expect(isGrassPatchBlockedByWoodPlankPath(getWoodPlankSurfaceNormal(3), 15)).toBe(true)

    expect(isGrassPatchBlockedByWoodPlankPath(getWoodPlankSurfaceNormal(1), 16)).toBe(true)
    expect(isGrassPatchBlockedByWoodPlankPath(getWoodPlankSurfaceNormal(0), 16)).toBe(false)

    expect(isGrassPatchBlockedByWoodPlankPath(getWoodPlankSurfaceNormal(0), 17)).toBe(true)
    expect(isGrassPatchBlockedByWoodPlankPath(new Vector3().setFromSphericalCoords(1, 1.2, 4.8), 17)).toBe(
      false,
    )
  })

  it('木板边缘附近的草簇也会被清掉，避免木板被草遮住', () => {
    expect(isGrassPatchBlockedByWoodPlankPath(getNearbyGrassNormal(3, 0.095), 15)).toBe(true)
    expect(isGrassPatchBlockedByWoodPlankPath(new Vector3().setFromSphericalCoords(1, 1.2, 4.8), 15)).toBe(
      false,
    )
  })
})

describe('第三阶段木板小路网格', () => {
  it('会生成 4 块贴地木板并沿路径分布', () => {
    const group = createWoodPlankPathGroup(3)

    expect(group.children).toHaveLength(4)
    expect(group.children.every((plank) => plank.visible === false)).toBe(true)
  })

  it('木板会贴近旋转后的垂直路径方向摆放，而不是偏到远处', () => {
    const group = createWoodPlankPathGroup(3)
    const firstPlank = group.children[0] as Group
    const firstPathNormal = getPerpendicularRouteDirection(getWoodPlankPlacementProgress(0))
    const firstPlankNormal = firstPlank.position.clone().normalize()
    const lastPlank = group.children[3] as Group
    const lastPathNormal = getPerpendicularRouteDirection(getWoodPlankPlacementProgress(3))
    const lastPlankNormal = lastPlank.position.clone().normalize()

    expect(firstPlankNormal.angleTo(firstPathNormal)).toBeLessThan(0.14)
    expect(lastPlankNormal.angleTo(lastPathNormal)).toBeLessThan(0.14)
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

  it('木板模型朝向会改为与路径切线近似垂直的摆放方向', () => {
    const group = createWoodPlankPathGroup(3)
    const localFacingAxis = new Vector3(0, 0, 1)

    group.children.forEach((child, index) => {
      const plank = child as Group
      const progress = getWoodPlankPlacementProgress(index)
      const prevPoint = getDirtPathDirectionAt(Math.max(0, progress - 0.01))
      const nextPoint = getDirtPathDirectionAt(Math.min(1, progress + 0.01))
      const pathTangent = nextPoint
        .clone()
        .sub(prevPoint)
        .projectOnPlane(plank.position.clone().normalize())
        .normalize()
      const plankFacingDirection = localFacingAxis.clone().applyQuaternion(plank.quaternion).normalize()

      expect(Math.abs(plankFacingDirection.dot(pathTangent))).toBeLessThan(0.45)
    })
  })

  it('木板整体排布路径会整体贴近新的垂直路线', () => {
    const group = createWoodPlankPathGroup(3)

    group.children.forEach((child, index) => {
      const plank = child as Group
      const progress = getWoodPlankPlacementProgress(index)
      const rotatedPathDirection = getPerpendicularRouteDirection(progress)
      const plankNormal = plank.position.clone().normalize()

      expect(plankNormal.angleTo(rotatedPathDirection)).toBeLessThan(0.14)
    })
  })
})
