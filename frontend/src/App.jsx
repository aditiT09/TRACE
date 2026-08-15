import { useState } from 'react'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import './App.css'

export default function App() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'

  return mode === 'login' ? <Login onSwitch={setMode} /> : <Signup onSwitch={setMode} />
}
