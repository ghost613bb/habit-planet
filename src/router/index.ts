import { createRouter, createWebHistory } from 'vue-router'

import DemoHome from '@/pages/DemoHome.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'demo',
      component: DemoHome,
    },
  ],
})

export default router
