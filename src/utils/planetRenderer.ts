import {
  BufferGeometry,
  Color,
  DodecahedronGeometry,
  Float32BufferAttribute,
  FogExp2,
  Group,
  Mesh,
  MeshBasicMaterial,
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
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { TIFFLoader } from 'three/examples/jsm/loaders/TIFFLoader.js'

import { SeededRandom, getSurfaceTransform } from './planet/math/PlanetMath'
import { mats } from './planet/assets/Materials'
import { setupLights } from './planet/core/Lights'

export type { Stage } from './planet/types'

const PLANET_RADIUS_BASE = 3.0

// --- 纹理加载 ---
const textureLoader = new TextureLoader()
const gltfLoader = new GLTFLoader()
const tiffLoader = new TIFFLoader()

// --- 材质定义 ---
// mats 已提取到 ./planet/assets/Materials

// 异步加载 TIFF 贴图
tiffLoader.load('/textures/lroc_color_16bit_srgb_4k.tif', (texture) => {
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  mats.planet.map = texture
  mats.planet.needsUpdate = true
}, undefined, (err) => console.error('Failed to load planet color tiff:', err))

tiffLoader.load('/textures/ldem_16_uint.tif', (texture) => {
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  mats.planet.displacementMap = texture
  mats.planet.needsUpdate = true
}, undefined, (err) => console.error('Failed to load planet displacement tiff:', err))

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
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFSoftShadowMap

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

  const planetGeo = new SphereGeometry(planetRadius, 512, 512) // 提高分段数以支持 displacementMap 细节

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
    for (let i = 0; i < positions.count; i++) {
      v.fromBufferAttribute(positions, i)

      let yScale = baseScaleY
      // 对上半球应用额外的压扁，模拟"顶部平坦"的效果
      // 使用平滑过渡以避免接缝，虽然 y>0 硬切也行，但平滑更好
      if (v.y > 0) {
        yScale *= topFlattenScale
      }
      v.y *= yScale

      positions.setXYZ(i, v.x, v.y, v.z)

      // 手动计算法线以修复接缝问题
      // computeVertexNormals 会导致 UV 接缝处的法线不连续（因为顶点是分离的）
      // 使用椭球体法线公式：(x, y/scale^2, z)
      n.set(v.x, v.y / (yScale * yScale), v.z).normalize()
      normals.setXYZ(i, n.x, n.y, n.z)
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
        gltf.scene.userData.type = 'grass'; // 标记为草
        gltf.scene.userData.modelName = url;
        resolve(gltf.scene)
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
  ]).then(loadedModels => {
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
    const placeObject = (obj: Object3D, normal: Vector3, scale: number, material: any) => {
      const clone = obj.clone()
      clone.scale.setScalar(scale)
      
      const { pos, quaternion } = getSurfaceTransform(normal, planetRadius)
      clone.position.copy(pos)
      clone.setRotationFromQuaternion(quaternion)
      clone.rotateY(rng.range(0, Math.PI * 2))
      
      clone.visible = true;
      clone.traverse((child: any) => {
        if ((child as Mesh).isMesh) {
          child.castShadow = true
          child.receiveShadow = true;
          (child as Mesh).material = material
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
      
      // 在岩石堆附近添加草丛 - 增加数量，使岩石周围更茂密
      const grassInCluster = Math.floor(rng.range(18, 23)) 
      
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
      // 注意：目前 validGrasses 已经为空，下面的循环实际上不会执行，保留作为占位
      for (let k = 0; k < grassInCluster; k++) {
        if (validGrasses.length === 0 && validGrassPatches.length === 0) break;
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
  // 草被模型已清空，此段逻辑实际上不会执行，保留作为占位
  const independentGrassCount = 20
  for (let n = 0; n < independentGrassCount; n++) {
    if (validGrassPatches.length === 0) break;
  }

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
