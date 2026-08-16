import { useState } from 'react'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Infrastructure from './pages/Infrastructure.jsx'
import Dashboard from './pages/Dashboard.jsx'
import './App.css'

export default function App() {
  const [view, setView] = useState('landing')

  if (view === 'login') {
    return <Login onSwitch={setView} />
  }

  if (view === 'signup') {
    return <Signup onSwitch={setView} />
  }

  if (view === 'infrastructure') {
    return <Infrastructure onNavigate={setView} />
  }

  if (view === 'dashboard') {
    return <Dashboard onSwitch={setView} />
  }

  return <Landing onNavigate={setView} />
}