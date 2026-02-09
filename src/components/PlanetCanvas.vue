<template>
  <div
    ref="host"
    class="host">
    <canvas
      ref="canvas"
      class="canvas" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Stage } from '@/utils/planetRenderer'
import { createPlanetRenderer } from '@/utils/planetRenderer'

// 定义组件 Props
const props = defineProps<{
  stages: Stage[] // 生长阶段配置数据
  stageIndex: number // 当前阶段索引
  dayCount: number // 当前天数/进度
}>()

// 绑定 DOM 元素
const host = ref<HTMLDivElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

// 存储 3D 渲染器实例
let renderer: ReturnType<typeof createPlanetRenderer> | null = null

// 监听天数变化，通知渲染器更新视觉状态（如生长进度）
watch(
  () => props.dayCount,
  (val) => {
    renderer?.setDayCount(val)
  },
)

// 组件挂载时初始化 3D 渲染器
onMounted(() => {
  const hostEl = host.value
  const canvasEl = canvas.value
  if (!hostEl || !canvasEl) return
  renderer = createPlanetRenderer({
    host: hostEl,
    canvas: canvasEl,
    stages: props.stages,
    stageIndex: props.stageIndex,
  })
  // 初始化时同步一次数据
  renderer.setDayCount(props.dayCount)
})

// 组件卸载时销毁渲染器，释放资源
onBeforeUnmount(() => {
  renderer?.dispose()
  renderer = null
})
</script>

<style scoped>
.host {
  position: relative;
  width: 100%;
  height: 100%;
}

.canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
