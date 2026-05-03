import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  Points,
  PointsMaterial,
  MeshStandardMaterial,
  PointLight,
  RingGeometry,
  Vector3,
} from 'three'

import { mats } from '../assets/Materials'
import { getStageFourCabinDayTuning } from '../config/stageFourCabinDayTuning'
import { getSurfaceTransform } from '../math/PlanetMath'
import { getCabinWindowGlowNormal } from './StructureLayer'
import {
  CAMPFIRE_GLOW_RADIUS_OFFSET,
  CAMPFIRE_LIGHT_RADIUS_OFFSET,
  CAMPFIRE_SURFACE_PHI,
  CAMPFIRE_SURFACE_THETA,
} from './campfirePlacement'
import type { LayerController, LayerUpdateInput } from './contracts'

const CAMPFIRE_ONLY_START_DAY = 22
const CAMPFIRE_ONLY_END_DAY = 45
const CABIN_GLOW_START_DAY = 22
const CABIN_GLOW_STABLE_DAY = 28
const ENERGY_RING_START_DAY = 41
const CABIN_WINDOW_GLOW_RADIUS_OFFSET = 0.24
// 控制能量光圈内半径
const ENERGY_RING_INNER_RADIUS = 3.86
// 控制能量光圈外半径
const ENERGY_RING_OUTER_RADIUS = 3.93
// 控制能量光圈基础透明度
const ENERGY_RING_BASE_OPACITY = 0.08
// 控制能量光圈增强后的额外透明度
const ENERGY_RING_OPACITY_GAIN = 0.28
// 控制能量光圈倾斜角度
const ENERGY_RING_TILT_X = Math.PI / 2
// 控制能量光圈横滚倾斜
const ENERGY_RING_TILT_Z = 0
// 控制双层光圈共同旋转速度
const ENERGY_RING_ROTATION_SPEED = 0.04
// 控制主光圈整体上移高度
const ENERGY_RING_VERTICAL_OFFSET = 0.54
// 控制上层副光圈内半径
const ENERGY_RING_UPPER_INNER_RADIUS = 3.44
// 控制上层副光圈初始外半径
const ENERGY_RING_UPPER_OUTER_RADIUS_BASE = 3.5
// 控制上层副光圈最终外半径（轻微变粗）
const ENERGY_RING_UPPER_OUTER_RADIUS_MAX = 3.58
// 控制上层副光圈基础透明度
const ENERGY_RING_UPPER_BASE_OPACITY = 0.06
// 控制上层副光圈增强后的额外透明度
const ENERGY_RING_UPPER_OPACITY_GAIN = 0.24
// 控制上层副光圈倾斜角度（与主光圈平行）
const ENERGY_RING_UPPER_TILT_X = ENERGY_RING_TILT_X
// 控制上层副光圈横滚倾斜
const ENERGY_RING_UPPER_TILT_Z = ENERGY_RING_TILT_Z
// 控制上层副光圈整体上移高度
const ENERGY_RING_UPPER_VERTICAL_OFFSET = 1.06
const AMBIENT_AURA_START_DAY = 75
const AMBIENT_AURA_SECOND_STEP_DAY = 79
const AMBIENT_AURA_THIRD_STEP_DAY = 83
const AMBIENT_AURA_FINAL_STEP_DAY = 87
const AMBIENT_AURA_FULL_DAY = 90
const AMBIENT_INNER_RING_INNER_RADIUS = 4.05
const AMBIENT_INNER_RING_OUTER_RADIUS = 4.12
const AMBIENT_OUTER_RING_INNER_RADIUS = 4.28
const AMBIENT_OUTER_RING_OUTER_RADIUS = 4.38
const AMBIENT_RING_TILT_X = Math.PI / 2
const AMBIENT_INNER_RING_VERTICAL_OFFSET = 0.72
const AMBIENT_OUTER_RING_VERTICAL_OFFSET = 0.86
const AMBIENT_SPARKLES_VERTICAL_OFFSET = 0.8
const AMBIENT_TWINKLES_VERTICAL_OFFSET = 0.94
const AMBIENT_MOTES_VERTICAL_OFFSET = 0.68
const AMBIENT_INNER_RING_ROTATION_SPEED = 0.05
const AMBIENT_OUTER_RING_ROTATION_SPEED = -0.03
const AMBIENT_SPARKLE_ROTATION_SPEED = 0.02
const AMBIENT_TWINKLE_ROTATION_SPEED = 0.065
const AMBIENT_MOTE_ROTATION_SPEED = -0.018
const AMBIENT_SPARKLES_MAX_COUNT = 48
const AMBIENT_TWINKLES_MAX_COUNT = 76
const AMBIENT_MOTES_MAX_COUNT = 42
const CELEBRATION_HALO_START_DAY = 91
const CELEBRATION_HALO_INNER_RADIUS = 4.46
const CELEBRATION_HALO_OUTER_RADIUS = 4.58
const CELEBRATION_HALO_SOFT_INNER_RADIUS = 4.62
const CELEBRATION_HALO_SOFT_OUTER_RADIUS = 4.82
const CELEBRATION_HALO_VERTICAL_OFFSET = 1.02
const CELEBRATION_HALO_SOFT_VERTICAL_OFFSET = 1.14
const CELEBRATION_HALO_ROTATION_SPEED = 0.08
const CELEBRATION_HALO_SOFT_ROTATION_SPEED = -0.05

