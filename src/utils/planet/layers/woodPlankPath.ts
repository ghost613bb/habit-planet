import {
  BoxGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshLambertMaterial,
  Vector3,
} from 'three'

import { getSurfaceTransformWithClearance } from '../math/PlanetMath'
import { DIRT_PATH_CENTER, getDirtPathDirectionAt } from './dirtPath'

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
const WOOD_PLANK_ROUTE_ROTATION_AXIS = DIRT_PATH_CENTER.clone().normalize()
const WOOD_PLANK_ROUTE_PERPENDICULAR_ANGLE = Math.PI / 2
const WOOD_PLANK_GRASS_CLEARANCE_ANGLE = 0.11

const WOOD_PLANK_PLACEMENTS: WoodPlankPlacement[] = [
  { progress: 0.2, yawOffset: -0.08, tiltX: 0.03, tiltZ: -0.01, scale: new Vector3(0.96, 1, 1) },
  { progress: 0.38, yawOffset: -0.03, tiltX: 0.02, tiltZ: 0.02, scale: new Vector3(0.94, 1, 0.98) },
  { progress: 0.56, yawOffset: 0.04, tiltX: -0.02, tiltZ: -0.02, scale: new Vector3(0.96, 1, 1.02) },
  { progress: 0.74, yawOffset: 0.08, tiltX: 0.02, tiltZ: 0.01, scale: new Vector3(0.94, 1, 0.98) },
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

function getPerpendicularRouteDirection(progress: number) {
  return getDirtPathDirectionAt(progress)
    .clone()
    .applyAxisAngle(WOOD_PLANK_ROUTE_ROTATION_AXIS, WOOD_PLANK_ROUTE_PERPENDICULAR_ANGLE)
    .normalize()
}

function getFirstVisibleWoodPlankIndex(dayCount: number) {
  const revealState = getWoodPlankPathRevealState(dayCount)
  if (!revealState.visible) return WOOD_PLANK_PLACEMENTS.length

  return Math.max(0, WOOD_PLANK_PLACEMENTS.length - revealState.visiblePlankCount)
}

export function getWoodPlankPathRevealState(dayCount: number): WoodPlankPathRevealState {
  const safeDay = normalizeDayCount(dayCount)

  if (safeDay <= 14) return HIDDEN_STATE
  if (safeDay === 15) return DAY_FIFTEEN_STATE
  if (safeDay === 16) return DAY_SIXTEEN_STATE

  return FULL_STATE
}

export function getWoodPlankSurfaceNormal(index: number) {
  const placement =
    WOOD_PLANK_PLACEMENTS[MathUtils.clamp(index, 0, WOOD_PLANK_PLACEMENTS.length - 1)]

  return getPerpendicularRouteDirection(placement!.progress)
}

export function isGrassPatchBlockedByWoodPlankPath(normal: Vector3, dayCount: number) {
  const firstVisibleIndex = getFirstVisibleWoodPlankIndex(dayCount)
  if (firstVisibleIndex >= WOOD_PLANK_PLACEMENTS.length) return false

  const safeNormal = normal.clone().normalize()
  return WOOD_PLANK_PLACEMENTS.slice(firstVisibleIndex).some((placement) => {
    const plankNormal = getPerpendicularRouteDirection(placement.progress)
    return safeNormal.angleTo(plankNormal) <= WOOD_PLANK_GRASS_CLEARANCE_ANGLE
  })
}

export function createWoodPlankPathGroup(planetRadius: number): Group {
  const group = new Group()

  WOOD_PLANK_PLACEMENTS.forEach((placement, index) => {
    const plank = createWoodPlankMesh()
    const pathNormal = getPerpendicularRouteDirection(placement.progress)
    const { pos, quaternion } = getSurfaceTransformWithClearance(
      pathNormal,
      planetRadius,
      WOOD_PLANK_SURFACE_CLEARANCE,
    )

    plank.position.copy(pos)
    plank.quaternion.copy(quaternion)
    plank.rotateY(Math.PI / 2 + placement.yawOffset)
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
