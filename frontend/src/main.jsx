import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './hooks/useAuth'
import Login from './pages/Login'
import Cockpit from './pages/Cockpit'
import Dens from './pages/Dens'
import Report from './pages/Report'
import Agenda from './pages/Agenda'
import Calendar from './pages/Calendar'
import Layout from './components/Layout'
import './index.css'

function PrivateRoute({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Cockpit />} />
          <Route path="dens" element={<Dens />} />
          <Route path="report" element={<Report />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="calendar" element={<Calendar />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