type FxLayerOptions = {
  parentGroup: Group
  planetRadius: number
}

export class FxLayer implements LayerController {
  id = 'fx'

  private parentGroup: Group
  private planetRadius: number
  private group: Group
  private campfireLight: PointLight
  private campfireGlow: Mesh
  private orbitRing: Mesh
  private orbitRingOuter: Mesh
  private energyRing: Mesh
  private energyRingUpper: Mesh
  private cabinWindowGlow: Mesh
  private ambientInnerRing: Mesh
  private ambientOuterRing: Mesh
  private ambientSparkles: Points
  private ambientTwinkles: Points
  private ambientMotes: Points
  private celebrationHalo: Mesh
  private celebrationHaloSoft: Mesh

  constructor(options: FxLayerOptions) {
    this.parentGroup = options.parentGroup
    this.planetRadius = options.planetRadius
    this.group = new Group()
    this.parentGroup.add(this.group)

    this.campfireLight = new PointLight(0xffa64d, 0.8, 5)
    this.campfireGlow = this.createRingMesh(0.08, 0.16, 24)
    this.orbitRing = this.createRingMesh(3.95, 4.02, 64)
    this.orbitRingOuter = this.createRingMesh(4.22, 4.28, 64)
    this.energyRing = this.createRingMesh(ENERGY_RING_INNER_RADIUS, ENERGY_RING_OUTER_RADIUS, 96)
    this.energyRingUpper = this.createRingMesh(
      ENERGY_RING_UPPER_INNER_RADIUS,
      ENERGY_RING_UPPER_OUTER_RADIUS_BASE,
      96,
    )
    this.cabinWindowGlow = this.createRingMesh(0.04, 0.1, 20)
    this.ambientInnerRing = this.createRingMesh(
      AMBIENT_INNER_RING_INNER_RADIUS,
      AMBIENT_INNER_RING_OUTER_RADIUS,
      96,
    )
    this.ambientOuterRing = this.createRingMesh(
      AMBIENT_OUTER_RING_INNER_RADIUS,
      AMBIENT_OUTER_RING_OUTER_RADIUS,
      96,
    )
    this.ambientSparkles = this.createAmbientSparkles()
    this.ambientTwinkles = this.createAmbientTwinkles()
    this.ambientMotes = this.createAmbientMotes()
    this.celebrationHalo = this.createRingMesh(
      CELEBRATION_HALO_INNER_RADIUS,
      CELEBRATION_HALO_OUTER_RADIUS,
      128,
    )
    this.celebrationHaloSoft = this.createRingMesh(
      CELEBRATION_HALO_SOFT_INNER_RADIUS,
      CELEBRATION_HALO_SOFT_OUTER_RADIUS,
      128,
    )
    this.tintRing(this.energyRing, '#9fe8ff', '#55d8ff')
    this.tintRing(this.energyRingUpper, '#b8eeff', '#6ce3ff')
    this.tintRing(this.cabinWindowGlow, '#ffd38a', '#ffb14d')
    this.tintRing(this.ambientInnerRing, '#b7f2ff', '#7be8ff')
    this.tintRing(this.ambientOuterRing, '#ffe4b3', '#ffbe7d')
    this.tintRing(this.celebrationHalo, '#fff7bf', '#ffe47b')
    this.tintRing(this.celebrationHaloSoft, '#baf7ff', '#7cecff')

    this.setupTransforms()
    this.group.add(
      this.campfireLight,
      this.campfireGlow,
      this.orbitRing,
      this.orbitRingOuter,
      this.energyRing,
      this.energyRingUpper,
      this.cabinWindowGlow,
      this.ambientInnerRing,
      this.ambientOuterRing,
      this.ambientSparkles,
      this.ambientTwinkles,
      this.ambientMotes,
      this.celebrationHalo,
      this.celebrationHaloSoft,
    )
  }

