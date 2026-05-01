import { Group, Mesh, MeshStandardMaterial, PointLight } from 'three'
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

function getOpacity(mesh: Mesh) {
  const material = mesh.material
  if (Array.isArray(material)) return 0
  if (!(material instanceof MeshStandardMaterial)) return 0
  return material.opacity
}

describe('FxLayer', () => {
  it('第 22-45 天只保留篝火特效', () => {
    const layer = createLayer()
    const campfireLight = (layer as any).campfireLight as PointLight
    const campfireGlow = (layer as any).campfireGlow as Mesh
    const orbitRing = (layer as any).orbitRing as Mesh
    const orbitRingOuter = (layer as any).orbitRingOuter as Mesh
    const windowGlow = (layer as any).windowGlow as Mesh
    const cabinWindowGlow = (layer as any).cabinWindowGlow as Mesh
    const cabinAuraGlow = (layer as any).cabinAuraGlow as Mesh

    updateLayer(layer, 22)
    expect(campfireLight.visible).toBe(true)
    expect(campfireGlow.visible).toBe(true)
    expect(windowGlow.visible).toBe(false)
    expect(orbitRing.visible).toBe(false)
    expect(orbitRingOuter.visible).toBe(false)
    expect(cabinWindowGlow.visible).toBe(true)
    expect(cabinAuraGlow.visible).toBe(true)
    const day22WindowOpacity = getOpacity(cabinWindowGlow)
    const day22AuraOpacity = getOpacity(cabinAuraGlow)

    updateLayer(layer, 28)
    const day28WindowOpacity = getOpacity(cabinWindowGlow)
    const day28AuraOpacity = getOpacity(cabinAuraGlow)
    expect(day28WindowOpacity).toBeGreaterThan(day22WindowOpacity)
    expect(day28AuraOpacity).toBeGreaterThan(day22AuraOpacity)

    updateLayer(layer, 45)
    expect(campfireLight.visible).toBe(true)
    expect(campfireGlow.visible).toBe(true)
    expect(windowGlow.visible).toBe(false)
    expect(orbitRing.visible).toBe(false)
    expect(orbitRingOuter.visible).toBe(false)
    expect(getOpacity(cabinWindowGlow)).toBe(day28WindowOpacity)
    expect(getOpacity(cabinAuraGlow)).toBe(day28AuraOpacity)
  })

  it('第 46 天起恢复窗光与光环，并保留房屋 glow', () => {
    const layer = createLayer()
    const orbitRing = (layer as any).orbitRing as Mesh
    const orbitRingOuter = (layer as any).orbitRingOuter as Mesh
    const windowGlow = (layer as any).windowGlow as Mesh
    const cabinWindowGlow = (layer as any).cabinWindowGlow as Mesh
    const cabinAuraGlow = (layer as any).cabinAuraGlow as Mesh

    updateLayer(layer, 46)
    expect(windowGlow.visible).toBe(true)
    expect(orbitRing.visible).toBe(true)
    expect(orbitRingOuter.visible).toBe(true)
    expect(cabinWindowGlow.visible).toBe(true)
    expect(cabinAuraGlow.visible).toBe(true)
  })

  it('第 21 天仍处于无窗光无光环的前一阶段', () => {
    const layer = createLayer()
    const campfireLight = (layer as any).campfireLight as PointLight
    const orbitRing = (layer as any).orbitRing as Mesh
    const orbitRingOuter = (layer as any).orbitRingOuter as Mesh
    const windowGlow = (layer as any).windowGlow as Mesh
    const cabinWindowGlow = (layer as any).cabinWindowGlow as Mesh
    const cabinAuraGlow = (layer as any).cabinAuraGlow as Mesh

    updateLayer(layer, 21)
    expect(campfireLight.visible).toBe(true)
    expect(windowGlow.visible).toBe(false)
    expect(orbitRing.visible).toBe(false)
    expect(orbitRingOuter.visible).toBe(false)
    expect(cabinWindowGlow.visible).toBe(false)
    expect(cabinAuraGlow.visible).toBe(false)
  })
})
