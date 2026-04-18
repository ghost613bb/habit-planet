import {
  DodecahedronGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  Vector3,
} from 'three'

import { mats } from '../assets/Materials'
import { getSurfaceTransform } from '../math/PlanetMath'
import type { LayerController, LayerUpdateInput } from './contracts'

type TerrainLayerOptions = {
  parentGroup: Group
  grassMesh: Mesh
  planetRadius: number
}

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
    this.buildRockMatrices()
    this.parentGroup.add(this.rocks)
  }

  preload(): Promise<void> {
    return Promise.resolve()
  }

  activate(input: LayerUpdateInput) {
    this.update(input)
  }

  update(input: LayerUpdateInput) {
    const scaleByStage = {
      1: 0.2 + input.stageProgress * 0.25,
      2: 0.48 + input.stageProgress * 0.18,
      3: 0.68,
      4: 0.8,
      5: 0.9,
      6: 1,
    }

    const nextScale = scaleByStage[input.stageIndex]
    this.grassMesh.visible = input.stageIndex >= 1
    this.grassMesh.scale.set(nextScale, nextScale, nextScale)
    this.grassMesh.material.color.set(
      input.stageIndex >= 5 ? '#86a95d' : input.stageIndex >= 3 ? '#7e9460' : '#6b7045',
    )

    this.rocks.visible = input.stageIndex <= 2
    this.rocks.count = input.stageIndex === 1 ? 4 : 8
  }

  deactivate() {
    this.grassMesh.visible = false
    this.rocks.visible = false
  }

  dispose() {
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
      const { pos, quaternion } = getSurfaceTransform(normal, this.planetRadius + 0.03)
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
