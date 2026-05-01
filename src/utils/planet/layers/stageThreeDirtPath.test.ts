import { Group, InstancedMesh, Mesh, MeshLambertMaterial, SphereGeometry } from 'three'
import { describe, expect, it, vi } from 'vitest'

import { TerrainLayer } from './TerrainLayer'

describe('第三阶段木板小路图层集成', () => {
  function createLayer() {
    const parentGroup = new Group()
    const grassMesh = new Mesh(
      new SphereGeometry(3.05, 16, 16),
      new MeshLambertMaterial({ color: '#6b7045' }),
    )

    return new TerrainLayer({
      parentGroup,
      grassMesh,
      planetRadius: 3,
    })
  }

  it('第 22-45 天继承第 21 天末态，第 46 天后继续走后续阶段逻辑', () => {
    const terrainLayer = createLayer()
    const woodPlankPath = (terrainLayer as any).woodPlankPath as Group
    const woodPlanks = woodPlankPath.children as Group[]
    const grassMesh = (terrainLayer as any).grassMesh as Mesh
    const getVisibleWoodPlankNames = () => woodPlanks.filter((plank) => plank.visible).map((plank) => plank.name)
    const getGrassScale = () => Number(grassMesh.scale.x.toFixed(2))

    terrainLayer.update({
      dayCount: 14,
      stageIndex: 3 as const,
      stageProgress: 0.3,
      qualityTier: 'tier-1' as const,
    })
    expect(woodPlankPath.visible).toBe(false)
    expect(getVisibleWoodPlankNames()).toEqual([])

    terrainLayer.update({
      dayCount: 15,
      stageIndex: 3 as const,
      stageProgress: 0.4,
      qualityTier: 'tier-1' as const,
    })
    expect(woodPlankPath.visible).toBe(true)
    expect(getVisibleWoodPlankNames()).toEqual(['wood-plank-4'])

    terrainLayer.update({
      dayCount: 16,
      stageIndex: 3 as const,
      stageProgress: 0.6,
      qualityTier: 'tier-1' as const,
    })
    expect(getVisibleWoodPlankNames()).toEqual(['wood-plank-2', 'wood-plank-3', 'wood-plank-4'])

    terrainLayer.update({
      dayCount: 21,
      stageIndex: 3 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    expect(getGrassScale()).toBe(0.68)
    expect(getVisibleWoodPlankNames()).toEqual([
      'wood-plank-1',
      'wood-plank-2',
      'wood-plank-3',
      'wood-plank-4',
    ])

    terrainLayer.update({
      dayCount: 22,
      stageIndex: 4 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })
    expect(getGrassScale()).toBe(0.68)
    expect(getVisibleWoodPlankNames()).toEqual([
      'wood-plank-1',
      'wood-plank-2',
      'wood-plank-3',
      'wood-plank-4',
    ])

    terrainLayer.update({
      dayCount: 45,
      stageIndex: 4 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    expect(getGrassScale()).toBe(0.68)
    expect(getVisibleWoodPlankNames()).toEqual([
      'wood-plank-1',
      'wood-plank-2',
      'wood-plank-3',
      'wood-plank-4',
    ])

    terrainLayer.update({
      dayCount: 46,
      stageIndex: 5 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    })
    expect(getGrassScale()).toBe(0.9)
    expect(getVisibleWoodPlankNames()).toEqual([
      'wood-plank-1',
      'wood-plank-2',
      'wood-plank-3',
      'wood-plank-4',
    ])
  })

  it('第二阶段不显示木板小路，deactivate 会隐藏木板小路', () => {
    const terrainLayer = createLayer()
    const woodPlankPath = (terrainLayer as any).woodPlankPath as Group
    const woodPlanks = woodPlankPath.children as Group[]

    terrainLayer.update({
      dayCount: 10,
      stageIndex: 2 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })
    expect(woodPlankPath.visible).toBe(false)
    expect(woodPlanks.filter((plank) => plank.visible)).toHaveLength(0)

    terrainLayer.update({
      dayCount: 17,
      stageIndex: 3 as const,
      stageProgress: 0.6,
      qualityTier: 'tier-1' as const,
    })
    expect(woodPlankPath.visible).toBe(true)
    expect(woodPlanks.filter((plank) => plank.visible)).toHaveLength(4)

    terrainLayer.deactivate()
    expect(woodPlankPath.visible).toBe(false)
    expect(woodPlanks.filter((plank) => plank.visible)).toHaveLength(0)
  })

  it('dispose 会移除木板与石头并释放资源', () => {
    const parentGroup = new Group()
    const grassMesh = new Mesh(
      new SphereGeometry(3.05, 16, 16),
      new MeshLambertMaterial({ color: '#6b7045' }),
    )
    const terrainLayer = new TerrainLayer({
      parentGroup,
      grassMesh,
      planetRadius: 3,
    })
    const woodPlankPath = (terrainLayer as any).woodPlankPath as Group
    const woodPlanks = woodPlankPath.children as Group[]
    const rocks = (terrainLayer as any).rocks as InstancedMesh
    const woodPlankMeshes = woodPlankPath.children.flatMap((plank) =>
      plank.children.filter((child): child is Mesh => child instanceof Mesh),
    )
    const uniqueWoodPlankGeometries = [...new Set(woodPlankMeshes.map((mesh) => mesh.geometry))]
    const uniqueWoodPlankMaterials = [
      ...new Set(
        woodPlankMeshes.map((mesh) => mesh.material).filter((material): material is MeshLambertMaterial =>
          material instanceof MeshLambertMaterial,
        ),
      ),
    ]
    const woodPlankGeometryDisposeSpies = uniqueWoodPlankGeometries.map((geometry) =>
      vi.spyOn(geometry, 'dispose'),
    )
    const woodPlankMaterialDisposeSpies = uniqueWoodPlankMaterials.map((material) =>
      vi.spyOn(material, 'dispose'),
    )
    const rocksGeometryDisposeSpy = vi.spyOn(rocks.geometry, 'dispose')

    terrainLayer.dispose()

    expect(parentGroup.children).not.toContain(woodPlankPath)
    expect(parentGroup.children).not.toContain(rocks)
    expect(woodPlanks).toHaveLength(4)
    woodPlankGeometryDisposeSpies.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1))
    woodPlankMaterialDisposeSpies.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1))
    expect(rocksGeometryDisposeSpy).toHaveBeenCalledTimes(1)
  })
})
