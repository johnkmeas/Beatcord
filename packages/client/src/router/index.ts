import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'lobby',
      component: () => import('../views/LobbyView.vue'),
    },
    {
      path: '/jam',
      name: 'jam',
      component: () => import('../views/JamView.vue'),
    },
  ],
});