  preload(): Promise<void> {
    return Promise.resolve()
  }

  activate(input: LayerUpdateInput) {
    this.update(input)
  }

  update(input: LayerUpdateInput) {
    const shouldKeepCampfireOnly =
      input.dayCount >= CAMPFIRE_ONLY_START_DAY && input.dayCount <= CAMPFIRE_ONLY_END_DAY
    const shouldShowEnergyRing = input.stageIndex >= 4 && this.shouldShowEnergyRing(input.dayCount)
    const shouldShowOrbitRing = false
    const shouldShowOrbitRingOuter = false
    const shouldShowCabinGlow =
      input.stageIndex >= 4 && input.dayCount >= CABIN_GLOW_START_DAY && !shouldKeepCampfireOnly
    const cabinGlowWarmth = shouldShowCabinGlow ? this.getCabinGlowWarmth(input.dayCount) : 0
    const ambientAuraPhase = this.getAmbientAuraPhase(input.dayCount)
    const ambientAuraProgress = this.getAmbientAuraProgress(input.dayCount)
    const ambientQualityFactor = input.qualityTier === 'tier-0' ? 0.72 : 1
    const ambientPulse = 0.88 + ambientAuraProgress * 0.18
    const celebrationQualityFactor = input.qualityTier === 'tier-0' ? 0.82 : 1
    const shouldShowCelebrationHalo = input.dayCount >= CELEBRATION_HALO_START_DAY
    const twinkleProgress = this.getProgressBetween(input.dayCount, AMBIENT_AURA_START_DAY, AMBIENT_AURA_FULL_DAY)
    const moteProgress = this.getProgressBetween(
      input.dayCount,
      AMBIENT_AURA_SECOND_STEP_DAY,
      AMBIENT_AURA_FULL_DAY,
    )
    const sparkleProgress = this.getProgressBetween(
      input.dayCount,
      AMBIENT_AURA_THIRD_STEP_DAY,
      AMBIENT_AURA_FULL_DAY,
    )
    const innerAmbientOpacity =
      ambientAuraPhase >= 1 ? (0.08 + ambientAuraProgress * 0.26) * ambientQualityFactor * ambientPulse : 0
    const outerAmbientOpacity =
      ambientAuraPhase >= 2 ? (0.06 + ambientAuraProgress * 0.2) * ambientQualityFactor * ambientPulse : 0
    const sparkleOpacity =
      ambientAuraPhase >= 3 ? (0.14 + ambientAuraProgress * 0.28) * ambientQualityFactor : 0
    const twinkleOpacity =
      ambientAuraPhase >= 1 ? (0.2 + twinkleProgress * 0.34) * ambientQualityFactor : 0
    const moteOpacity =
      ambientAuraPhase >= 2 ? (0.09 + moteProgress * 0.22) * ambientQualityFactor : 0
    const celebrationHaloOpacity = shouldShowCelebrationHalo ? 0.62 * celebrationQualityFactor : 0
    const celebrationHaloSoftOpacity = shouldShowCelebrationHalo ? 0.34 * celebrationQualityFactor : 0

    this.campfireLight.visible = input.stageIndex >= 2
    this.campfireLight.intensity = input.stageIndex >= 2 ? 0.9 + input.stageProgress * 0.9 : 0
    this.campfireGlow.visible = input.stageIndex >= 2
    this.setRingOpacity(
      this.campfireGlow,
      input.stageIndex >= 2 ? 0.28 + input.stageProgress * 0.16 : 0,
    )

    this.syncCabinWindowGlowTransform(input.dayCount)
    this.cabinWindowGlow.visible = shouldShowCabinGlow
    this.setRingOpacity(
      this.cabinWindowGlow,
      shouldShowCabinGlow ? 0.03 + cabinGlowWarmth * 0.42 : 0,
    )

    this.ambientInnerRing.visible = ambientAuraPhase >= 1
    this.ambientOuterRing.visible = ambientAuraPhase >= 2
    this.ambientSparkles.visible = ambientAuraPhase >= 3
    this.ambientTwinkles.visible = ambientAuraPhase >= 1
    this.ambientMotes.visible = ambientAuraPhase >= 2
    this.setRingOpacity(this.ambientInnerRing, innerAmbientOpacity)
    this.setRingOpacity(this.ambientOuterRing, outerAmbientOpacity)
    this.setPointsOpacity(this.ambientSparkles, sparkleOpacity)
    this.setPointsOpacity(this.ambientTwinkles, twinkleOpacity)
    this.setPointsOpacity(this.ambientMotes, moteOpacity)
    this.celebrationHalo.visible = shouldShowCelebrationHalo
    this.celebrationHaloSoft.visible = shouldShowCelebrationHalo
    this.setRingOpacity(this.celebrationHalo, celebrationHaloOpacity)
    this.setRingOpacity(this.celebrationHaloSoft, celebrationHaloSoftOpacity)
    this.setPointsDrawCount(
      this.ambientSparkles,
      this.getAmbientParticleDrawCount(
        AMBIENT_SPARKLES_MAX_COUNT,
        ambientAuraPhase >= 3 ? 0.52 + sparkleProgress * 0.48 : 0,
        input.qualityTier,
      ),
    )
    this.setPointsDrawCount(
      this.ambientTwinkles,
      this.getAmbientParticleDrawCount(
        AMBIENT_TWINKLES_MAX_COUNT,
        ambientAuraPhase >= 1 ? 0.58 + twinkleProgress * 0.42 : 0,
        input.qualityTier,
      ),
    )
    this.setPointsDrawCount(
      this.ambientMotes,
      this.getAmbientParticleDrawCount(
        AMBIENT_MOTES_MAX_COUNT,
        ambientAuraPhase >= 2 ? 0.5 + moteProgress * 0.5 : 0,
        input.qualityTier,
      ),
    )

    this.energyRing.visible = shouldShowEnergyRing
    this.setRingOpacity(
      this.energyRing,
      shouldShowEnergyRing ? this.getEnergyRingOpacity(input.dayCount, input.qualityTier) : 0,
    )
    this.energyRingUpper.visible = shouldShowEnergyRing
    this.setRingOpacity(
      this.energyRingUpper,
      shouldShowEnergyRing ? this.getUpperEnergyRingOpacity(input.dayCount, input.qualityTier) : 0,
    )
    this.syncUpperEnergyRingThickness(input.dayCount)

    this.orbitRing.visible = shouldShowOrbitRing
    this.orbitRingOuter.visible = shouldShowOrbitRingOuter
    this.setRingOpacity(
      this.orbitRing,
      shouldShowOrbitRing
        ? input.qualityTier === 'tier-0'
          ? 0.18
          : 0.3
        : 0,
    )
    this.setRingOpacity(
      this.orbitRingOuter,
      shouldShowOrbitRingOuter
        ? input.qualityTier === 'tier-0'
          ? 0.12
          : 0.24
        : 0,
    )
    this.orbitRing.rotation.z = input.dayCount * 0.02
    this.orbitRingOuter.rotation.z = -input.dayCount * 0.015
    this.energyRing.rotation.z = ENERGY_RING_TILT_Z + input.dayCount * ENERGY_RING_ROTATION_SPEED
    this.energyRingUpper.rotation.z =
      ENERGY_RING_UPPER_TILT_Z + input.dayCount * ENERGY_RING_ROTATION_SPEED
    this.ambientInnerRing.rotation.z = input.dayCount * AMBIENT_INNER_RING_ROTATION_SPEED
    this.ambientOuterRing.rotation.z = input.dayCount * AMBIENT_OUTER_RING_ROTATION_SPEED
    this.ambientSparkles.rotation.z = input.dayCount * AMBIENT_SPARKLE_ROTATION_SPEED
    this.ambientTwinkles.rotation.z = input.dayCount * AMBIENT_TWINKLE_ROTATION_SPEED
    this.ambientMotes.rotation.z = input.dayCount * AMBIENT_MOTE_ROTATION_SPEED
    this.celebrationHalo.rotation.z = input.dayCount * CELEBRATION_HALO_ROTATION_SPEED
    this.celebrationHaloSoft.rotation.z = input.dayCount * CELEBRATION_HALO_SOFT_ROTATION_SPEED
  }

