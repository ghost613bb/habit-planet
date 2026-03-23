import {
  BufferGeometry,
  Color,
  DodecahedronGeometry,
  Float32BufferAttribute,
  FogExp2,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  PCFSoftShadowMap, // 添加 PCFSoftShadowMap
  RepeatWrapping,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  InstancedMesh,
  Matrix4,
  Quaternion,
  MeshLambertMaterial,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

import { SeededRandom, getSurfaceTransform } from './planet/math/PlanetMath'
import { mats } from './planet/assets/Materials'
import { setupLights } from './planet/core/Lights'

export type { Stage } from './planet/types'

const PLANET_RADIUS_BASE = 3.0

// --- 纹理加载 ---
const textureLoader = new TextureLoader()
const gltfLoader = new GLTFLoader()

// 彻底移除了导致 531ms 阻塞的 TIFFLoader，改用原生的 TextureLoader 加载压缩后的 JPG。
// JPG 格式享有浏览器底层硬件解码加速，且分辨率已压缩到 1024x512，
// 贴图面积缩小了 16 倍，这将彻底消除 texSubImage2D 造成的显存拷贝长任务。
textureLoader.load('/textures/lroc_color_16bit_srgb_4k2.jpg', (texture) => {
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  mats.planet.map = texture
  mats.planet.needsUpdate = true
}, undefined, (err) => console.warn('Failed to load JPG color texture:', err))

textureLoader.load('/textures/ldem_16_uint2.jpg', (texture) => {
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  mats.planet.displacementMap = texture
  mats.planet.needsUpdate = true
}, undefined, (err) => console.warn('Failed to load JPG displacement texture:', err))

// --- 物体生成函数 ---

// 创建星空背景
function createStars() {
  const starGeo = new BufferGeometry()
  const pos = []
  for (let i = 0; i < 500; i++) {
    pos.push((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80)
  }
  starGeo.setAttribute('position', new Float32BufferAttribute(pos, 3))
  const material = new PointsMaterial({ color: 0xffffff, size: 0.2, transparent: true, opacity: 0.6 })
  return new Points(starGeo, material)
}

// --- 核心渲染器 ---

export function createPlanetRenderer(input: {
  host?: HTMLDivElement
  canvas: HTMLCanvasElement
  dayCount: number
  timeOfDay?: number
  stages?: unknown
  stageIndex?: number
}) {
  const { canvas, dayCount: initialDayCount, timeOfDay = 12 } = input
  const host = input.host ?? (canvas.parentElement as HTMLDivElement)
  let dayCount = initialDayCount

  // 引用对象 (Refs) 用于存储需要更新的场景物体
  const refs: any = {
    grassMesh: null,
    planetMesh: null,
    ringMesh: null,
    ringGlowMesh: null,
    houseGroup: null,
    windowMesh: null,
    windmillGroup: null,
    windmillRotor: null,
    charactersGroup: null,
    treeGroups: [],
    starsPoints: null,
    lights: {
      ambient: null,
      sun: null,
      moon: null,
    },
    particles: [],
  }

  // --- 初始化场景 ---
  const scene = new Scene()
  scene.background = new Color('#050510')
  scene.fog = new FogExp2(0x050510, 0.04)
  const camera = new PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.set(0, 4, 12)

  const renderer = new WebGLRenderer({
    canvas,
    // 恢复抗锯齿：关闭抗锯齿会导致细小的草地模型在旋转时发生严重的像素闪烁（即你看到的“零零碎碎的动态”）
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    // 优化：禁用保留缓冲区。这能让 WebGL 上下文初始化更快，且在某些设备上避免不必要的内存拷贝
    preserveDrawingBuffer: false,
    // 优化：明确不使用深度对数缓冲，减少片段着色器计算
    logarithmicDepthBuffer: false,
    // 优化：对于 getContext 长任务的终极优化。明确告知浏览器不关心模板缓冲和深度缓冲中多余的精度
    stencil: false,
    depth: true
  })
  
  // 优化：对于低端设备，强制使用 webgl1（如果浏览器初始化 webgl2 过慢）
  // 虽然 Three.js 默认优先 webgl2，但在某些显卡驱动上获取 webgl2 上下文非常耗时
  // 考虑到我们的项目不依赖 webgl2 的高级特性，这个参数可以加快 getContext 速度
  // 注意：在较新的 Three.js 中，WebGLRenderer 默认处理了上下文的创建，
  // 但我们可以通过禁用一些不需要的高级特性来减轻显卡初始化压力。
  // 严格限制像素比例为 1，配合抗锯齿，既能保证画质不闪烁，又能大幅降低高分屏的像素填充压力
  renderer.setPixelRatio(1)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFSoftShadowMap

  // 修复 CLS (Cumulative Layout Shift)：确保 Canvas 有固定的块级布局，防止加载时发生尺寸跳动
  canvas.style.display = 'block'
  canvas.style.width = '100%'
  canvas.style.height = '100%'

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 5
  controls.maxDistance = 18
  controls.maxPolarAngle = Math.PI / 2 // 限制只能在赤道及以上视角观察，防止翻转到南极
  controls.minPolarAngle = Math.PI / 3 // 限制最小视角，防止完全俯视
  controls.enablePan = false // 禁止平移，保持星球在中心
  // controls.minAzimuthAngle = -Infinity // 允许水平无限旋转

  // --- 初始化灯光 ---
  const lights = setupLights(scene)
  Object.assign(refs.lights, lights)

  refs.starsPoints = createStars()
  scene.add(refs.starsPoints)

  // --- 构建星球世界 ---
  const planetGroup = new Group()
  scene.add(planetGroup)
  refs.planetGroup = planetGroup

  const planetRadius = PLANET_RADIUS_BASE
  const grassRadius = 3.05

  // 优化：将 512x512 (约26万个顶点/52万个面) 降低到 256x256 (约6.5万个顶点)
  // 大幅减少顶点着色器和阴影计算的压力，极大地降低每帧的渲染耗时 (改善 INP 指标)
  const planetGeo = new SphereGeometry(planetRadius, 256, 256) // 降低分段数以提升性能，保留足够的 displacementMap 细节

  // 调整星球形状：通过修改几何体顶点来实现
  // 需求：上1/3部分稍微平坦，整体呈椭球状
  const positions = planetGeo.attributes.position
  const normals = planetGeo.attributes.normal
  const v = new Vector3()
  const n = new Vector3()
  // 基础压扁比例 (原 0.92)
  const baseScaleY = 0.92
  // 顶部额外压扁比例 (使上部更平坦)
  const topFlattenScale = 0.80 

  if (positions && normals) {
    // 优化：使用底层的 TypedArray 直接操作 6.5 万个顶点，避免每一帧 13 万次的对象方法调用
    // 这将极大地缩短初始化时长，消除 Long Task 阻塞
    const posArray = positions.array as Float32Array;
    const normArray = normals.array as Float32Array;
    
    for (let i = 0; i < positions.count; i++) {
      const idx = i * 3;
      const vx = posArray[idx];
      const vy = posArray[idx + 1];
      const vz = posArray[idx + 2];

      let yScale = baseScaleY
      // 对上半球应用额外的压扁，模拟"顶部平坦"的效果
      if (vy > 0) {
        yScale *= topFlattenScale
      }
      
      const newY = vy * yScale;
      posArray[idx + 1] = newY;

      // 手动计算法线以修复接缝问题
      // 使用椭球体法线公式：(x, y/scale^2, z)
      const nx = vx;
      const ny = newY / (yScale * yScale);
      const nz = vz;
      
      // normalize
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      normArray[idx] = nx / len;
      normArray[idx + 1] = ny / len;
      normArray[idx + 2] = nz / len;
    }
    positions.needsUpdate = true
    normals.needsUpdate = true
  }

  refs.planetMesh = new Mesh(planetGeo, mats.planet)
  refs.planetMesh.castShadow = true
  refs.planetMesh.receiveShadow = true
  // 移除之前的缩放，现在形状已经烘焙到几何体中了
  refs.planetMesh.scale.set(1, 1, 1)
  planetGroup.add(refs.planetMesh)

  const grassGeo = new SphereGeometry(grassRadius, 128, 128)

  refs.grassMesh = new Mesh(grassGeo, mats.grass)
  refs.grassMesh.receiveShadow = true
  refs.grassMesh.scale.set(0.01, 0.01, 0.01)
  refs.grassMesh.visible = false
  planetGroup.add(refs.grassMesh)

  // --- 放置小岩石和草丛 ---
  // 需求：上1/3部分，位置固定（使用固定种子），大小不一，分布不均匀（聚类），美观
  const rockModels = [
    '/models/Pebble_Round_1.gltf',
    '/models/Pebble_Round_4.gltf',
    '/models/Rock_Medium_1.gltf',
    '/models/Rock_Medium_2.gltf',
  ]
  const grassModels: string[] = [
    '/models/scene.gltf'
  ]
  const grassPatchModels: string[] = [
  ]
  const flowerModels: string[] = [
  ]

  const rocksGroup = new Group()
  planetGroup.add(rocksGroup)
  refs.rocksGroup = rocksGroup
  
  // 确保岩石组本身是可见的
  rocksGroup.visible = true;

  const rng = new SeededRandom(20231027) // 固定种子

  // 预加载模型并生成装饰物（岩石+草丛）
  Promise.all([
    // 加载岩石
    ...rockModels.map(url => new Promise<Group>((resolve) => {
      gltfLoader.load(url, (gltf) => {
        gltf.scene.userData.type = 'rock'; // 标记为岩石
        gltf.scene.userData.modelName = url;
        resolve(gltf.scene)
      }, undefined, (error) => {
        console.warn(`Failed to load rock model: ${url}`, error)
        resolve(new Group()) 
      })
    })),
    // 加载草丛
    ...grassModels.map(url => new Promise<Group>((resolve) => {
      gltfLoader.load(url, (gltf) => {
        const model = gltf.scene;
        model.userData.type = 'grass'; // 标记为草
        model.userData.modelName = url;
        
        // 针对特定的模型调整其原点中心
        if (url.includes('scene.gltf')) {
          import('three').then(({ Box3, Vector3, Group }) => {
            const box = new Box3().setFromObject(model);
            const center = box.getCenter(new Vector3());
            const size = box.getSize(new Vector3());
            
            // 使用 Wrapper 包裹模型，避免直接修改 GLTF 内部节点的 Position 导致矩阵冲突
            const wrapper = new Group();
            wrapper.userData = model.userData; // 转移 userData，以便后续识别
            
            console.log('grass model box size:', size);
            
            model.position.x -= center.x;
            model.position.y -= (center.y - size.y / 2); // 底部对齐
            model.position.z -= center.z;
            
            wrapper.add(model);
            resolve(wrapper);
          });
        } else {
          resolve(model);
        }
      }, undefined, (error) => {
        console.warn(`Failed to load grass model: ${url}`, error)
        resolve(new Group())
      })
    })),
    // 加载草皮
    ...grassPatchModels.map(url => new Promise<Group>((resolve) => {
      gltfLoader.load(url, (gltf) => {
        gltf.scene.userData.type = 'grassPatch'; // 标记为草皮
        gltf.scene.userData.modelName = url;
        resolve(gltf.scene)
      }, undefined, (error) => {
        console.warn(`Failed to load grass patch model: ${url}`, error)
        resolve(new Group())
      })
    })),
    // 加载花朵
    ...flowerModels.map(url => new Promise<Group>((resolve) => {
      gltfLoader.load(url, (gltf) => {
        gltf.scene.userData.type = 'flower'; // 标记为花朵
        gltf.scene.userData.modelName = url;
        resolve(gltf.scene)
      }, undefined, (error) => {
        console.warn(`Failed to load flower model: ${url}`, error)
        resolve(new Group())
      })
    }))
  ]).then(async loadedModels => {
    // 异步分片工具：让出主线程，防止浏览器卡死（Long Task）
    const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

    // --- 岩石大小配置 ---
    // 在这里调整岩石的大小范围
    const rockScaleConfig = {
      // 聚集分布的岩石 (通常更大)
      cluster: {
        pebbleBase: 0.12, // 鹅卵石基准大小 (原 0.15，调小了一些)
        rockBase: 0.06,   // 岩石基准大小 (原 0.08，调小了一些)
        variationMin: 0.8, // 随机变化下限
        variationMax: 1.5  // 随机变化上限
      },
      // 散落分布的岩石 (通常较小)
      scattered: {
        pebbleBase: 0.10, // 鹅卵石基准大小 (原 0.12，调小了一些)
        rockBase: 0.05,   // 岩石基准大小 (原 0.06，调小了一些)
        variationMin: 0.8, // 随机变化下限
        variationMax: 1.2  // 随机变化上限
      }
    };

    // 过滤掉加载失败的模型并分类
    const validRocks = loadedModels.filter(m => m.children.length > 0 && m.userData.type === 'rock')
    const validGrasses = loadedModels.filter(m => m.children.length > 0 && m.userData.type === 'grass')
    const validGrassPatches = loadedModels.filter(m => m.children.length > 0 && m.userData.type === 'grassPatch')
    const validFlowers = loadedModels.filter(m => m.children.length > 0 && m.userData.type === 'flower')
    
    if (validRocks.length === 0 && validGrasses.length === 0 && validGrassPatches.length === 0 && validFlowers.length === 0) return
    
    // 辅助函数：放置单个物体
    // 增加 heightOffset 参数，允许物体在计算出的地表位置上再向外偏移一定距离
    const grassTransformsMap = new Map<Object3D, Matrix4[]>();
    
    // 优化：提前分配临时对象，避免在 1800+ 次循环中不断 new Object3D() 造成内存抖动和垃圾回收卡顿
    const tempPos = new Vector3();
    const tempQuat = new Quaternion();
    const tempScale = new Vector3();
    const tempMatrix = new Matrix4();
    const yAxis = new Vector3(0, 1, 0);

    const placeObject = (obj: Object3D, normal: Vector3, scale: number, material?: any, isGrass: boolean = false, heightOffset: number = 0) => {
      // 在原有的 planetRadius 基础上加上偏移量，使得物体可以“浮”出地面贴图的高度
      const { pos, quaternion } = getSurfaceTransform(normal, planetRadius + heightOffset)

      // 如果是草，我们收集它的位置矩阵而不是直接克隆生成网格，后续统一使用 InstancedMesh 渲染以大幅提升性能
      if (isGrass) {
        // 优化：使用纯矩阵运算替代 new Object3D().updateMatrix()
        tempPos.copy(pos);
        tempQuat.copy(quaternion);
        
        // 给草地模型增加更丰富的随机旋转，打破其原本方正的形状特征 (绕局部 Y 轴)
        const randomYRot = new Quaternion().setFromAxisAngle(yAxis, rng.range(0, Math.PI * 2));
        tempQuat.multiply(randomYRot);
        
        tempScale.setScalar(scale);
        tempMatrix.compose(tempPos, tempQuat, tempScale);
        
        if (!grassTransformsMap.has(obj)) {
          grassTransformsMap.set(obj, [])
        }
        grassTransformsMap.get(obj)!.push(tempMatrix.clone())
        return; // 提前返回，不再克隆
      }

      const clone = obj.clone()
      clone.scale.setScalar(scale)
      clone.position.copy(pos)
      clone.setRotationFromQuaternion(quaternion)
      
      clone.rotateY(rng.range(0, Math.PI * 2))
      
      clone.visible = true;
      
      // 更新一次世界矩阵。注意必须在添加到场景或进行矩阵更新前恢复 autoUpdate，否则子节点可能无法正确继承父节点的变换
      clone.updateMatrix();
      
      clone.traverse((child: any) => {
        // 如果彻底关闭自动更新，必须确保首次渲染前 matrixWorld 已经完全计算正确。
        // 为了安全起见，这里我们保持默认的自动更新（由于石头等物体数量不多，不会造成性能瓶颈）。
        child.matrixAutoUpdate = true;
        if ((child as Mesh).isMesh) {
          child.castShadow = true; 
          child.receiveShadow = true;
          
          if (material) {
            (child as Mesh).material = material
          }
          
          child.visible = true;
        }
      })
      rocksGroup.add(clone)
    }

    // 1. 生成聚类岩石 (Cluster) - 保持原有逻辑
    const clusterCount = 6 
    for (let i = 0; i < clusterCount; i++) {
      const clusterPhi = rng.range(0.2, 1.0)
      const clusterTheta = rng.range(0, Math.PI * 2)
      const rocksInCluster = Math.floor(rng.range(3, 8))
      
      // 放置伴生草丛 (在岩石周围)
      // 因为单块草变小了，需要增加数量来填补
      const grassInCluster = Math.floor(rng.range(6, 12)) 
      
      // 放置岩石
      for (let j = 0; j < rocksInCluster; j++) {
        if (validRocks.length === 0) break;
        const offsetPhi = (rng.next() - 0.5) * 0.3
        const offsetTheta = (rng.next() - 0.5) * 0.3
        let phi = clusterPhi + offsetPhi
        let theta = clusterTheta + offsetTheta
        if (phi < 0.1) phi = 0.1
        if (phi > 1.2) phi = 1.2

        const normal = new Vector3().setFromSphericalCoords(1, phi, theta)
        const modelIndex = Math.floor(rng.range(0, validRocks.length))
        const originalModel = validRocks[modelIndex]
        if (!originalModel) continue
        const baseScale = originalModel.userData.modelName.includes('Pebble') 
          ? rockScaleConfig.cluster.pebbleBase 
          : rockScaleConfig.cluster.rockBase
        const scale = baseScale * rng.range(rockScaleConfig.cluster.variationMin, rockScaleConfig.cluster.variationMax)
        
        placeObject(originalModel, normal, scale, mats.rockInstanced)
      }

      // 放置伴生草丛 (在岩石周围)
      for (let k = 0; k < grassInCluster; k++) {
        if (validGrasses.length === 0 && validGrassPatches.length === 0) break;
        
        const offsetPhi = (rng.next() - 0.5) * 0.4
        const offsetTheta = (rng.next() - 0.5) * 0.4
        let phi = clusterPhi + offsetPhi
        let theta = clusterTheta + offsetTheta
        
        // 限制伴生草丛分布在整个星球顶部半球
        if (phi < 0.0) phi = 0.0
        if (phi > 0.29) continue // 与独立草坪的范围(0.29)保持一致

        const normal = new Vector3().setFromSphericalCoords(1, phi, theta)
        
        const isPatch = validGrassPatches.length > 0 && rng.next() > 0.5
        const sourceArray = (isPatch || validGrasses.length === 0) ? validGrassPatches : validGrasses
        if (sourceArray.length === 0) continue

        const modelIndex = Math.floor(rng.range(0, sourceArray.length))
        const originalModel = sourceArray[modelIndex]
        if (!originalModel) continue
        
        // 专门针对 scene.gltf (草皮模型) 调整大小
    // 伴生在石头旁边的草/苔藓，也需要足够大以防陷入地表，但也不能太大导致边缘翘起
    const baseScale = originalModel.userData.modelName?.includes('scene.gltf') ? 0.07 : 0.09;
    const scale = baseScale * rng.range(0.5, 1.2)
        
    // 尺寸变小后厚度也变小了，把负偏移量改小一点，甚至变成0，防止完全被地表吞没
    placeObject(originalModel, normal, scale, undefined, true, 0.0) 
  }
  }

  // 2. 生成散落岩石 (Scattered) - 保持原有逻辑
  const scatteredRockCount = 12
  for (let k = 0; k < scatteredRockCount; k++) {
    if (validRocks.length === 0) break;
    const phi = rng.range(0.1, 1.1)
    const theta = rng.range(0, Math.PI * 2)
    const normal = new Vector3().setFromSphericalCoords(1, phi, theta)
    
    const modelIndex = Math.floor(rng.range(0, validRocks.length))
    const originalModel = validRocks[modelIndex]
    if (!originalModel) continue
    const baseScale = originalModel.userData.modelName.includes('Pebble') 
      ? rockScaleConfig.scattered.pebbleBase 
      : rockScaleConfig.scattered.rockBase
    const scale = baseScale * rng.range(rockScaleConfig.scattered.variationMin, rockScaleConfig.scattered.variationMax)
    
    placeObject(originalModel, normal, scale, mats.rockInstanced)
  }

  // 3. 生成独立草被 (Independent Grass Patches)
  // 为了打破方形边缘，我们需要：1. 增加数量让它们互相重叠掩盖边界；2. 增加大小的差异性；3. 让边缘逐渐稀疏。
  // 因为我们将单块尺寸大幅缩小了以贴合球面，所以必须巨幅增加数量来弥补覆盖面积
  // 范围再次变大，数量稍微减少或保持不变以进一步实现“稍微窸窣”的效果
  const independentGrassCount = 1800 
  
  // 优化：不再使用简单的 setTimeout 阻塞切片，而是使用 requestAnimationFrame 来保证与浏览器的渲染帧率同步
  // 这样既能保证主线程不被完全卡死，又能在每一帧的空闲时间里尽可能多地计算，彻底消除卡顿感
  const batchSize = 300; // 增大每批次处理量，利用 RequestAnimationFrame 的优势
  const processGrassBatch = (startIndex: number) => {
    return new Promise<void>((resolve) => {
      const endIndex = Math.min(startIndex + batchSize, independentGrassCount);
      for (let n = startIndex; n < endIndex; n++) {
        if (validGrasses.length === 0 && validGrassPatches.length === 0) break;
        
        // 进一步扩大范围，让草被分布的区域更大一点点
        const maxPhi = 0.45; // 从 0.35 扩大到 0.45
        
        // 稍微向中心聚集，并引入一些不规则的散布
        const distFactor = Math.pow(rng.next(), 0.7); 
        const phi = distFactor * maxPhi * rng.range(0.6, 1.5); // 增加随机范围打破完美圆
        const theta = rng.range(0, Math.PI * 2)
        const normal = new Vector3().setFromSphericalCoords(1, phi, theta)
        
        const isPatch = validGrassPatches.length > 0 && rng.next() > 0.5
        const sourceArray = (isPatch || validGrasses.length === 0) ? validGrassPatches : validGrasses
        if (sourceArray.length === 0) continue

        const modelIndex = Math.floor(rng.range(0, sourceArray.length))
        const originalModel = sourceArray[modelIndex]
        if (!originalModel) continue
        
        // 专门针对 scene.gltf (草皮模型) 调整大小
        // 采用“小块多次”策略：大幅减小单块草皮尺寸，使其更容易贴合球面曲率，避免大块方形模型两端翘起
        // 适当调大一点，避免太小全被置换贴图吞掉
        const baseScale = originalModel.userData.modelName?.includes('scene.gltf') ? 0.15 : 0.01;
        // 距离中心越远 (distFactor越接近1)，草皮尺寸越小，形成柔和过渡
        const edgeSoftness = 1.0 - (distFactor * 0.7); // 中心为1.0，边缘缩水到0.3
        const scale = baseScale * rng.range(0.8, 1.8) * edgeSoftness;
        
        // 尺寸变小后，基座变薄，不能埋太深。设置为0，完全靠模型贴合地表
        placeObject(originalModel, normal, scale, undefined, true, 0.0) 
      }
      
      if (endIndex < independentGrassCount) {
        requestAnimationFrame(() => {
          processGrassBatch(endIndex).then(resolve);
        });
      } else {
        resolve();
      }
    });
  };

  await processGrassBatch(0);

    // 4. 生成花朵 (Flowers) - 上1/5区域
    // 花朵模型已清空，此段逻辑实际上不会执行，保留作为占位
    const flowerCount = 4
    for (let i = 0; i < flowerCount; i++) {
      if (validFlowers.length === 0) break;
      
      // 上1/5区域: y > 0.6
      // y = cos(phi), so phi < acos(0.6) ≈ 0.92
      // 为了更集中在顶部，取 phi [0.1, 0.7]
      // 避免排成一条线：增加随机偏移，并确保 theta 分布均匀
      const phi = rng.range(0.1, 0.7) 
      // 使用更随机的 theta 生成方式，或者确保每次间隔较大
      const theta = rng.range(0, Math.PI * 2) 

      const normal = new Vector3().setFromSphericalCoords(1, phi, theta)
      
      const modelIndex = Math.floor(rng.range(0, validFlowers.length))
      const flowerBase = validFlowers[modelIndex]
      if (!flowerBase) continue
      const originalModel = flowerBase.clone()
      
      // --- 如何调节花朵大小 ---
      // 修改这里的 rng.range(最小值, 最大值) 参数
      // 目前是 0.08 到 0.12，数值越大，花朵越大
      const scale = rng.range(0.08, 0.5)
      
      // 特殊处理花朵材质：区分花瓣和叶子
      // 如果使用 placeObject 会覆盖所有材质，所以这里手动放置
      const clone = originalModel.clone()
      clone.scale.setScalar(scale)
      
      const { pos, quaternion } = getSurfaceTransform(normal, planetRadius)
      clone.position.copy(pos)
      clone.setRotationFromQuaternion(quaternion)
      
      // 1. 随机 Y 轴旋转 (朝向)
      clone.rotateY(rng.range(0, Math.PI * 2))

      // 2. 增加随机倾斜 (弯曲效果)
      // rotateX 和 rotateZ 可以让花朵不那么垂直，产生自然的倾斜
      const tiltAngle = rng.range(0.1, 0.4) // 倾斜角度范围
      const tiltAxis = rng.range(0, Math.PI * 2) // 倾斜方向
      clone.rotateX(Math.cos(tiltAxis) * tiltAngle)
      clone.rotateZ(Math.sin(tiltAxis) * tiltAngle)
      
      clone.visible = true;
      clone.traverse((child: any) => {
        if ((child as Mesh).isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          child.visible = true;
          
          // 尝试根据材质名称区分
          const matName = (child as Mesh).material && ((child as Mesh).material as any).name ? ((child as Mesh).material as any).name.toLowerCase() : '';
          
          if (matName.includes('flower') || matName.includes('petal')) {
             (child as Mesh).material = mats.flowerPetal
          } else {
             // 茎叶使用草的材质
             (child as Mesh).material = mats.grassInstanced
          }
        }
      })
      rocksGroup.add(clone)
    }

    // --- 构建草地的 InstancedMesh ---
    // 为了极大优化性能，将数千个独立的草地 Mesh 转换为少数几个 InstancedMesh 进行实例化渲染
    // 修复草地“闪耀”：将材质从 Standard 降级为 Lambert 或者调整参数。
    // 在这里由于光源旋转和高光反射，大量密集的低多边形网格表面法线跳变会导致严重的高光闪烁 (Specular Aliasing)。
    // 解决方案：使用 MeshLambertMaterial，它不支持高光反射（纯漫反射），完全消除闪烁，并且渲染成本更低！
    const grassMat = new MeshLambertMaterial({
      color: new Color('#3b5e2b'), // 自然的深绿色
      // Lambert 材质不需要 roughness 和 metalness
    });

    grassTransformsMap.forEach((transforms, obj) => {
      const count = transforms.length;
      if (count === 0) return;

      // 提取原始 Group 内部所有 Mesh 的几何体及其相对于 Group 的局部变换
      const meshesInfo: { mesh: Mesh, localMatrix: Matrix4 }[] = [];
      obj.updateWorldMatrix(false, true);
      const inverseRootMatrix = obj.matrixWorld.clone().invert();

      obj.traverse((child: any) => {
        if ((child as Mesh).isMesh) {
          const mesh = child as Mesh;
          mesh.updateWorldMatrix(false, true);
          const localMatrix = mesh.matrixWorld.clone().premultiply(inverseRootMatrix);
          meshesInfo.push({ mesh, localMatrix });
        }
      });

      // 为每个内部的 Mesh 创建对应的 InstancedMesh
      meshesInfo.forEach(({ mesh, localMatrix }) => {
        const instancedMesh = new InstancedMesh(mesh.geometry, grassMat, count);
        // 优化：草地数量极大且本身就是深色，关闭投射和接收阴影可以避免每帧对几百万个像素进行阴影贴图采样
        instancedMesh.castShadow = false;
        instancedMesh.receiveShadow = false;
        
        // 优化：关闭矩阵的每帧自动更新。草地一旦种下就不会乱跑，这能节省极大的 CPU 遍历开销
        instancedMesh.matrixAutoUpdate = false;

        const finalMatrix = new Matrix4();
        for (let i = 0; i < count; i++) {
          finalMatrix.multiplyMatrices(transforms[i], localMatrix);
          instancedMesh.setMatrixAt(i, finalMatrix);
        }
        instancedMesh.instanceMatrix.needsUpdate = true;
        
        // 优化：显式计算包围球，让 Three.js 能够正确进行视锥体裁剪（Frustum Culling）
        instancedMesh.computeBoundingSphere();
        // 但是！在某些老旧设备或极其复杂的 InstancedMesh 上，Three.js 内部的 Frustum Culling 算法
        // 在每一帧检测 1800 个实例是否在视野内时，反而会消耗比直接交给 GPU 渲染更多的 CPU 算力（即所谓的 Culling Overhead）。
        // 如果渲染卡顿主要发生在旋转（相机移动）时，直接关闭剔除，让 GPU 暴力吞吐，往往能解决卡顿。
        instancedMesh.frustumCulled = false;
        
        rocksGroup.add(instancedMesh);
      });
    });

  }).catch(err => {
    console.error("Error in loading models or placing objects:", err);
  });

  // 更新视觉元素：根据天数控制物体的显示/隐藏和缩放
  function updateVisuals() {
    // updateTimeOfDay(timeOfDay)
  }

  // 创建点击反馈粒子
  function createParticle() {
    const geo = new DodecahedronGeometry(0.1, 0)
    const mat = new MeshBasicMaterial({ color: 0xffdd44 })
    const mesh = new Mesh(geo, mat)
    
    // 随机位置（在星球表面附近）
    const phi = Math.random() * Math.PI
    const theta = Math.random() * Math.PI * 2
    const { pos } = getSurfaceTransform(new Vector3().setFromSphericalCoords(1, phi, theta), PLANET_RADIUS_BASE)
    mesh.position.copy(pos.multiplyScalar(1.05)) // 稍微飞起来一点
    
    scene.add(mesh)
    refs.particles.push(Object.assign(mesh, {
      userData: {
        velocity: new Vector3((Math.random()-0.5)*0.05, (Math.random()-0.5)*0.05, (Math.random()-0.5)*0.05),
        life: 1.0
      }
    }))
  }

  function triggerClickFeedback() {
    for(let i=0; i<5; i++) createParticle()
    // 简单的弹跳动画
    if (refs.planetGroup) {
      refs.planetGroup.scale.set(1.05, 1.05, 1.05)
    }
  }

  let rafId: number
  function loop() {
    rafId = window.requestAnimationFrame(loop)
    controls.update()

    // --- 动态调整高光强度 ---
    // 解决近距离观察时高光过曝导致看不清植被的问题
    // 当相机靠近星球时，降低高光强度
    if (refs.lights && refs.lights.spotLight) {
      const dist = camera.position.distanceTo(controls.target); // 假设 target 在原点附近
      // 距离范围: minDistance=5, 默认观察距离~12
      // 映射逻辑: 距离 5 -> 强度 800; 距离 12+ -> 强度 5000
      const minIntensity = 800;
      const maxIntensity = 5000;
      const minDist = 5;
      const maxDist = 12;
      
      const t = Math.min(1, Math.max(0, (dist - minDist) / (maxDist - minDist)));
      // 使用平滑过渡 smoothstep 效果更好
      const smoothT = t * t * (3 - 2 * t); 
      
      refs.lights.spotLight.intensity = minIntensity + smoothT * (maxIntensity - minIntensity);
    }

    // 简单的自转
    planetGroup.rotation.y += 0.0005

    // 简单的回弹动画
    if (refs.planetGroup && refs.planetGroup.scale.x > 1.001) {
      refs.planetGroup.scale.lerp(new Vector3(1, 1, 1), 0.1)
    }

    // 平滑缩放草地
    if (refs.grassMesh && refs.grassMesh.visible) {
      const target = refs.grassMesh.userData.targetScale || 0.01
      refs.grassMesh.scale.lerp(new Vector3(target, target, target), 0.05)
    }

    // 更新粒子
    for (let i = refs.particles.length - 1; i >= 0; i--) {
      const p = refs.particles[i]
      p.position.add(p.userData.velocity)
      p.rotation.x += 0.1
      p.userData.life -= 0.02
      p.material.opacity = p.userData.life
      p.material.transparent = true
      if (p.userData.life <= 0) {
        scene.remove(p)
        refs.particles.splice(i, 1)
      }
    }

    renderer.render(scene, camera)
  }
  
  // 优化：预编译所有的材质和着色器。
  // 在我们真正启动 requestAnimationFrame 循环之前，强制渲染器进行一次空渲染（或称预热）。
  // 这样可以把 getProgramInfoLog 和着色器编译（长达 100-200ms）的操作提前到初始化阶段，
  // 避免在用户第一次看到画面或交互时出现卡顿（消除了 WebGLRenderer.render 首次调用的 Long Task）。
  renderer.compile(scene, camera);

  // 监听窗口大小变化
  const resizeObserver = new ResizeObserver((entries) => {
    const cr = entries[0]?.contentRect
    if (!cr) return
    renderer.setSize(cr.width, cr.height, false)
    camera.aspect = cr.width / Math.max(1, cr.height)
    camera.updateProjectionMatrix()
  })
  resizeObserver.observe(host)

  // 启动
  // updateTimeOfDay(12)
  updateVisuals()
  rafId = window.requestAnimationFrame(loop)

  // 返回外部控制接口
  return {
    setStageIndex(idx: number) {
      // 已废弃，改用 setDayCount
    },
    setDayCount(count: number) {
      if (Math.floor(count) > Math.floor(dayCount)) {
        triggerClickFeedback();
      }
      dayCount = count
      updateVisuals()
    },
    // setTimeOfDay(hour: number) {
    //   updateTimeOfDay(hour)
    // },
    dispose() {
      if (rafId != null) window.cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
      controls.dispose()
      renderer.dispose()
    },
  }
}
