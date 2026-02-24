import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AppProvider } from './contexts/AppContext'
import { MainLayout } from './components/layout/MainLayout'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Sales from './pages/Sales'
import Campaigns from './pages/Campaigns'
import Reports from './pages/Reports'
import FinancialXRay from './pages/FinancialXRay'
import SettingsPage from './pages/Settings'
import { MLCallback } from './pages/MLCallback'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/produtos" element={<Products />} />
            <Route path="/vendas" element={<Sales />} />
            <Route path="/campanhas" element={<Campaigns />} />
            <Route path="/relatorios" element={<Reports />} />
            <Route path="/raio-x" element={<FinancialXRay />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
          </Route>
          <Route path="/callback" element={<MLCallback />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--color-bg-secondary)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
          },
        }}
      />
    </AppProvider>
  )
}