  deactivate() {
    this.group.visible = false
  }

  dispose() {
    this.parentGroup.remove(this.group)
    this.ambientSparkles.geometry.dispose()
    this.ambientTwinkles.geometry.dispose()
    this.ambientMotes.geometry.dispose()
  }

  private createRingMesh(innerRadius: number, outerRadius: number, segments: number) {
    return new Mesh(new RingGeometry(innerRadius, outerRadius, segments), mats.ring.clone())
  }

  private tintRing(mesh: Mesh, color: string, emissive: string) {
    const material = mesh.material
    if (Array.isArray(material)) return
    if (!(material instanceof MeshStandardMaterial)) return
    material.color = new Color(color)
    material.emissive = new Color(emissive)
  }

  private setRingOpacity(mesh: Mesh, opacity: number) {
    const material = mesh.material
    if (Array.isArray(material)) return
    if (!(material instanceof MeshStandardMaterial)) return
    material.opacity = opacity
  }

  private setPointsOpacity(points: Points, opacity: number) {
    const material = points.material
    if (!(material instanceof PointsMaterial)) return
    material.opacity = opacity
  }

  private setPointsDrawCount(points: Points, count: number) {
    points.geometry.setDrawRange(0, count)
  }

  private getCabinGlowWarmth(dayCount: number) {
    if (dayCount <= CABIN_GLOW_STABLE_DAY) {
      return getStageFourCabinDayTuning(dayCount).windowWarmth
    }
    return getStageFourCabinDayTuning(CABIN_GLOW_STABLE_DAY).windowWarmth
  }

