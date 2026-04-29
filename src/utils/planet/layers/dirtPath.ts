import { Vector3 } from 'three'

export type DirtPathRevealState = {
  visible: boolean
  visibleSegmentCount: number
  opacity: number
}

export const DIRT_PATH_CENTER = new Vector3().setFromSphericalCoords(1, 0.18, 1.6)

const DIRT_PATH_SEGMENT_SAMPLE_COUNT = 4
const DIRT_PATH_CLEARANCE_RADIUS = 0.24
const DIRT_PATH_SEGMENT_RANGES = [
  { start: 0.02, end: 0.3 },
  { start: 0.42, end: 0.66 },
  { start: 0.76, end: 0.98 },
] as const

const DIRT_PATH_NORMAL = DIRT_PATH_CENTER.clone().normalize()
const DIRT_PATH_TANGENT = new Vector3(0, 1, 0).cross(DIRT_PATH_NORMAL).normalize()
const DIRT_PATH_BITANGENT = DIRT_PATH_NORMAL.clone().cross(DIRT_PATH_TANGENT).normalize()

const HIDDEN_STATE: DirtPathRevealState = {
  visible: false,
  visibleSegmentCount: 0,
  opacity: 0,
}

const DAY_FIFTEEN_STATE: DirtPathRevealState = {
  visible: true,
  visibleSegmentCount: 1,
  opacity: 0.92,
}

const DAY_SIXTEEN_STATE: DirtPathRevealState = {
  visible: true,
  visibleSegmentCount: 2,
  opacity: 0.96,
}

const FULL_STATE: DirtPathRevealState = {
  visible: true,
  visibleSegmentCount: 3,
  opacity: 1,
}

function normalizeDayCount(dayCount: number): number {
  if (!Number.isFinite(dayCount)) return 1
  return Math.max(1, Math.floor(dayCount))
}

function clampProgress(progress: number) {
  if (!Number.isFinite(progress)) return 0
  return Math.max(0, Math.min(1, progress))
}

function getLocalCenterPoint(progress: number) {
  const t = clampProgress(progress)
  const x = -0.34 + 0.66 * t
  const z = Math.sin((t - 0.5) * Math.PI) * -0.055 + Math.cos(t * Math.PI * 2) * 0.012

  return new Vector3(x, 0, z)
}

function buildSegmentCenterLine(start: number, end: number) {
  return Array.from({ length: DIRT_PATH_SEGMENT_SAMPLE_COUNT + 1 }, (_, index) => {
    const t = start + ((end - start) * index) / DIRT_PATH_SEGMENT_SAMPLE_COUNT
    return getLocalCenterPoint(t)
  })
}

function projectLocalPathDirection(localX: number, localZ: number) {
  return DIRT_PATH_NORMAL
    .clone()
    .addScaledVector(DIRT_PATH_TANGENT, localX)
    .addScaledVector(DIRT_PATH_BITANGENT, localZ)
    .normalize()
}

function projectNormalToPathPlane(normal: Vector3) {
  const safeNormal = normal.clone().normalize()
  const depth = Math.max(0.0001, safeNormal.dot(DIRT_PATH_NORMAL))

  return {
    x: safeNormal.dot(DIRT_PATH_TANGENT) / depth,
    z: safeNormal.dot(DIRT_PATH_BITANGENT) / depth,
  }
}

function getDistanceToSegment(
  pointX: number,
  pointZ: number,
  startPoint: Vector3,
  endPoint: Vector3,
) {
  const segmentX = endPoint.x - startPoint.x
  const segmentZ = endPoint.z - startPoint.z
  const segmentLengthSquared = segmentX * segmentX + segmentZ * segmentZ
  if (segmentLengthSquared <= Number.EPSILON) {
    const dx = pointX - startPoint.x
    const dz = pointZ - startPoint.z
    return Math.sqrt(dx * dx + dz * dz)
  }

  const t =
    ((pointX - startPoint.x) * segmentX + (pointZ - startPoint.z) * segmentZ) / segmentLengthSquared
  const clampedT = Math.max(0, Math.min(1, t))
  const nearestX = startPoint.x + segmentX * clampedT
  const nearestZ = startPoint.z + segmentZ * clampedT
  const dx = pointX - nearestX
  const dz = pointZ - nearestZ

  return Math.sqrt(dx * dx + dz * dz)
}

function isPointNearSegmentRange(
  pointX: number,
  pointZ: number,
  segmentRange: (typeof DIRT_PATH_SEGMENT_RANGES)[number],
) {
  const centerLine = buildSegmentCenterLine(segmentRange.start, segmentRange.end)

  for (let index = 0; index < centerLine.length - 1; index += 1) {
    const current = centerLine[index]
    const next = centerLine[index + 1]
    if (!current || !next) continue
    if (getDistanceToSegment(pointX, pointZ, current, next) <= DIRT_PATH_CLEARANCE_RADIUS) {
      return true
    }
  }

  return false
}

export function getDirtPathDirectionAt(progress: number) {
  const point = getLocalCenterPoint(progress)
  return projectLocalPathDirection(point.x, point.z)
}

export function getDirtPathRevealState(dayCount: number): DirtPathRevealState {
  const safeDay = normalizeDayCount(dayCount)

  if (safeDay <= 14) return HIDDEN_STATE
  if (safeDay === 15) return DAY_FIFTEEN_STATE
  if (safeDay === 16) return DAY_SIXTEEN_STATE

  return FULL_STATE
}

export function isGrassPatchBlockedByDirtPath(normal: Vector3, dayCount: number) {
  const revealState = getDirtPathRevealState(dayCount)
  if (!revealState.visible) return false

  const localPoint = projectNormalToPathPlane(normal)
  return DIRT_PATH_SEGMENT_RANGES.slice(0, revealState.visibleSegmentCount).some((segmentRange) =>
    isPointNearSegmentRange(localPoint.x, localPoint.z, segmentRange),
  )
}
