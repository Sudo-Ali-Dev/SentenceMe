import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { AuthPage } from './pages/Auth'
import { DashboardPage } from './pages/Dashboard'
import { DailyPracticePage } from './pages/DailyPractice'
import { SundayTestPage } from './pages/SundayTest'
import { AddWordsPage } from './pages/AddWords'
import { SettingsPage } from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="practice" element={<DailyPracticePage />} />
            <Route path="sunday-test" element={<SundayTestPage />} />
            <Route path="add-words" element={<AddWordsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
