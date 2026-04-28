import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './hooks/useAuth'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Dens from './pages/Dens'
import Report from './pages/Report'
import Agenda from './pages/Agenda'
import Calendar from './pages/Calendar'
import Contacts from './pages/Contacts'
import Users from './pages/Users'
import CouncilRadar from './pages/CouncilRadar'
import Documents from './pages/Documents'
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
          <Route index element={<Dashboard />} />
          <Route path="dens" element={<Dens />} />
          <Route path="report" element={<Report />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="radar" element={<CouncilRadar />} />
          <Route path="docs" element={<Documents />} />
          <Route path="users" element={<Users />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
