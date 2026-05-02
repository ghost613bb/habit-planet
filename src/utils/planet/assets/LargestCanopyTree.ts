import {
  Box3,
  ConeGeometry,
  CylinderGeometry,
  Group,
  LoadingManager,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  Vector3,
} from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const largestCanopyTreeLoader = new GLTFLoader(new LoadingManager())
const LARGEST_CANOPY_TREE_GROUND_SINK = 0.38

let largestCanopyTreeTemplate: Group | null = null
let largestCanopyTreeLoadPromise: Promise<Group> | null = null

function isJsdomEnvironment() {
  return typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)
}

function getLargestCanopyTreeUrl() {
  return typeof globalThis.location?.origin === 'string' && globalThis.location.origin.length > 0
    ? new URL('/models/lp_objects_trees/scene.gltf', globalThis.location.origin).toString()
    : '/models/lp_objects_trees/scene.gltf'
}

function createPlaceholderLargestCanopyTree() {
  const group = new Group()
  const trunk = new Mesh(
    new CylinderGeometry(0.08, 0.12, 0.52, 8),
    new MeshLambertMaterial({ color: '#8b5d39' }),
  )
  trunk.position.y = 0.26

  const canopyBottom = new Mesh(
    new ConeGeometry(0.42, 0.48, 8),
    new MeshLambertMaterial({ color: '#7cb56b' }),
  )
  canopyBottom.position.y = 0.66

  const canopyTop = new Mesh(
    new ConeGeometry(0.34, 0.42, 8),
    new MeshLambertMaterial({ color: '#6ea55b' }),
  )
  canopyTop.position.y = 0.98

  group.add(trunk, canopyBottom, canopyTop)
  return group
}

function normalizeTreeModel(input: Object3D) {
  const source = input.clone(true)
  source.updateMatrixWorld(true)

  const bounds = new Box3().setFromObject(source)
  const size = bounds.getSize(new Vector3())
  if (size.y <= 0.0001) return createPlaceholderLargestCanopyTree()

  source.position.x -= (bounds.min.x + bounds.max.x) * 0.5
  // 这个模型的根部包围盒偏高，额外下压一点，避免看起来悬空。
  source.position.y -= bounds.min.y + LARGEST_CANOPY_TREE_GROUND_SINK
  source.position.z -= (bounds.min.z + bounds.max.z) * 0.5

  const normalized = new Group()
  normalized.add(source)
  normalized.scale.setScalar(1 / size.y)
  normalized.updateMatrixWorld(true)

  return normalized
}

function hasMeshDescendant(input: Object3D) {
  let found = false
  input.traverse((child) => {
    if (child instanceof Mesh) found = true
  })
  return found
}

function getCanopyWidth(input: Object3D) {
  const source = input.clone(true)
  source.updateMatrixWorld(true)
  const bounds = new Box3().setFromObject(source)
  const size = bounds.getSize(new Vector3())
  return Math.max(size.x, size.z)
}

function getLargestCanopyTreeSource(root: Object3D) {
  const sceneRootNode = root.getObjectByName('GLTF_SceneRootNode')
  const directCandidates = (sceneRootNode?.children ?? []).filter(hasMeshDescendant)
  if (directCandidates.length > 0) {
    return (
      directCandidates.reduce<Object3D | null>((widestTree, candidate) => {
        if (!widestTree) return candidate
        return getCanopyWidth(candidate) > getCanopyWidth(widestTree) ? candidate : widestTree
      }, null) ?? root
    )
  }

  const fallbackCandidates: Object3D[] = []
  root.traverse((node) => {
    if (node === root) return
    if (!hasMeshDescendant(node)) return
    fallbackCandidates.push(node)
  })
  if (fallbackCandidates.length === 0) return root

  return (
    fallbackCandidates.reduce<Object3D | null>((widestTree, candidate) => {
      if (!widestTree) return candidate
      return getCanopyWidth(candidate) > getCanopyWidth(widestTree) ? candidate : widestTree
    }, null) ?? root
  )
}

export async function preloadLargestCanopyTreeTemplate() {
  if (largestCanopyTreeTemplate) return largestCanopyTreeTemplate

  if (!largestCanopyTreeLoadPromise) {
    if (isJsdomEnvironment()) {
      largestCanopyTreeTemplate = normalizeTreeModel(createPlaceholderLargestCanopyTree())
      largestCanopyTreeLoadPromise = Promise.resolve(largestCanopyTreeTemplate)
    } else {
      largestCanopyTreeLoadPromise = new Promise<Group>((resolve, reject) => {
        largestCanopyTreeLoader.load(
          getLargestCanopyTreeUrl(),
          (gltf) => {
            const largestCanopyTree = getLargestCanopyTreeSource(gltf.scene)
            largestCanopyTreeTemplate = normalizeTreeModel(largestCanopyTree)
            resolve(largestCanopyTreeTemplate)
          },
          undefined,
          reject,
        )
      })
    }
  }

  return largestCanopyTreeLoadPromise
}

export function createLargestCanopyTreeInstance(options?: {
  targetHeight?: number
  rotationY?: number
}) {
  const targetHeight = options?.targetHeight ?? 1
  const rotationY = options?.rotationY ?? 0
  const base = largestCanopyTreeTemplate ?? normalizeTreeModel(createPlaceholderLargestCanopyTree())
  const instance = base.clone(true)
  instance.scale.multiplyScalar(targetHeight)
  instance.rotation.y = rotationY
  return instance
}
