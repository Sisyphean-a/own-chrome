import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../views/JsonToJsPage.vue'),
      meta: {
        title: 'JSON转JS',
        description: '使用JS处理JSON',
        icon: 'mdi-home',
        category: '处理工具',
      },
    },
  ],
})

export default router
