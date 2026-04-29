<template>
  <div class="root">
    <!-- 顶部进度条 -->
    <div
      class="progressBar"
      aria-hidden="true">
      <div
        class="progressFill"
        :style="{ width: `${progressPercent}%` }" />
    </div>

    <!-- 3D 场景容器 -->
    <main class="stage">
      <PlanetCanvas
        ref="canvasRef"
        :stages="store.stages"
        :stage-index="store.stageIndex"
        :day-count="store.value"
        @quality-tier-change="onQualityTierChange" />
    </main>

    <!-- 进度控制面板 (保留用于调试/演示) -->
    <div class="valueControl">
      <div class="valueLabel">
        <span>进度 (Day)</span>
        <span class="valueNumber"
          >{{ Math.round(store.value) }} / {{ store.maxValue }}</span
        >
      </div>
      <input
        class="valueSlider"
        type="range"
        min="0"
        :max="store.maxValue"
        step="1"
        :value="Math.round(store.value)"
        @input="onSlider" />
      <div class="valueActions">
        <button
          class="chip"
          type="button"
          @click="store.toggle()">
          {{ store.playing ? '暂停' : '自动' }}
        </button>
        <button
          class="chip"
          type="button"
          @click="store.reset()">
          重置
        </button>
      </div>
      <PlanetDebugPanel
        :current-day="Math.round(store.value)"
        :max-day="store.maxValue"
        @jump-day="onDebugJump"
        @replay-transition="replayCurrentTransition" />
    </div>

    <!-- 底部 UI：计数器和打卡按钮 -->
    <div class="uiContainer">
      <div class="counterBox">
        Day <span class="dayBig">{{ Math.round(store.value) }}</span>
        <div
          class="stageBadge"
          :class="{ visible: stageBadgeVisible }">
          阶段 {{ romanStage }} : {{ store.stage?.name ?? '—' }}
        </div>
      </div>

      <button
        id="action-btn"
        class="actionBtn"
        type="button"
        @click="checkIn">
        打卡 (+1 Day)
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
const PlanetCanvas = defineAsyncComponent(() => import('@/components/PlanetCanvas.vue'))
const PlanetDebugPanel = defineAsyncComponent(() => import('@/components/PlanetDebugPanel.vue'))
import { useGrowthStore } from '@/stores/growth'
import { usePlanetDebugStore } from '@/stores/planetDebug'

const store = useGrowthStore()
const debugStore = usePlanetDebugStore()
const canvasRef = ref<{
  jumpToDayCount: (dayCount: number) => void
  replayCurrentTransition: () => void
  getQualityTier: () => 'tier-0' | 'tier-1' | 'tier-2'
} | null>(null)

// 控制阶段徽章的动画显示
const stageBadgeVisible = ref(true)
let stageBadgeTimer: number | null = null

// 计算总进度的百分比
const progressPercent = computed(() => {
  if (store.maxValue <= 0) return 0
  return Math.max(0, Math.min(100, (store.value / store.maxValue) * 100))
})

// 将阶段索引转换为罗马数字显示
const romanStage = computed(() => {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']
  return roman[store.stageIndex] ?? `${store.stageIndex + 1}`
})

// 监听阶段变化，触发徽章的淡入淡出动画
watch(
  () => store.stageIndex,
  () => {
    stageBadgeVisible.value = false
    if (stageBadgeTimer != null) window.clearTimeout(stageBadgeTimer)
    stageBadgeTimer = window.setTimeout(() => {
      stageBadgeVisible.value = true
      stageBadgeTimer = null
    }, 220)
  },
)

// 打卡功能：增加1天并暂停自动播放
function checkIn() {
  store.pause()
  store.setValue(Math.round(store.value) + 1)
}

// 进度滑块拖动处理
function onSlider(e: Event) {
  const target = e.target as HTMLInputElement
  const next = Number.parseFloat(target.value)
  store.pause()
  store.setValue(next)
}

function onDebugJump(dayCount: number) {
  store.pause()
  debugStore.setCustomDayCount(dayCount)
  store.setValue(dayCount)
}

function replayCurrentTransition() {
  canvasRef.value?.replayCurrentTransition()
}

function onQualityTierChange(qualityTier: 'tier-0' | 'tier-1' | 'tier-2') {
  debugStore.setQualityTier(qualityTier)
}

// 动画循环逻辑
let rafId: number | null = null
let lastTs = performance.now()

const loop = (ts: number) => {
  rafId = window.requestAnimationFrame(loop)
  const delta = (ts - lastTs) / 1000
  lastTs = ts
  store.tick(delta) // 驱动 Store 的自动增长逻辑
}

onMounted(() => {
  store.installDayCountBridge()
  lastTs = performance.now()
  rafId = window.requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  if (rafId != null) window.cancelAnimationFrame(rafId)
  rafId = null
  if (stageBadgeTimer != null) window.clearTimeout(stageBadgeTimer)
  stageBadgeTimer = null
  store.disposeDayCountBridge()
})
</script>

<style scoped src="./DemoHome.css"></style>
