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

  it('第 19-21 天会在树外侧逐日累加栅栏，并在 22-45 天保留第 21 天末态', () => {
    const layer = createLayer()
    const woodenFences = (layer as any).woodenFences as Group[]
    const hutFull = (layer as any).hutFull as Group
    const windmill = (layer as any).windmill as Group

    layer.update({
      dayCount: 18,
      stageIndex: 3 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    expect(woodenFences.filter((item) => item.visible)).toHaveLength(0)

    layer.update({
      dayCount: 19,
      stageIndex: 3 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    expect(woodenFences.filter((item) => item.visible)).toHaveLength(1)

    layer.update({
      dayCount: 20,
      stageIndex: 3 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    expect(woodenFences.filter((item) => item.visible)).toHaveLength(2)

    layer.update({
      dayCount: 21,
      stageIndex: 3 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    expect(woodenFences.filter((item) => item.visible)).toHaveLength(4)

    layer.update({
      dayCount: 22,
      stageIndex: 4 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })
    expect(woodenFences.filter((item) => item.visible)).toHaveLength(4)
    expect(hutFull.visible).toBe(false)
    expect(windmill.visible).toBe(false)

    layer.update({
      dayCount: 45,
      stageIndex: 4 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    expect(woodenFences.filter((item) => item.visible)).toHaveLength(4)
    expect(hutFull.visible).toBe(false)
    expect(windmill.visible).toBe(false)
  })

  it('第 46 天起恢复后续结构展示逻辑', () => {
    const layer = createLayer()
    const hutFull = (layer as any).hutFull as Group
    const windmill = (layer as any).windmill as Group
    const bench = (layer as any).bench as Group
    const swing = (layer as any).swing as Group

    layer.update({
      dayCount: 46,
      stageIndex: 5 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })

    expect(hutFull.visible).toBe(true)
    expect(windmill.visible).toBe(true)
    expect(bench.visible).toBe(true)
    expect(swing.visible).toBe(true)
  })
})
