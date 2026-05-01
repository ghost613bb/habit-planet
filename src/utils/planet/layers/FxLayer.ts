import {
  Group,
  Mesh,
  MeshStandardMaterial,
  PointLight,
  RingGeometry,
  Vector3,
} from 'three'

import { mats } from '../assets/Materials'
import { getSurfaceTransform } from '../math/PlanetMath'
import {
  CAMPFIRE_GLOW_RADIUS_OFFSET,
  CAMPFIRE_LIGHT_RADIUS_OFFSET,
  CAMPFIRE_SURFACE_PHI,
  CAMPFIRE_SURFACE_THETA,
} from './campfirePlacement'
import type { LayerController, LayerUpdateInput } from './contracts'

const CAMPFIRE_ONLY_START_DAY = 22
const CAMPFIRE_ONLY_END_DAY = 45

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

  constructor(options: FxLayerOptions) {
    this.parentGroup = options.parentGroup
    this.planetRadius = options.planetRadius
    this.group = new Group()
    this.parentGroup.add(this.group)

    this.campfireLight = new PointLight(0xffa64d, 0.8, 5)
    this.campfireGlow = new Mesh(new RingGeometry(0.08, 0.16, 24), mats.ring)
    this.orbitRing = new Mesh(new RingGeometry(3.95, 4.02, 64), mats.ring)
    this.orbitRingOuter = new Mesh(new RingGeometry(4.22, 4.28, 64), mats.ring)
    this.windowGlow = new Mesh(new RingGeometry(0.05, 0.11, 16), mats.ring)

    this.setupTransforms()
    this.group.add(
      this.campfireLight,
      this.campfireGlow,
      this.orbitRing,
      this.orbitRingOuter,
      this.windowGlow,
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

  private setRingOpacity(mesh: Mesh, opacity: number) {
    const material = mesh.material
    if (Array.isArray(material)) return
    if (!(material instanceof MeshStandardMaterial)) return
    material.opacity = opacity
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

    this.campfireLight.visible = false
    this.campfireGlow.visible = false
    this.orbitRing.visible = false
    this.orbitRingOuter.visible = false
    this.windowGlow.visible = false
  }
}
