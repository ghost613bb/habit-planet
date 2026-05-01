import { Group, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { StructureLayer } from './StructureLayer'
import { getFirstRevealedWoodPlankIndex, getWoodPlankSurfaceNormal } from './woodPlankPath'

function createLayer() {
  const parentGroup = new Group()

  return new StructureLayer({
    parentGroup,
    planetRadius: 3,
  })
}

describe('结构图层中的第三阶段帐篷', () => {
  it('第 18 天起显示，并与首块显现木板保持分离', () => {
    const layer = createLayer()
    const tent = (layer as any).tent as Group
    const firstPlankIndex = getFirstRevealedWoodPlankIndex()
    const firstPlankNormal = getWoodPlankSurfaceNormal(firstPlankIndex)

    layer.update({
      dayCount: 17,
      stageIndex: 3 as const,
      stageProgress: 0.7,
      qualityTier: 'tier-1' as const,
    })
    expect(tent.visible).toBe(false)

    layer.update({
      dayCount: 18,
      stageIndex: 3 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    expect(tent.visible).toBe(true)

    const tentNormal = tent.position.clone().normalize()
    const plankToTentDirection = tentNormal.clone().sub(firstPlankNormal).projectOnPlane(firstPlankNormal)

    expect(plankToTentDirection.length()).toBeGreaterThan(0.01)
    expect(tentNormal.angleTo(firstPlankNormal)).toBeGreaterThan(0.08)
  })

  it('帐篷会朝向首块显现木板，保持木板路通向帐篷的视觉关系', () => {
    const layer = createLayer()
    const tent = (layer as any).tent as Group
    const firstPlankNormal = getWoodPlankSurfaceNormal(getFirstRevealedWoodPlankIndex())

    layer.update({
      dayCount: 18,
      stageIndex: 3 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })

    const tentNormal = tent.position.clone().normalize()
    const tentFacing = new Vector3(0, 0, 1).applyQuaternion(tent.quaternion).projectOnPlane(tentNormal).normalize()
    const directionToPlank = firstPlankNormal.clone().projectOnPlane(tentNormal).normalize()

    expect(tentFacing.dot(directionToPlank)).toBeGreaterThan(0.85)
  })

  it('第 18 天后进入后续阶段时仍然保留帐篷', () => {
    const layer = createLayer()
    const tent = (layer as any).tent as Group

    layer.update({
      dayCount: 22,
      stageIndex: 4 as const,
      stageProgress: 0.2,
      qualityTier: 'tier-1' as const,
    })

    expect(tent.visible).toBe(true)
  })
})
