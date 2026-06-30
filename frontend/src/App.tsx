import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import BuilderChat from './pages/BuilderChat'
import AssistantProfile from './pages/AssistantProfile'
import Leads from './pages/Leads'
import CallSimulation from './pages/CallSimulation'
import Meetings from './pages/Meetings'
import './components/UI.css'

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<BuilderChat />} />
          <Route path="profile" element={<AssistantProfile />} />
          <Route path="leads" element={<Leads />} />
          <Route path="call" element={<CallSimulation />} />
          <Route path="meetings" element={<Meetings />} />
        </Route>
      </Routes>
    </AppProvider>
  )
}
