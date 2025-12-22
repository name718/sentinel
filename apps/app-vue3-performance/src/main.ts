import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

let app: any = null

// 独立运行模式
if (!(window as any).__POWERED_BY_QIANKUN__) {
  createApp(App).mount('#app')
}

// qiankun 生命周期
// 初始化
const bootstrap = async () => {
  console.log('vue3-performance app bootstraped')
}

// 挂载
const mount = async (props: any) => {
  const { container } = props
  app = createApp(App)
  app.mount(container ? container.querySelector('#app') : '#app')
}

// 卸载
const unmount = async () => {
  app?.unmount()
  app = null
}

// 暴露生命周期
;(window as any).__MICRO_APP_ENVIRONMENT__ &&
  ((window as any).microApp = {
    bootstrap,
    mount,
    unmount,
  })
