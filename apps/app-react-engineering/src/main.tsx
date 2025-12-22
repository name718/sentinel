import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

let root: any = null

// 独立运行模式
if (!(window as any).__POWERED_BY_QIANKUN__) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// qiankun 生命周期
// 初始化
const bootstrap = async () => {
  console.log('react-engineering app bootstraped')
}

// 挂载
const mount = async (props: any) => {
  const { container } = props
  root = createRoot(container ? container.querySelector('#root') : document.getElementById('root')!)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

// 卸载
const unmount = async () => {
  root?.unmount()
  root = null
}

// 暴露生命周期
;(window as any).__MICRO_APP_ENVIRONMENT__ &&
  ((window as any).microApp = {
    bootstrap,
    mount,
    unmount,
  })
