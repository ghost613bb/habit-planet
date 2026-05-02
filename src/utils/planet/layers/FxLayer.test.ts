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

function getOuterRadius(mesh: Mesh) {
  const geometry = mesh.geometry as Mesh['geometry'] & {
    parameters?: { outerRadius?: number }
  }
  return geometry.parameters?.outerRadius ?? 0
}

describe('FxLayer', () => {
  it('第 22-40 天保持旧特效状态，不显示游离黄圈', () => {
    const layer = createLayer()
    const campfireLight = (layer as any).campfireLight as PointLight
    const campfireGlow = (layer as any).campfireGlow as Mesh
    const orbitRing = (layer as any).orbitRing as Mesh
    const orbitRingOuter = (layer as any).orbitRingOuter as Mesh
    const energyRing = (layer as any).energyRing as Mesh
    const cabinWindowGlow = (layer as any).cabinWindowGlow as Mesh

    updateLayer(layer, 22)
    expect(campfireLight.visible).toBe(true)
    expect(campfireGlow.visible).toBe(true)
    expect(orbitRing.visible).toBe(false)
    expect(orbitRingOuter.visible).toBe(false)
    expect(energyRing.visible).toBe(false)
    expect(cabinWindowGlow.visible).toBe(false)
    const day22WindowOpacity = getOpacity(cabinWindowGlow)
    expect(day22WindowOpacity).toBe(0)

    updateLayer(layer, 28)
    const day28WindowOpacity = getOpacity(cabinWindowGlow)
    expect(day28WindowOpacity).toBe(0)

    updateLayer(layer, 40)
    expect(campfireLight.visible).toBe(true)
    expect(campfireGlow.visible).toBe(true)
    expect(orbitRing.visible).toBe(false)
    expect(orbitRingOuter.visible).toBe(false)
    expect(energyRing.visible).toBe(false)
    expect(getOpacity(cabinWindowGlow)).toBe(day28WindowOpacity)
  })
  it('第 41-45 天会出现水平双层能量光圈并逐步亮起', () => {
    const layer = createLayer()
    const energyRing = (layer as any).energyRing as Mesh
    const energyRingUpper = (layer as any).energyRingUpper as Mesh
    const orbitRing = (layer as any).orbitRing as Mesh
    const orbitRingOuter = (layer as any).orbitRingOuter as Mesh

    updateLayer(layer, 40)
    expect(energyRing.visible).toBe(false)
    expect(energyRingUpper.visible).toBe(false)

    updateLayer(layer, 41)
    const day41Opacity = getOpacity(energyRing)
    const day41UpperOpacity = getOpacity(energyRingUpper)
    const day41Rotation = energyRing.rotation.z
    const day41UpperRotation = energyRingUpper.rotation.z
    const day41UpperOuterRadius = getOuterRadius(energyRingUpper)
    expect(energyRing.visible).toBe(true)
    expect(energyRingUpper.visible).toBe(true)
    expect(day41Opacity).toBeGreaterThan(0.08)
    expect(day41UpperOpacity).toBeGreaterThan(0.06)
    expect(energyRing.position.y).toBeGreaterThan(0)
    expect(energyRingUpper.position.y).toBeGreaterThan(energyRing.position.y)
    expect(day41UpperRotation).toBeCloseTo(day41Rotation, 5)
    expect(orbitRing.visible).toBe(false)
    expect(orbitRingOuter.visible).toBe(false)

    updateLayer(layer, 43)
    const day43Opacity = getOpacity(energyRing)
    const day43UpperOpacity = getOpacity(energyRingUpper)
    const day43UpperOuterRadius = getOuterRadius(energyRingUpper)
    expect(day43Opacity).toBeGreaterThan(day41Opacity)
    expect(day43UpperOpacity).toBeGreaterThan(day41UpperOpacity)
    expect(day43UpperOuterRadius).toBeGreaterThan(day41UpperOuterRadius)

    updateLayer(layer, 45)
    const day45Opacity = getOpacity(energyRing)
    const day45Rotation = energyRing.rotation.z
    const day45UpperOpacity = getOpacity(energyRingUpper)
    const day45UpperRotation = energyRingUpper.rotation.z
    const day45UpperOuterRadius = getOuterRadius(energyRingUpper)
    expect(day45Opacity).toBeGreaterThan(day43Opacity)
    expect(day45Rotation).not.toBe(day41Rotation)
    expect(day45UpperOpacity).toBeGreaterThan(day43UpperOpacity)
    expect(day45UpperRotation).not.toBe(day41UpperRotation)
    expect(day45UpperRotation).toBeCloseTo(day45Rotation, 5)
    expect(day45UpperOuterRadius).toBeGreaterThan(day43UpperOuterRadius)
  })

  it('第 46 天起继续保留第 45 天的双光圈，只显示贴窗微光', () => {
    const layer = createLayer()
    const orbitRing = (layer as any).orbitRing as Mesh
    const orbitRingOuter = (layer as any).orbitRingOuter as Mesh
    const energyRing = (layer as any).energyRing as Mesh
    const energyRingUpper = (layer as any).energyRingUpper as Mesh
    const cabinWindowGlow = (layer as any).cabinWindowGlow as Mesh

    updateLayer(layer, 46)
    expect(energyRing.visible).toBe(true)
    expect(energyRingUpper.visible).toBe(true)
    expect(orbitRing.visible).toBe(false)
    expect(orbitRingOuter.visible).toBe(false)
    expect(cabinWindowGlow.visible).toBe(true)
    expect(getOpacity(cabinWindowGlow)).toBeGreaterThan(0)
    expect(getOpacity(cabinWindowGlow)).toBeLessThan(0.12)
  })

  it('第 60 天切到木屋后，贴窗微光会跟随新模型位置调整', () => {
    const layer = createLayer()
    const cabinWindowGlow = (layer as any).cabinWindowGlow as Mesh

    updateLayer(layer, 59)
    const day59Position = cabinWindowGlow.position.clone()
    const day59Opacity = getOpacity(cabinWindowGlow)

    updateLayer(layer, 60)
    const day60Position = cabinWindowGlow.position.clone()
    const day60Opacity = getOpacity(cabinWindowGlow)

    expect(day60Position.distanceTo(day59Position)).toBeGreaterThan(0.05)
    expect(day59Opacity).toBeGreaterThan(0)
    expect(day60Opacity).toBeGreaterThan(0)
  })

  it('第 21 天仍处于无窗光无光环的前一阶段', () => {
    const layer = createLayer()
    const campfireLight = (layer as any).campfireLight as PointLight
    const orbitRing = (layer as any).orbitRing as Mesh
    const orbitRingOuter = (layer as any).orbitRingOuter as Mesh
    const energyRing = (layer as any).energyRing as Mesh
    const energyRingUpper = (layer as any).energyRingUpper as Mesh
    const cabinWindowGlow = (layer as any).cabinWindowGlow as Mesh

    updateLayer(layer, 21)
    expect(campfireLight.visible).toBe(true)
    expect(orbitRing.visible).toBe(false)
    expect(orbitRingOuter.visible).toBe(false)
    expect(energyRing.visible).toBe(false)
    expect(energyRingUpper.visible).toBe(false)
    expect(cabinWindowGlow.visible).toBe(false)
  })
})