  private shouldShowEnergyRing(dayCount: number) {
    return dayCount >= ENERGY_RING_START_DAY
  }

  private getAmbientAuraPhase(dayCount: number) {
    if (dayCount < AMBIENT_AURA_START_DAY) return 0
    if (dayCount < AMBIENT_AURA_SECOND_STEP_DAY) return 1
    if (dayCount < AMBIENT_AURA_THIRD_STEP_DAY) return 2
    if (dayCount < AMBIENT_AURA_FINAL_STEP_DAY) return 3
    return 4
  }

  private getAmbientAuraProgress(dayCount: number) {
    if (dayCount <= AMBIENT_AURA_START_DAY) return 0
    if (dayCount >= AMBIENT_AURA_FULL_DAY) return 1
    return (
      (Math.min(dayCount, AMBIENT_AURA_FULL_DAY) - AMBIENT_AURA_START_DAY) /
      Math.max(1, AMBIENT_AURA_FULL_DAY - AMBIENT_AURA_START_DAY)
    )
  }

  private getProgressBetween(dayCount: number, startDay: number, endDay: number) {
    if (dayCount <= startDay) return 0
    if (dayCount >= endDay) return 1
    return (dayCount - startDay) / Math.max(1, endDay - startDay)
  }

  private getAmbientParticleDrawCount(
    maxCount: number,
    revealProgress: number,
    qualityTier: LayerUpdateInput['qualityTier'],
  ) {
    if (revealProgress <= 0) return 0
    const qualityFactor = qualityTier === 'tier-0' ? 0.55 : 1
    return Math.max(1, Math.round(maxCount * qualityFactor * revealProgress))
  }

