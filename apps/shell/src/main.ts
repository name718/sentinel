import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { registerMicroApps, start } from 'qiankun'

// 创建 Vue 应用
const app = createApp(App)

// 注册子应用
registerMicroApps([
  {
    name: 'vue3-performance',
    entry: '//localhost:5174',
    container: '#subapp-viewport',
    activeRule: '/vue3-performance',
  },
  {
    name: 'react-engineering',
    entry: '//localhost:5175',
    container: '#subapp-viewport',
    activeRule: '/react-engineering',
  },
])

// 启动 qiankun
start()

// 挂载 Vue 应用
app.mount('#app')
