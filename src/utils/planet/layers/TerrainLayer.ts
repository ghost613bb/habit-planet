import {
  DodecahedronGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Mesh,
  Vector3,
} from 'three'

import { mats, resetPlanetGrassOverlay, setPlanetGrassOverlay } from '../assets/Materials'
import { getPlacementTransform } from '../math/PlanetMath'
import type { LayerController, LayerUpdateInput } from './contracts'

type TerrainLayerOptions = {
  parentGroup: Group
  grassMesh: Mesh
  planetRadius: number
}

const STAGE_ONE_DAY_THREE_OVERLAY = {
  strength: 0.9,
  radius: 1.02,
  feather: 0.28,
  topStart: 0.7,
  topEnd: 0.9,
  irregularity: 0.1,
  color: '#4b8534',
} as const

const STAGE_TWO_DAY_FOUR_TO_FIVE_OVERLAY = {
  ...STAGE_ONE_DAY_THREE_OVERLAY,
  radius: 1.28,
  feather: 0.4,
  topStart: 0.58,
} as const

const STAGE_TWO_DAY_FIVE_OVERLAY = {
  ...STAGE_TWO_DAY_FOUR_TO_FIVE_OVERLAY,
  radius: 1.38,
  feather: 0.46,
  topStart: 0.52,
} as const

const STAGE_TWO_DAY_SIX_OVERLAY = {
  ...STAGE_TWO_DAY_FIVE_OVERLAY,
  radius: 1.52,
  feather: 0.54,
  topStart: 0.44,
  topEnd: 0.88,
  irregularity: 0.14,
} as const

export class TerrainLayer implements LayerController {
  id = 'terrain'

  private parentGroup: Group
  private grassMesh: Mesh
  private planetRadius: number
  private rocks: InstancedMesh
  private rockMatrices: Matrix4[] = []

  constructor(options: TerrainLayerOptions) {
    this.parentGroup = options.parentGroup
    this.grassMesh = options.grassMesh
    this.planetRadius = options.planetRadius
    this.rocks = new InstancedMesh(new DodecahedronGeometry(0.14, 0), mats.rockInstanced, 8)
    this.rocks.visible = false
    this.rocks.count = 8
    this.rocks.renderOrder = 2
    this.buildRockMatrices()

    const grassMaterial = this.grassMesh.material as MeshLambertMaterial
    // 草层只负责给地表染绿，不再写入深度，避免把幼苗和石头压在下面。
    grassMaterial.depthWrite = false
    grassMaterial.polygonOffset = true
    grassMaterial.polygonOffsetFactor = 1
    grassMaterial.polygonOffsetUnits = 1
    this.grassMesh.renderOrder = 0
    this.parentGroup.add(this.rocks)
  }

  preload(): Promise<void> {
    return Promise.resolve()
  }

  activate(input: LayerUpdateInput) {
    this.update(input)
  }

  update(input: LayerUpdateInput) {
    const grassMaterial = this.grassMesh.material as MeshLambertMaterial
    const stageOneDay = input.stageIndex === 1 ? Math.max(1, Math.floor(input.dayCount)) : null
    const stageTwoDay = input.stageIndex === 2 ? Math.max(4, Math.floor(input.dayCount)) : null
    const scaleByStage = {
      1: 0.2 + input.stageProgress * 0.25,
      2: 0.48 + input.stageProgress * 0.18,
      3: 0.68,
      4: 0.8,
      5: 0.9,
      6: 1,
    }

    const nextScale = scaleByStage[input.stageIndex]
    if (stageOneDay != null) {
      // 第 1 天只出现幼苗；第 3 天才让顶部轻微泛绿，模拟草被刚长出来。
      this.grassMesh.visible = false
      if (stageOneDay >= 3) {
        setPlanetGrassOverlay(STAGE_ONE_DAY_THREE_OVERLAY)
      } else {
        resetPlanetGrassOverlay()
      }

      this.rocks.visible = stageOneDay >= 2
      this.rocks.count = stageOneDay === 2 ? 2 : stageOneDay >= 3 ? 4 : 0
      return
    }

    if (stageTwoDay != null && stageTwoDay <= 6) {
      // 第二阶段第 4-6 天都保留泛绿基调，并在第 6 天继续扩大顶部覆盖范围。
      setPlanetGrassOverlay(
        stageTwoDay >= 6
          ? STAGE_TWO_DAY_SIX_OVERLAY
          : stageTwoDay === 5
            ? STAGE_TWO_DAY_FIVE_OVERLAY
            : STAGE_TWO_DAY_FOUR_TO_FIVE_OVERLAY,
      )
    } else {
      resetPlanetGrassOverlay()
    }
    this.grassMesh.visible = input.stageIndex >= 1
    this.grassMesh.scale.set(nextScale, nextScale, nextScale)
    grassMaterial.color.set(
      input.stageIndex >= 5 ? '#86a95d' : input.stageIndex >= 3 ? '#7e9460' : '#6b7045',
    )

    this.rocks.visible = input.stageIndex <= 2
    if (stageTwoDay != null) {
      this.rocks.count = stageTwoDay === 4 ? 5 : stageTwoDay === 5 ? 6 : 7
      return
    }

    this.rocks.count = input.stageIndex === 2 ? 8 : 0
  }

  deactivate() {
    this.grassMesh.visible = false
    resetPlanetGrassOverlay()
    this.rocks.visible = false
  }

  dispose() {
    resetPlanetGrassOverlay()
    this.parentGroup.remove(this.rocks)
    this.rocks.geometry.dispose()
  }

  private buildRockMatrices() {
    const anchors = [
      { phi: 0.18, theta: 0.15, scale: 0.8 },
      { phi: 0.24, theta: 0.8, scale: 0.95 },
      { phi: 0.12, theta: 1.4, scale: 0.7 },
      { phi: 0.22, theta: 2.2, scale: 1.1 },
      { phi: 0.1, theta: 2.8, scale: 0.85 },
      { phi: 0.16, theta: 3.4, scale: 0.75 },
      { phi: 0.2, theta: 4.2, scale: 0.92 },
      { phi: 0.14, theta: 5.1, scale: 0.88 },
    ]

    anchors.forEach((anchor, index) => {
      const normal = new Vector3().setFromSphericalCoords(1, anchor.phi, anchor.theta)
      const { pos, quaternion } = getPlacementTransform(normal, this.planetRadius, 'rock')
      const matrix = new Matrix4()
      matrix.compose(
        pos,
        quaternion,
        new Vector3(anchor.scale, anchor.scale * 0.8, anchor.scale),
      )
      this.rockMatrices[index] = matrix
      this.rocks.setMatrixAt(index, matrix)
    })

    this.rocks.instanceMatrix.needsUpdate = true
  }
}
