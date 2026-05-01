import { Box3, Group, Mesh, MeshLambertMaterial, MeshStandardMaterial, Vector3 } from 'three'
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

function getCabinModelHeight(hutFull: Group) {
  const cabinModel = hutFull.children[0]
  expect(cabinModel).toBeTruthy()
  const detachedModel = cabinModel!.clone(true)
  const bounds = new Box3().setFromObject(detachedModel)
  const size = bounds.getSize(new Vector3())
  return size.y
}

function isCabinWindowMaterial(
  material: unknown,
): material is MeshLambertMaterial | MeshStandardMaterial {
  return material instanceof MeshLambertMaterial || material instanceof MeshStandardMaterial
}

function getCabinWindowMaterials(hutFull: Group) {
  const result: Array<MeshLambertMaterial | MeshStandardMaterial> = []

  hutFull.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const material = child.material
    if (Array.isArray(material)) return
    if (!isCabinWindowMaterial(material)) return
    if (material.emissive.getHex() === 0x000000) return
    result.push(material)
  })

  return result
}

describe('结构图层中的第三阶段帐篷', () => {
  it('房屋实例在第四阶段会挂载暖光窗材，而不是只修改全局材质', async () => {
    const layer = createLayer()
    const hutFull = (layer as any).hutFull as Group
    await layer.preload()

    layer.update({
      dayCount: 22,
      stageIndex: 4 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })

    const windowMaterials = getCabinWindowMaterials(hutFull)

    expect(hutFull.children.length).toBeGreaterThan(0)
    expect(windowMaterials.length).toBeGreaterThan(0)
    expect(windowMaterials.every((material) => material.emissive.getHex() !== 0x000000)).toBe(true)
  })

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

  it('帐篷会保留到第 21 天，并在第 22 天起由房屋替换', () => {
    const layer = createLayer()
    const tent = (layer as any).tent as Group
    const hutFull = (layer as any).hutFull as Group

    layer.update({
      dayCount: 21,
      stageIndex: 3 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    expect(tent.visible).toBe(true)
    expect(hutFull.visible).toBe(false)

    const tentAnchorPositionSnapshot = tent.position.clone()
    const tentSurfaceNormal = tentAnchorPositionSnapshot.clone().normalize()
    const tentFacing = new Vector3(0, 0, 1)
      .applyQuaternion(tent.quaternion)
      .projectOnPlane(tentSurfaceNormal)
      .normalize()

    layer.update({
      dayCount: 22,
      stageIndex: 4 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })

    expect(tent.visible).toBe(false)
    expect(hutFull.visible).toBe(true)
    expect(hutFull.scale.x).toBeCloseTo(0.72, 5)

    const hutPosition = hutFull.position.clone()
    const tentAnchorNormal = tentAnchorPositionSnapshot.clone().normalize()
    const hutNormal = hutPosition.clone().normalize()
    const hutFacing = new Vector3(0, 0, 1).applyQuaternion(hutFull.quaternion).projectOnPlane(hutNormal).normalize()

    expect(hutPosition.distanceTo(tentAnchorPositionSnapshot)).toBeLessThan(0.005)
    expect(hutNormal.angleTo(tentAnchorNormal)).toBeLessThan(1e-6)
    expect(hutFull.scale.x).toBeCloseTo(0.72, 5)
    expect(Math.abs(hutPosition.length() - tentAnchorPositionSnapshot.length())).toBeLessThan(0.001)
    expect(hutFacing.angleTo(tentFacing)).toBeGreaterThan(0.08)
    expect(hutFacing.angleTo(tentFacing)).toBeLessThan(0.2)
  })

  it('第 19-21 天会在树外侧逐日累加栅栏，并在 22-45 天保留房屋与栅栏', async () => {
    const layer = createLayer()
    const woodenFences = (layer as any).woodenFences as Group[]
    const hutFull = (layer as any).hutFull as Group
    const windmill = (layer as any).windmill as Group
    await layer.preload()

    expect(hutFull.children.length).toBeGreaterThan(0)

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
    expect(hutFull.visible).toBe(true)
    expect(hutFull.scale.x).toBeCloseTo(0.72, 5)
    expect(windmill.visible).toBe(false)

    layer.update({
      dayCount: 28,
      stageIndex: 4 as const,
      stageProgress: 0.3,
      qualityTier: 'tier-1' as const,
    })
    expect(woodenFences.filter((item) => item.visible)).toHaveLength(4)
    expect(hutFull.visible).toBe(true)
    expect(hutFull.scale.x).toBeCloseTo(1, 5)
    expect(windmill.visible).toBe(false)

    layer.update({
      dayCount: 45,
      stageIndex: 4 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    expect(woodenFences.filter((item) => item.visible)).toHaveLength(4)
    expect(hutFull.visible).toBe(true)
    expect(hutFull.scale.x).toBeCloseTo(1, 5)
    expect(windmill.visible).toBe(false)
  })

  it('第 22-28 天会逐日更新房屋缩放、离地高度和偏航', async () => {
    const layer = createLayer()
    const hutFull = (layer as any).hutFull as Group
    await layer.preload()

    layer.update({
      dayCount: 22,
      stageIndex: 4 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })
    const day22Position = hutFull.position.clone()
    const day22SurfaceNormal = day22Position.clone().normalize()
    const day22Facing = new Vector3(0, 0, 1)
      .applyQuaternion(hutFull.quaternion)
      .projectOnPlane(day22SurfaceNormal)
      .normalize()
    const day22Radius = day22Position.length()
    const day22CabinModelHeight = getCabinModelHeight(hutFull)
    const day22WindowMaterials = getCabinWindowMaterials(hutFull)
    const day22EmissiveIntensity = Math.max(
      ...day22WindowMaterials.map((item) => item.emissiveIntensity),
      0,
    )

    layer.update({
      dayCount: 28,
      stageIndex: 4 as const,
      stageProgress: 0.3,
      qualityTier: 'tier-1' as const,
    })
    const day28Position = hutFull.position.clone()
    const day28SurfaceNormal = day28Position.clone().normalize()
    const day28Facing = new Vector3(0, 0, 1)
      .applyQuaternion(hutFull.quaternion)
      .projectOnPlane(day28SurfaceNormal)
      .normalize()
    const day28Radius = day28Position.length()
    const day28CabinModelHeight = getCabinModelHeight(hutFull)
    const day28WindowMaterials = getCabinWindowMaterials(hutFull)
    const day28EmissiveIntensity = Math.max(
      ...day28WindowMaterials.map((item) => item.emissiveIntensity),
      0,
    )
    const movementDelta = day28Position.clone().sub(day22Position)
    const radialDelta = day22SurfaceNormal.clone().multiplyScalar(movementDelta.dot(day22SurfaceNormal))
    const tangentialDelta = movementDelta.clone().sub(radialDelta)

    expect(hutFull.children.length).toBeGreaterThan(0)
    expect(day22WindowMaterials.length).toBeGreaterThan(0)
    expect(day22EmissiveIntensity).toBeGreaterThan(0)
    expect(day28WindowMaterials.length).toBeGreaterThan(0)
    expect(day28EmissiveIntensity).toBeGreaterThan(day22EmissiveIntensity)
    expect(day22Position.distanceTo(day28Position)).toBeLessThan(0.005)
    expect(day22SurfaceNormal.angleTo(day28SurfaceNormal)).toBeLessThan(0.001)
    expect(day28Radius).toBeLessThan(day22Radius)
    expect(tangentialDelta.length()).toBeLessThan(0.001)
    expect(day22CabinModelHeight).toBeCloseTo(1.5, 2)
    expect(day28CabinModelHeight).toBeCloseTo(1.5, 2)
    expect(day22Facing.angleTo(day28Facing)).toBeGreaterThan(0.05)
    expect(hutFull.scale.x).toBeCloseTo(1, 5)

    layer.update({
      dayCount: 45,
      stageIndex: 4 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    const day45WindowMaterials = getCabinWindowMaterials(hutFull)
    const day45EmissiveIntensity = Math.max(
      ...day45WindowMaterials.map((item) => item.emissiveIntensity),
      0,
    )

    expect(day45WindowMaterials.length).toBeGreaterThan(0)
    expect(day45EmissiveIntensity).toBeCloseTo(day28EmissiveIntensity, 5)
  })

  it('第 46 天起恢复后续结构展示逻辑', async () => {
    const layer = createLayer()
    const hutFull = (layer as any).hutFull as Group
    const windmill = (layer as any).windmill as Group
    const bench = (layer as any).bench as Group
    const swing = (layer as any).swing as Group
    await layer.preload()

    expect(hutFull.children.length).toBeGreaterThan(0)

    layer.update({
      dayCount: 45,
      stageIndex: 4 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    const day45WindowMaterials = getCabinWindowMaterials(hutFull)
    const day45EmissiveIntensity = Math.max(
      ...day45WindowMaterials.map((item) => item.emissiveIntensity),
      0,
    )

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
    expect(getCabinWindowMaterials(hutFull).length).toBeGreaterThan(0)
    expect(
      Math.max(...getCabinWindowMaterials(hutFull).map((item) => item.emissiveIntensity), 0),
    ).toBeCloseTo(day45EmissiveIntensity, 5)
  })
})
