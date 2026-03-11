import { AmbientLight, DirectionalLight, SpotLight, Scene, Vector2 } from 'three';

export function setupLights(scene: Scene) {
  // 1. 环境光 (基础亮度)
  const ambientLight = new AmbientLight(0xffffff, 0.4) // 稍微调亮一点环境光
  scene.add(ambientLight)

  // 2. 主光源 (模拟太阳) - 暖色调
  // 调整为更柔和的橙黄色
  const sunLight = new DirectionalLight(0xffce84, 5.5) 
  sunLight.position.set(10, 8, 8)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.width = 2048
  sunLight.shadow.mapSize.height = 2048
  sunLight.shadow.camera.near = 0.5
  sunLight.shadow.camera.far = 50
  sunLight.shadow.camera.left = -10
  sunLight.shadow.camera.right = 10
  sunLight.shadow.camera.top = 10
  sunLight.shadow.camera.bottom = -10
  // 柔化阴影边缘
  sunLight.shadow.radius = 4; // 增加模糊半径
  sunLight.shadow.bias = -0.0001; // 防止阴影条纹
  // PCSS 软阴影通常需要 WebGLRenderer 的特殊配置，但在标准材质下 radius 能起一定作用
  
  scene.add(sunLight)

  // 3. 辅助光 (模拟月光/冷光) - 稍微增强一点，补充阴影细节
  const moonLight = new DirectionalLight(0xaaccff, 0.5)
  moonLight.position.set(-8, 5, -8)
  scene.add(moonLight)

  // 4. 新增：高光 (与主光源对齐，增强立体感)
  // 亮白色，集中照亮受光面
  const spotLight = new SpotLight(0xffe6c1, 5000.0); // 强度高
  spotLight.position.set(10, 8, 8); // 与主光源位置一致，增强高光
  spotLight.target.position.set(0, 0, 0); // 指向星球中心
  spotLight.angle = Math.PI / 14; // 稍微扩大角度，覆盖更多受光面
  spotLight.penumbra = 0.5; // 边缘柔和度
  spotLight.distance = 30; // 增加照射距离
  spotLight.castShadow = true;
  scene.add(spotLight);
  scene.add(spotLight.target); // 必须添加 target 到场景才能生效

  return { ambientLight, sunLight, moonLight, spotLight }
}
