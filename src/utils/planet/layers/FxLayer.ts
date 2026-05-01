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
import { getCabinPlacementData } from './StructureLayer'
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
const CABIN_WINDOW_GLOW_RADIUS_OFFSET = 0.3
const CABIN_AURA_GLOW_RADIUS_OFFSET = 0.2

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
  private windowGlow: Mesh
  private cabinWindowGlow: Mesh
  private cabinAuraGlow: Mesh

  constructor(options: FxLayerOptions) {
    this.parentGroup = options.parentGroup
    this.planetRadius = options.planetRadius
    this.group = new Group()
    this.parentGroup.add(this.group)

    this.campfireLight = new PointLight(0xffa64d, 0.8, 5)
    this.campfireGlow = this.createRingMesh(0.08, 0.16, 24)
    this.orbitRing = this.createRingMesh(3.95, 4.02, 64)
    this.orbitRingOuter = this.createRingMesh(4.22, 4.28, 64)
    this.windowGlow = this.createRingMesh(0.05, 0.11, 16)
    this.cabinWindowGlow = this.createRingMesh(0.08, 0.18, 24)
    this.cabinAuraGlow = this.createRingMesh(0.2, 0.38, 32)
    this.tintRing(this.cabinWindowGlow, '#ffd38a', '#ffb14d')
    this.tintRing(this.cabinAuraGlow, '#ffb25a', '#ff8e2b')

    this.setupTransforms()
    this.group.add(
      this.campfireLight,
      this.campfireGlow,
      this.orbitRing,
      this.orbitRingOuter,
      this.windowGlow,
      this.cabinWindowGlow,
      this.cabinAuraGlow,
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
    const shouldShowWindowGlow = input.stageIndex >= 4 && !shouldKeepCampfireOnly
    const shouldShowOrbitRing = input.stageIndex >= 4 && !shouldKeepCampfireOnly
    const shouldShowOrbitRingOuter = input.stageIndex >= 5 && !shouldKeepCampfireOnly
    const shouldShowCabinGlow = input.stageIndex >= 4 && input.dayCount >= CABIN_GLOW_START_DAY
    const cabinGlowWarmth = shouldShowCabinGlow ? this.getCabinGlowWarmth(input.dayCount) : 0

    this.campfireLight.visible = input.stageIndex >= 2
    this.campfireLight.intensity = input.stageIndex >= 2 ? 0.9 + input.stageProgress * 0.9 : 0
    this.campfireGlow.visible = input.stageIndex >= 2
    this.setRingOpacity(
      this.campfireGlow,
      input.stageIndex >= 2 ? 0.28 + input.stageProgress * 0.16 : 0,
    )

    this.windowGlow.visible = shouldShowWindowGlow
    this.setRingOpacity(
      this.windowGlow,
      shouldShowWindowGlow ? 0.2 + input.stageProgress * 0.25 : 0,
    )
    this.cabinWindowGlow.visible = shouldShowCabinGlow
    this.setRingOpacity(
      this.cabinWindowGlow,
      shouldShowCabinGlow ? 0.08 + cabinGlowWarmth * 1.6 : 0,
    )
    this.cabinAuraGlow.visible = shouldShowCabinGlow
    this.setRingOpacity(
      this.cabinAuraGlow,
      shouldShowCabinGlow ? 0.04 + cabinGlowWarmth * 1.1 : 0,
    )

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

    const windowTransform = getSurfaceTransform(
      new Vector3().setFromSphericalCoords(1, 0.2, 2.1),
      this.planetRadius + 0.35,
    )
    this.windowGlow.position.copy(windowTransform.pos)
    this.windowGlow.quaternion.copy(windowTransform.quaternion)
    const { tentSurfaceNormal } = getCabinPlacementData(this.planetRadius)
    const cabinWindowTransform = getSurfaceTransform(
      tentSurfaceNormal,
      this.planetRadius + CABIN_WINDOW_GLOW_RADIUS_OFFSET,
    )
    this.cabinWindowGlow.position.copy(cabinWindowTransform.pos)
    this.cabinWindowGlow.quaternion.copy(cabinWindowTransform.quaternion)

    const cabinAuraTransform = getSurfaceTransform(
      tentSurfaceNormal,
      this.planetRadius + CABIN_AURA_GLOW_RADIUS_OFFSET,
    )
    this.cabinAuraGlow.position.copy(cabinAuraTransform.pos)
    this.cabinAuraGlow.quaternion.copy(cabinAuraTransform.quaternion)

    this.campfireLight.visible = false
    this.campfireGlow.visible = false
    this.orbitRing.visible = false
    this.orbitRingOuter.visible = false
    this.windowGlow.visible = false
    this.cabinWindowGlow.visible = false
    this.cabinAuraGlow.visible = false
  }
}
