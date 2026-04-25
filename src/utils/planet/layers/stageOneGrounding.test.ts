import { Group, Mesh, MeshLambertMaterial, Object3D, SphereGeometry, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { getPlanetGrassOverlayState, mats, resetPlanetGrassOverlay } from '../assets/Materials'
import { CAMPFIRE_SURFACE_PHI, CAMPFIRE_SURFACE_THETA } from './campfirePlacement'
import {
  getPlacementTransform,
} from '../math/PlanetMath'
import { TerrainLayer } from './TerrainLayer'
import { VegetationLayer } from './VegetationLayer'

describe('阶段 1 贴地与遮挡', () => {
  it('实例岩石使用统一的中性灰主色', () => {
    expect(`#${mats.rockInstanced.color.getHexString()}`).toBe('#767676')
  })

  it('统一贴地基准后，草层低于石头，石头低于幼苗', () => {
    const topNormal = new Vector3(0, 1, 0)

    const grassTransform = getPlacementTransform(topNormal, 3, 'grassLayer')
    const rockTransform = getPlacementTransform(topNormal, 3, 'rock')
    const sproutTransform = getPlacementTransform(topNormal, 3, 'sprout')

    expect(grassTransform.pos.length()).toBeLessThan(rockTransform.pos.length())
    expect(rockTransform.pos.length()).toBeLessThan(sproutTransform.pos.length())
  })

  it('第 3 天草层不再写入深度，石头与幼苗可稳定显示在其上方', () => {
    resetPlanetGrassOverlay()
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
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    const dayThreeInput = {
      dayCount: 3,
      stageIndex: 1 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    }

    terrainLayer.update(dayThreeInput)
    vegetationLayer.update(dayThreeInput)

    const grassMaterial = grassMesh.material as MeshLambertMaterial
    const rocks = (terrainLayer as any).rocks
    const sprout = (vegetationLayer as any).sprout as Group
    const grassSurfaceHeight = getPlacementTransform(new Vector3(0, 1, 0), 3, 'grassLayer').pos.length()
    const grassOverlay = getPlanetGrassOverlayState()

    expect(grassMesh.visible).toBe(false)
    expect(grassMaterial.depthWrite).toBe(false)
    expect(grassOverlay.strength).toBeGreaterThan(0)
    expect(grassOverlay.radius).toBeGreaterThan(0.9)
    expect(rocks.visible).toBe(true)
    expect(rocks.count).toBe(4)
    expect(sprout.visible).toBe(true)
    expect(sprout.renderOrder).toBe(3)
    expect(sprout.position.length()).toBeGreaterThan(grassSurfaceHeight)
  })

  it('阶段 1 的草簇只在第 2 天开始出现，并在第 3 天继续增多', () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    const dayOneInput = {
      dayCount: 1,
      stageIndex: 1 as const,
      stageProgress: 0,
      qualityTier: 'tier-1' as const,
    }
    const dayTwoInput = {
      dayCount: 2,
      stageIndex: 1 as const,
      stageProgress: 0.5,
      qualityTier: 'tier-1' as const,
    }
    const dayThreeInput = {
      dayCount: 3,
      stageIndex: 1 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    }

    const getVisibleGrassCount = () => {
      const grassPatches = (vegetationLayer as any).grassPatches as Object3D[]
      return grassPatches.filter((item) => item.visible).length
    }

    vegetationLayer.update(dayOneInput)
    expect(getVisibleGrassCount()).toBe(0)

    vegetationLayer.update(dayTwoInput)
    expect(getVisibleGrassCount()).toBe(8)

    vegetationLayer.update(dayThreeInput)
    expect(getVisibleGrassCount()).toBeGreaterThanOrEqual(15)
    expect(getVisibleGrassCount()).toBeLessThanOrEqual(16)
  })

  it('阶段 1 草簇在真实运行链路里只调用 update 也会触发加载', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    vegetationLayer.update({
      dayCount: 3,
      stageIndex: 1 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })

    await Promise.resolve()

    const grassPatches = (vegetationLayer as any).grassPatches as Group[]
    const visiblePatch = grassPatches.find((item) => item.visible)

    expect(visiblePatch).toBeDefined()
    expect(visiblePatch?.children.length ?? 0).toBeGreaterThan(0)
  })

  it('阶段 1 草簇保持低于幼苗的视觉主次关系', async () => {
    const parentGroup = new Group()
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    vegetationLayer.update({
      dayCount: 3,
      stageIndex: 1 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    })

    await vegetationLayer.preload()

    const sprout = (vegetationLayer as any).sprout as Group
    const grassPatches = (vegetationLayer as any).grassPatches as Group[]
    const visiblePatch = grassPatches.find((item) => item.visible)

    expect(visiblePatch).toBeDefined()
    expect(visiblePatch?.scale.y).toBeCloseTo(0.3)
    expect((visiblePatch?.scale.y ?? 0)).toBeGreaterThan(0.2)
    expect((visiblePatch?.scale.y ?? 0)).toBeLessThan(sprout.scale.y)
    expect(visiblePatch?.position.length() ?? 0).toBeLessThan(sprout.position.length())
  })

  it('第 6 天会比第 5 天新增树、增加草簇，并扩大顶部泛绿', () => {
    resetPlanetGrassOverlay()
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
    const vegetationLayer = new VegetationLayer({
      parentGroup,
      planetRadius: 3,
    })

    const dayFiveInput = {
      dayCount: 5,
      stageIndex: 2 as const,
      stageProgress: 0.5,
      qualityTier: 'tier-1' as const,
    }
    const daySixInput = {
      dayCount: 6,
      stageIndex: 2 as const,
      stageProgress: 1,
      qualityTier: 'tier-1' as const,
    }

    const getVisibleTreeCount = () =>
      ((vegetationLayer as any).trees as Object3D[]).filter((item) => item.visible).length
    const getVisibleBushCount = () =>
      ((vegetationLayer as any).bushes as Object3D[]).filter((item) => item.visible).length
    const getVisibleGrassPatchCount = () =>
      ((vegetationLayer as any).grassPatches as Object3D[]).filter((item) => item.visible).length
    const grassPatches = (vegetationLayer as any).grassPatches as Group[]
    const trees = (vegetationLayer as any).trees as Group[]

    terrainLayer.update(dayFiveInput)
    vegetationLayer.update(dayFiveInput)
    const dayFiveOverlay = getPlanetGrassOverlayState()
    const dayFiveTreeCount = getVisibleTreeCount()
    const dayFiveBushCount = getVisibleBushCount()
    const dayFiveGrassPatchCount = getVisibleGrassPatchCount()

    terrainLayer.update(daySixInput)
    vegetationLayer.update(daySixInput)
    const daySixOverlay = getPlanetGrassOverlayState()

    expect(dayFiveTreeCount).toBe(1)
    expect(dayFiveBushCount).toBe(5)
    expect(dayFiveGrassPatchCount).toBe(41)
    expect(getVisibleBushCount()).toBeGreaterThanOrEqual(dayFiveBushCount)
    expect(getVisibleBushCount()).toBe(5)
    expect(getVisibleTreeCount()).toBe(2)
    expect(getVisibleGrassPatchCount()).toBeGreaterThan(dayFiveGrassPatchCount)
    expect(getVisibleGrassPatchCount()).toBe(45)
    expect(daySixOverlay.radius).toBeGreaterThan(dayFiveOverlay.radius)
    expect(daySixOverlay.topStart).toBeLessThan(dayFiveOverlay.topStart)

    const campfirePos = getPlacementTransform(
      new Vector3().setFromSphericalCoords(1, CAMPFIRE_SURFACE_PHI, CAMPFIRE_SURFACE_THETA),
      3,
      'default',
    ).pos
    const extraPatchPositions = grassPatches.slice(41, 45).map((item) => item.position)
    extraPatchPositions.forEach((position) => {
      expect(position.distanceTo(trees[0]!.position)).toBeGreaterThan(1.05)
      expect(position.distanceTo(trees[1]!.position)).toBeGreaterThan(0.95)
      expect(position.distanceTo(campfirePos)).toBeGreaterThan(1)
    })
  })
})
