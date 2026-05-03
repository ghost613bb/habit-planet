import { AmbientLight, DirectionalLight, Scene, SpotLight } from 'three'

export function setupLights(scene: Scene) {
  // 1. 环境光：抬高基础亮度，并带一点暖色底子
  const ambientLight = new AmbientLight(0xfff1dc, 0.62)
  scene.add(ambientLight)

  // 2. 主光源：改成更像日落的金暖色，让草地和木屋受光面更通透
  const sunLight = new DirectionalLight(0xffd48f, 1.95)
  sunLight.position.set(10, 9, 7)
  sunLight.castShadow = false
  scene.add(sunLight)

  // 3. 辅助光：保留一点冷暖对比，但降低存在感，避免整体发灰发冷
  const moonLight = new DirectionalLight(0xb8cbff, 0.24)
  moonLight.position.set(-7, 4, -8)
  scene.add(moonLight)

  // 4. 聚光补光：顺着主光方向补一层暖高光，让前景植物和房屋面更亮
  const spotLight = new SpotLight(0xffe7bf, 1900.0)
  spotLight.position.set(10, 9, 7)
  spotLight.target.position.set(0, 0, 0)
  spotLight.angle = Math.PI / 9
  spotLight.penumbra = 0.62
  spotLight.distance = 32
  // 关闭聚光阴影，避免额外渲染负担
  spotLight.castShadow = false
  scene.add(spotLight)
  scene.add(spotLight.target)

  return { ambientLight, sunLight, moonLight, spotLight }
}
