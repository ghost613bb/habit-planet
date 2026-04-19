import { Quaternion, Vector3 } from 'three'

// 简单的种子随机数生成器，确保每次生成的位置一致
export class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  // 0 to 1
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  // min to max
  range(min: number, max: number) {
    return min + this.next() * (max - min)
  }
}

export const PLANET_SURFACE_OFFSET = 0.05
export const PLANET_SURFACE_CLEARANCE = {
  default: 0,
  grassLayer: -0.02,
  rock: 0.018,
  sprout: 0.05,
  bush: 0.024,
  tree: 0.032,
} as const

// 与 `planetRenderer.ts` 中的星球变形逻辑保持一致，避免装饰物贴地时出现各算各的。
const baseScaleY = 0.92
const topFlattenScale = 0.8

function getDeformedSurfacePoint(normal: Vector3, radius: number) {
  const pos = normal.clone().normalize().multiplyScalar(radius + PLANET_SURFACE_OFFSET)

  let yScale = baseScaleY
  if (pos.y > 0) {
    yScale *= topFlattenScale
  }
  pos.y *= yScale

  return { pos, yScale }
}

function getDeformedSurfaceNormal(pos: Vector3, yScale: number) {
  return new Vector3(pos.x, pos.y / (yScale * yScale), pos.z).normalize()
}

export function getSurfaceTransformWithClearance(
  normal: Vector3,
  radius: number,
  clearance: number = PLANET_SURFACE_CLEARANCE.default,
) {
  const { pos, yScale } = getDeformedSurfacePoint(normal, radius)
  const surfaceNormal = getDeformedSurfaceNormal(pos, yScale)

  if (clearance !== 0) {
    pos.addScaledVector(surfaceNormal, clearance)
  }

  const quaternion = new Quaternion()
  quaternion.setFromUnitVectors(new Vector3(0, 1, 0), surfaceNormal)

  return { pos, quaternion, surfaceNormal }
}

export function getPlacementTransform(
  normal: Vector3,
  radius: number,
  placement: keyof typeof PLANET_SURFACE_CLEARANCE = 'default',
) {
  return getSurfaceTransformWithClearance(normal, radius, PLANET_SURFACE_CLEARANCE[placement])
}

export const getSurfaceTransform = (normal: Vector3, radius: number) =>
  getSurfaceTransformWithClearance(normal, radius)