  private getEnergyRingOpacity(dayCount: number, qualityTier: LayerUpdateInput['qualityTier']) {
    if (dayCount <= ENERGY_RING_START_DAY) {
      return qualityTier === 'tier-0'
        ? ENERGY_RING_BASE_OPACITY
        : ENERGY_RING_BASE_OPACITY + ENERGY_RING_OPACITY_GAIN * 0.35
    }

    const progress =
      (Math.min(dayCount, 45) - ENERGY_RING_START_DAY) /
      Math.max(1, 45 - ENERGY_RING_START_DAY)
    const qualityFactor = qualityTier === 'tier-0' ? 0.72 : 1

    return (
      ENERGY_RING_BASE_OPACITY + ENERGY_RING_OPACITY_GAIN * progress * qualityFactor
    )
  }

  private getUpperEnergyRingOpacity(dayCount: number, qualityTier: LayerUpdateInput['qualityTier']) {
    if (dayCount <= ENERGY_RING_START_DAY) {
      return qualityTier === 'tier-0'
        ? ENERGY_RING_UPPER_BASE_OPACITY
        : ENERGY_RING_UPPER_BASE_OPACITY + ENERGY_RING_UPPER_OPACITY_GAIN * 0.28
    }

    const progress =
      (Math.min(dayCount, 45) - ENERGY_RING_START_DAY) /
      Math.max(1, 45 - ENERGY_RING_START_DAY)
    const qualityFactor = qualityTier === 'tier-0' ? 0.72 : 1

    return (
      ENERGY_RING_UPPER_BASE_OPACITY +
      ENERGY_RING_UPPER_OPACITY_GAIN * progress * qualityFactor
    )
  }

  private syncUpperEnergyRingThickness(dayCount: number) {
    if (!this.shouldShowEnergyRing(dayCount)) return

    const progress =
      (Math.min(dayCount, 45) - ENERGY_RING_START_DAY) /
      Math.max(1, 45 - ENERGY_RING_START_DAY)
    const targetOuterRadius =
      ENERGY_RING_UPPER_OUTER_RADIUS_BASE +
      (ENERGY_RING_UPPER_OUTER_RADIUS_MAX - ENERGY_RING_UPPER_OUTER_RADIUS_BASE) * progress
    const refreshedGeometry = new RingGeometry(ENERGY_RING_UPPER_INNER_RADIUS, targetOuterRadius, 96)
    this.energyRingUpper.geometry.dispose()
    this.energyRingUpper.geometry = refreshedGeometry
  }

  private syncCabinWindowGlowTransform(dayCount: number) {
    const cabinWindowTransform = getSurfaceTransform(
      getCabinWindowGlowNormal(this.planetRadius, dayCount),
      this.planetRadius + CABIN_WINDOW_GLOW_RADIUS_OFFSET,
    )
    this.cabinWindowGlow.position.copy(cabinWindowTransform.pos)
    this.cabinWindowGlow.quaternion.copy(cabinWindowTransform.quaternion)
  }

