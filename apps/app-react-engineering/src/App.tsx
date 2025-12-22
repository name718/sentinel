import './App.css'

function App() {
  return (
    <div className="app-container">
      <h1 className="app-title">React 工程实验</h1>
      <p className="app-description">这是一个基于 React + Vite 的工程实验子应用</p>
      <div className="app-content">
        <p>当前应用运行模式：<span className="mode">{window.__POWERED_BY_QIANKUN__ ? '微前端模式' : '独立运行模式'}</span></p>
      </div>
    </div>
  )
}

export default App
