import {
  BoxGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshLambertMaterial,
  Vector3,
} from 'three'

import { getSurfaceTransformWithClearance } from '../math/PlanetMath'
import { getDirtPathDirectionAt } from './dirtPath'

export type WoodPlankPathRevealState = {
  visible: boolean
  visiblePlankCount: number
}

type WoodPlankPlacement = {
  progress: number
  yawOffset: number
  tiltX: number
  tiltZ: number
  scale: Vector3
}

const WOOD_PLANK_COLOR = '#8a5d3b'
const WOOD_PLANK_STRAP_COLOR = '#6d4427'
const WOOD_PLANK_SURFACE_CLEARANCE = 0.032

const WOOD_PLANK_PLACEMENTS: WoodPlankPlacement[] = [
  { progress: 0.14, yawOffset: -0.32, tiltX: 0.06, tiltZ: -0.03, scale: new Vector3(0.92, 1, 1) },
  { progress: 0.36, yawOffset: -0.14, tiltX: 0.04, tiltZ: 0.05, scale: new Vector3(0.88, 1, 0.96) },
  { progress: 0.56, yawOffset: 0.12, tiltX: -0.05, tiltZ: -0.04, scale: new Vector3(0.94, 1, 1.02) },
  { progress: 0.82, yawOffset: 0.28, tiltX: 0.03, tiltZ: 0.04, scale: new Vector3(0.9, 1, 0.94) },
]

const HIDDEN_STATE: WoodPlankPathRevealState = {
  visible: false,
  visiblePlankCount: 0,
}

const DAY_FIFTEEN_STATE: WoodPlankPathRevealState = {
  visible: true,
  visiblePlankCount: 1,
}

const DAY_SIXTEEN_STATE: WoodPlankPathRevealState = {
  visible: true,
  visiblePlankCount: 3,
}

const FULL_STATE: WoodPlankPathRevealState = {
  visible: true,
  visiblePlankCount: 4,
}

function normalizeDayCount(dayCount: number): number {
  if (!Number.isFinite(dayCount)) return 1
  return Math.max(1, Math.floor(dayCount))
}

function createWoodPlankMesh() {
  const plank = new Group()

  const board = new Mesh(
    new BoxGeometry(0.56, 0.05, 0.18),
    new MeshLambertMaterial({
      color: WOOD_PLANK_COLOR,
      flatShading: true,
    }),
  )
  board.castShadow = false
  board.receiveShadow = false

  const strapLeft = new Mesh(
    new BoxGeometry(0.06, 0.012, 0.205),
    new MeshLambertMaterial({
      color: WOOD_PLANK_STRAP_COLOR,
      flatShading: true,
    }),
  )
  strapLeft.position.set(-0.16, 0.022, 0)

  const strapRight = strapLeft.clone()
  strapRight.position.x = 0.16

  plank.add(board, strapLeft, strapRight)
  return plank
}

export function getWoodPlankPathRevealState(dayCount: number): WoodPlankPathRevealState {
  const safeDay = normalizeDayCount(dayCount)

  if (safeDay <= 14) return HIDDEN_STATE
  if (safeDay === 15) return DAY_FIFTEEN_STATE
  if (safeDay === 16) return DAY_SIXTEEN_STATE

  return FULL_STATE
}

export function createWoodPlankPathGroup(planetRadius: number): Group {
  const group = new Group()

  WOOD_PLANK_PLACEMENTS.forEach((placement, index) => {
    const plank = createWoodPlankMesh()
    const pathNormal = getDirtPathDirectionAt(placement.progress)
    const { pos, quaternion } = getSurfaceTransformWithClearance(
      pathNormal,
      planetRadius,
      WOOD_PLANK_SURFACE_CLEARANCE,
    )

    plank.position.copy(pos)
    plank.quaternion.copy(quaternion)
    plank.rotateY(placement.yawOffset)
    plank.rotateX(placement.tiltX)
    plank.rotateZ(placement.tiltZ)
    plank.scale.copy(placement.scale)
    plank.visible = false
    plank.renderOrder = 5
    plank.name = `wood-plank-${index + 1}`

    group.add(plank)
  })

  return group
}

export function getWoodPlankPlacementProgress(index: number) {
  return WOOD_PLANK_PLACEMENTS[MathUtils.clamp(index, 0, WOOD_PLANK_PLACEMENTS.length - 1)]!.progress
}
