import { Group, Mesh, MeshStandardMaterial, PointLight, Points, PointsMaterial } from 'three'
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

function getPointsOpacity(points: Points) {
  const material = points.material
  if (!(material instanceof PointsMaterial)) return 0
  return material.opacity
}

function getDrawCount(points: Points) {
  return points.geometry.drawRange.count
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

  it('第 75-90 天会按节点逐步叠加氛围光效', () => {
    const layer = createLayer()
    const ambientInnerRing = (layer as any).ambientInnerRing as Mesh
    const ambientOuterRing = (layer as any).ambientOuterRing as Mesh
    const ambientSparkles = (layer as any).ambientSparkles as Points
    const ambientTwinkles = (layer as any).ambientTwinkles as Points
    const ambientMotes = (layer as any).ambientMotes as Points
    const energyRing = (layer as any).energyRing as Mesh
    const cabinWindowGlow = (layer as any).cabinWindowGlow as Mesh

    updateLayer(layer, 74)
    expect(ambientInnerRing.visible).toBe(false)
    expect(ambientOuterRing.visible).toBe(false)
    expect(ambientSparkles.visible).toBe(false)
    expect(ambientTwinkles.visible).toBe(false)
    expect(ambientMotes.visible).toBe(false)

    updateLayer(layer, 75)
    const day75InnerOpacity = getOpacity(ambientInnerRing)
    const day75TwinkleOpacity = getPointsOpacity(ambientTwinkles)
    const day75TwinkleCount = getDrawCount(ambientTwinkles)
    expect(ambientInnerRing.visible).toBe(true)
    expect(ambientOuterRing.visible).toBe(false)
    expect(ambientSparkles.visible).toBe(false)
    expect(ambientTwinkles.visible).toBe(true)
    expect(ambientMotes.visible).toBe(false)
    expect(day75InnerOpacity).toBeGreaterThan(0)
    expect(day75TwinkleOpacity).toBeGreaterThan(0)
    expect(day75TwinkleCount).toBeGreaterThan(0)
    expect(energyRing.visible).toBe(true)
    expect(cabinWindowGlow.visible).toBe(true)

    updateLayer(layer, 79)
    const day79InnerOpacity = getOpacity(ambientInnerRing)
    const day79OuterOpacity = getOpacity(ambientOuterRing)
    const day79TwinkleOpacity = getPointsOpacity(ambientTwinkles)
    const day79TwinkleCount = getDrawCount(ambientTwinkles)
    const day79MoteOpacity = getPointsOpacity(ambientMotes)
    const day79MoteCount = getDrawCount(ambientMotes)
    expect(day79InnerOpacity).toBeGreaterThan(day75InnerOpacity)
    expect(ambientOuterRing.visible).toBe(true)
    expect(day79OuterOpacity).toBeGreaterThan(0)
    expect(ambientSparkles.visible).toBe(false)
    expect(day79TwinkleOpacity).toBeGreaterThan(day75TwinkleOpacity)
    expect(day79TwinkleCount).toBeGreaterThan(day75TwinkleCount)
    expect(ambientMotes.visible).toBe(true)
    expect(day79MoteOpacity).toBeGreaterThan(0)
    expect(day79MoteCount).toBeGreaterThan(0)

    updateLayer(layer, 83)
    const day83SparklesOpacity = getPointsOpacity(ambientSparkles)
    const day83SparklesCount = getDrawCount(ambientSparkles)
    expect(ambientSparkles.visible).toBe(true)
    expect(day83SparklesOpacity).toBeGreaterThan(0)
    expect(day83SparklesCount).toBeGreaterThan(0)

    updateLayer(layer, 87)
    const day87InnerOpacity = getOpacity(ambientInnerRing)
    const day87OuterOpacity = getOpacity(ambientOuterRing)
    const day87SparklesOpacity = getPointsOpacity(ambientSparkles)
    const day87TwinkleOpacity = getPointsOpacity(ambientTwinkles)
    const day87MoteOpacity = getPointsOpacity(ambientMotes)
    const day87SparklesCount = getDrawCount(ambientSparkles)

    updateLayer(layer, 90)
    const day90InnerOpacity = getOpacity(ambientInnerRing)
    const day90OuterOpacity = getOpacity(ambientOuterRing)
    const day90SparklesOpacity = getPointsOpacity(ambientSparkles)
    const day90SparklesCount = getDrawCount(ambientSparkles)
    const day90TwinkleOpacity = getPointsOpacity(ambientTwinkles)
    const day90TwinkleCount = getDrawCount(ambientTwinkles)
    const day90MoteOpacity = getPointsOpacity(ambientMotes)
    const day90MoteCount = getDrawCount(ambientMotes)

    expect(day90InnerOpacity).toBeGreaterThan(day87InnerOpacity)
    expect(day90OuterOpacity).toBeGreaterThan(day87OuterOpacity)
    expect(day90SparklesOpacity).toBeGreaterThan(day87SparklesOpacity)
    expect(day90TwinkleOpacity).toBeGreaterThan(day87TwinkleOpacity)
    expect(day90MoteOpacity).toBeGreaterThan(day87MoteOpacity)
    expect(day90SparklesCount).toBeGreaterThan(day87SparklesCount)
    expect(day90SparklesOpacity).toBeGreaterThan(0.4)
    expect(day90SparklesCount).toBeGreaterThan(45)
    expect(day90TwinkleOpacity).toBeGreaterThan(0.5)
    expect(day90TwinkleCount).toBeGreaterThan(70)
    expect(day90MoteOpacity).toBeGreaterThan(0.3)
    expect(day90MoteCount).toBeGreaterThan(40)
  })

  it('第 91 天会瞬时点亮完整祝贺光环', () => {
    const layer = createLayer()
    const celebrationHalo = (layer as any).celebrationHalo as Mesh
    const celebrationHaloSoft = (layer as any).celebrationHaloSoft as Mesh

    updateLayer(layer, 90)
    expect(celebrationHalo.visible).toBe(false)
    expect(celebrationHaloSoft.visible).toBe(false)
    expect(getOpacity(celebrationHalo)).toBe(0)
    expect(getOpacity(celebrationHaloSoft)).toBe(0)

    updateLayer(layer, 91)
    const haloOpacity = getOpacity(celebrationHalo)
    const haloSoftOpacity = getOpacity(celebrationHaloSoft)
    expect(celebrationHalo.visible).toBe(true)
    expect(celebrationHaloSoft.visible).toBe(true)
    expect(haloOpacity).toBeGreaterThan(0.55)
    expect(haloSoftOpacity).toBeGreaterThan(0.28)
    expect(celebrationHalo.position.y).toBeGreaterThan(0.9)
    expect(celebrationHaloSoft.position.y).toBeGreaterThan(celebrationHalo.position.y)
  })

  it('低画质下会降低细闪和光粒的数量与透明度', () => {
    const layer = createLayer()
    const ambientTwinkles = (layer as any).ambientTwinkles as Points
    const ambientMotes = (layer as any).ambientMotes as Points

    layer.update({
      ...buildStageSnapshot(90),
      qualityTier: 'tier-0',
    })
    const tier0TwinkleOpacity = getPointsOpacity(ambientTwinkles)
    const tier0TwinkleCount = getDrawCount(ambientTwinkles)
    const tier0MoteOpacity = getPointsOpacity(ambientMotes)
    const tier0MoteCount = getDrawCount(ambientMotes)

    layer.update({
      ...buildStageSnapshot(90),
      qualityTier: 'tier-1',
    })
    const tier1TwinkleOpacity = getPointsOpacity(ambientTwinkles)
    const tier1TwinkleCount = getDrawCount(ambientTwinkles)
    const tier1MoteOpacity = getPointsOpacity(ambientMotes)
    const tier1MoteCount = getDrawCount(ambientMotes)

    expect(tier0TwinkleOpacity).toBeLessThan(tier1TwinkleOpacity)
    expect(tier0TwinkleCount).toBeLessThan(tier1TwinkleCount)
    expect(tier0MoteOpacity).toBeLessThan(tier1MoteOpacity)
    expect(tier0MoteCount).toBeLessThan(tier1MoteCount)
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
