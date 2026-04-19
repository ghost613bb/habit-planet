import { Group, Mesh, MeshLambertMaterial, SphereGeometry, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { getPlanetGrassOverlayState, resetPlanetGrassOverlay } from '../assets/Materials'
import {
  getPlacementTransform,
} from '../math/PlanetMath'
import { TerrainLayer } from './TerrainLayer'
import { VegetationLayer } from './VegetationLayer'

describe('阶段 1 贴地与遮挡', () => {
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
})
