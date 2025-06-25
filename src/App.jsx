import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import JanusTest from "./components/JanusTest"
import LocalVideo from './components/LocalVideo'
function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <JanusTest></JanusTest>
    </>
  )
}

export default App