  private setupTransforms() {
    const campfireTransform = getSurfaceTransform(
      new Vector3().setFromSphericalCoords(1, CAMPFIRE_SURFACE_PHI, CAMPFIRE_SURFACE_THETA),
      this.planetRadius + CAMPFIRE_LIGHT_RADIUS_OFFSET,
    )
    this.campfireLight.position.copy(campfireTransform.pos)

    const campfireGlowTransform = getSurfaceTransform(
      new Vector3().setFromSphericalCoords(1, CAMPFIRE_SURFACE_PHI, CAMPFIRE_SURFACE_THETA),
      this.planetRadius + CAMPFIRE_GLOW_RADIUS_OFFSET,
    )
    this.campfireGlow.position.copy(campfireGlowTransform.pos)
    this.campfireGlow.quaternion.copy(campfireGlowTransform.quaternion)

    this.orbitRing.rotation.x = Math.PI / 2
    this.orbitRingOuter.rotation.x = Math.PI / 2
    this.energyRing.position.set(0, ENERGY_RING_VERTICAL_OFFSET, 0)
    this.energyRing.rotation.x = ENERGY_RING_TILT_X
    this.energyRing.rotation.z = ENERGY_RING_TILT_Z
    this.energyRingUpper.position.set(0, ENERGY_RING_UPPER_VERTICAL_OFFSET, 0)
    this.energyRingUpper.rotation.x = ENERGY_RING_UPPER_TILT_X
    this.energyRingUpper.rotation.z = ENERGY_RING_UPPER_TILT_Z
    this.ambientInnerRing.position.set(0, AMBIENT_INNER_RING_VERTICAL_OFFSET, 0)
    this.ambientInnerRing.rotation.x = AMBIENT_RING_TILT_X
    this.ambientOuterRing.position.set(0, AMBIENT_OUTER_RING_VERTICAL_OFFSET, 0)
    this.ambientOuterRing.rotation.x = AMBIENT_RING_TILT_X
    this.ambientSparkles.position.set(0, AMBIENT_SPARKLES_VERTICAL_OFFSET, 0)
    this.ambientSparkles.rotation.x = AMBIENT_RING_TILT_X
    this.ambientTwinkles.position.set(0, AMBIENT_TWINKLES_VERTICAL_OFFSET, 0)
    this.ambientTwinkles.rotation.x = AMBIENT_RING_TILT_X
    this.ambientMotes.position.set(0, AMBIENT_MOTES_VERTICAL_OFFSET, 0)
    this.ambientMotes.rotation.x = AMBIENT_RING_TILT_X
    this.celebrationHalo.position.set(0, CELEBRATION_HALO_VERTICAL_OFFSET, 0)
    this.celebrationHalo.rotation.x = AMBIENT_RING_TILT_X
    this.celebrationHaloSoft.position.set(0, CELEBRATION_HALO_SOFT_VERTICAL_OFFSET, 0)
    this.celebrationHaloSoft.rotation.x = AMBIENT_RING_TILT_X
    this.syncCabinWindowGlowTransform(CABIN_GLOW_START_DAY)

    this.campfireLight.visible = false
    this.campfireGlow.visible = false
    this.orbitRing.visible = false
    this.orbitRingOuter.visible = false
    this.energyRing.visible = false
    this.energyRingUpper.visible = false
    this.cabinWindowGlow.visible = false
    this.ambientInnerRing.visible = false
    this.ambientOuterRing.visible = false
    this.ambientSparkles.visible = false
    this.ambientTwinkles.visible = false
    this.ambientMotes.visible = false
    this.celebrationHalo.visible = false
    this.celebrationHaloSoft.visible = false
  }

  private createAmbientSparkles() {
    return this.createPointCloud({
      count: AMBIENT_SPARKLES_MAX_COUNT,
      baseRadius: 4.2,
      radiusStep: 0.08,
      verticalStep: 0.018,
      color: 0xc6fbff,
      size: 0.075,
    })
  }

  private createAmbientTwinkles() {
    return this.createPointCloud({
      count: AMBIENT_TWINKLES_MAX_COUNT,
      baseRadius: 4.34,
      radiusStep: 0.06,
      verticalStep: 0.012,
      color: 0xfffde8,
      size: 0.05,
    })
  }

  private createAmbientMotes() {
    return this.createPointCloud({
      count: AMBIENT_MOTES_MAX_COUNT,
      baseRadius: 4.08,
      radiusStep: 0.11,
      verticalStep: 0.026,
      color: 0xc8f6ff,
      size: 0.1,
    })
  }

  private createPointCloud(options: {
    count: number
    baseRadius: number
    radiusStep: number
    verticalStep: number
    color: number
    size: number
  }) {
    const geometry = new BufferGeometry()
    const positions: number[] = []

    for (let i = 0; i < options.count; i += 1) {
      const angle = (Math.PI * 2 * i) / options.count
      const radius = options.baseRadius + (i % 4) * options.radiusStep
      const verticalOffset = ((i % 7) - 3) * options.verticalStep
      positions.push(Math.cos(angle) * radius, verticalOffset, Math.sin(angle) * radius)
    }

    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.setDrawRange(0, 0)

    return new Points(
      geometry,
      new PointsMaterial({
        color: options.color,
        size: options.size,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
  }
}
