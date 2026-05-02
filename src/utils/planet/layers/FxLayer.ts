import {
  Color,
  Group,
  Mesh,
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
    this.tintRing(this.energyRing, '#9fe8ff', '#55d8ff')
    this.tintRing(this.energyRingUpper, '#b8eeff', '#6ce3ff')
    this.tintRing(this.cabinWindowGlow, '#ffd38a', '#ffb14d')

    this.setupTransforms()
    this.group.add(
      this.campfireLight,
      this.campfireGlow,
      this.orbitRing,
      this.orbitRingOuter,
      this.energyRing,
      this.energyRingUpper,
      this.cabinWindowGlow,
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
  }

  deactivate() {
    this.group.visible = false
  }

  dispose() {
    this.parentGroup.remove(this.group)
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

  private getCabinGlowWarmth(dayCount: number) {
    if (dayCount <= CABIN_GLOW_STABLE_DAY) {
      return getStageFourCabinDayTuning(dayCount).windowWarmth
    }
    return getStageFourCabinDayTuning(CABIN_GLOW_STABLE_DAY).windowWarmth
  }

  private shouldShowEnergyRing(dayCount: number) {
    return dayCount >= ENERGY_RING_START_DAY
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
    this.syncCabinWindowGlowTransform(CABIN_GLOW_START_DAY)

    this.campfireLight.visible = false
    this.campfireGlow.visible = false
    this.orbitRing.visible = false
    this.orbitRingOuter.visible = false
    this.energyRing.visible = false
    this.energyRingUpper.visible = false
    this.cabinWindowGlow.visible = false
  }
}
