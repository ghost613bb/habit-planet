import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useGrowthStore } from '@/stores/growth'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)

useGrowthStore(pinia).installDayCountBridge()

app.mount('#app')
