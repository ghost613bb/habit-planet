import { Group, Mesh, PointLight } from 'three'
import { describe, expect, it } from 'vitest'

import { buildStageSnapshot } from '../runtime/stageRuntime'
import { FxLayer } from './FxLayer'

function createLayer() {
  const parentGroup = new Group()

  return new FxLayer({
    parentGroup,
    planetRadius: 3,
  })
}

function updateLayer(layer: FxLayer, dayCount: number) {
  layer.update({
    ...buildStageSnapshot(dayCount),
    qualityTier: 'tier-1',
  })
}

describe('FxLayer', () => {
  it('第 22-45 天只保留篝火特效', () => {
    const layer = createLayer()
    const campfireLight = (layer as any).campfireLight as PointLight
    const campfireGlow = (layer as any).campfireGlow as Mesh
    const orbitRing = (layer as any).orbitRing as Mesh
    const orbitRingOuter = (layer as any).orbitRingOuter as Mesh
    const windowGlow = (layer as any).windowGlow as Mesh

    updateLayer(layer, 22)
    expect(campfireLight.visible).toBe(true)
    expect(campfireGlow.visible).toBe(true)
    expect(windowGlow.visible).toBe(false)
    expect(orbitRing.visible).toBe(false)
    expect(orbitRingOuter.visible).toBe(false)

    updateLayer(layer, 45)
    expect(campfireLight.visible).toBe(true)
    expect(campfireGlow.visible).toBe(true)
    expect(windowGlow.visible).toBe(false)
    expect(orbitRing.visible).toBe(false)
    expect(orbitRingOuter.visible).toBe(false)
  })

  it('第 46 天起恢复窗光与光环', () => {
    const layer = createLayer()
    const orbitRing = (layer as any).orbitRing as Mesh
    const orbitRingOuter = (layer as any).orbitRingOuter as Mesh
    const windowGlow = (layer as any).windowGlow as Mesh

    updateLayer(layer, 46)
    expect(windowGlow.visible).toBe(true)
    expect(orbitRing.visible).toBe(true)
    expect(orbitRingOuter.visible).toBe(true)
  })

  it('第 21 天仍处于无窗光无光环的前一阶段', () => {
    const layer = createLayer()
    const campfireLight = (layer as any).campfireLight as PointLight
    const orbitRing = (layer as any).orbitRing as Mesh
    const orbitRingOuter = (layer as any).orbitRingOuter as Mesh
    const windowGlow = (layer as any).windowGlow as Mesh

    updateLayer(layer, 21)
    expect(campfireLight.visible).toBe(true)
    expect(windowGlow.visible).toBe(false)
    expect(orbitRing.visible).toBe(false)
    expect(orbitRingOuter.visible).toBe(false)
  })
})
