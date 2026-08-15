import { useState } from 'react'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import './App.css'

export default function App() {
  const [view, setView] = useState('landing')

  if (view === 'login') return <Login onSwitch={setView} />
  if (view === 'signup') return <Signup onSwitch={setView} />

  return <Landing onNavigate={setView} />
}