import { NavLink, useLocation } from 'react-router-dom'
import { useApp } from '../../contexts/AppContext'
import {
    LayoutDashboard, Package, DollarSign, Megaphone,
    FileText, SearchCheck, Settings, ChevronLeft, ChevronRight
} from 'lucide-react'

const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/produtos', label: 'Produtos', icon: Package },
    { path: '/vendas', label: 'Vendas', icon: DollarSign },
    { path: '/campanhas', label: 'Campanhas', icon: Megaphone },
    { path: '/relatorios', label: 'Relatórios', icon: FileText },
    { path: '/raio-x', label: 'Raio-X Financeiro', icon: SearchCheck },
    { path: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
    const { state, dispatch } = useApp()
    const location = useLocation()
    const collapsed = !state.sidebarOpen

    return (
        <>
            {/* Mobile overlay */}
            {state.sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
                />
            )}

            <aside
                className={`fixed top-0 left-0 h-full z-50 flex flex-col border-r transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[72px]' : 'w-[260px]'}
          bg-[var(--color-bg-secondary)] border-[var(--color-border)]
          max-lg:${state.sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0`}
            >
                {/* Logo */}
                <div className={`flex items-center gap-3 px-5 h-16 border-b border-[var(--color-border)] ${collapsed ? 'justify-center px-0' : ''}`}>
                    <div className="w-8 h-8 rounded-lg bg-[var(--color-green-primary)] flex items-center justify-center flex-shrink-0">
                        <DollarSign size={18} className="text-white" />
                    </div>
                    {!collapsed && (
                        <span className="font-bold text-lg text-[var(--color-text-primary)] whitespace-nowrap">
                            Lucro ML
                        </span>
                    )}
                </div>

                {/* Nav Items */}
                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    {navItems.map(item => {
                        const isActive = location.pathname === item.path
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                onClick={() => { if (window.innerWidth < 1024) dispatch({ type: 'TOGGLE_SIDEBAR' }) }}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                  ${isActive
                                        ? 'bg-[var(--color-green-primary)]/10 text-[var(--color-green-primary)]'
                                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]'
                                    }
                  ${collapsed ? 'justify-center px-0' : ''}`}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[var(--color-green-primary)]" />
                                )}
                                <item.icon size={20} className="flex-shrink-0" />
                                {!collapsed && (
                                    <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                                )}
                            </NavLink>
                        )
                    })}
                </nav>

                {/* Collapse Button + Footer */}
                <div className="border-t border-[var(--color-border)] p-3">
                    <button
                        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
                        className="hidden lg:flex w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-[var(--color-text-muted)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
                    >
                        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                        {!collapsed && <span className="text-xs">Colapsar</span>}
                    </button>
                    {!collapsed && (
                        <p className="text-center text-xs text-[var(--color-text-muted)] mt-2">v1.0.0 • MVP</p>
                    )}
                </div>
            </aside>
        </>
    )
}
