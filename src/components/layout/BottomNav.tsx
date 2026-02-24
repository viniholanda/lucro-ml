import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, DollarSign, FileText, MoreHorizontal } from 'lucide-react'

const items = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/produtos', label: 'Produtos', icon: Package },
    { path: '/vendas', label: 'Vendas', icon: DollarSign },
    { path: '/relatorios', label: 'Relatórios', icon: FileText },
    { path: '/mais', label: 'Mais', icon: MoreHorizontal },
]

export function BottomNav() {
    const location = useLocation()

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)] flex items-center justify-around px-2 z-30">
            {items.map(item => {
                const isActive = location.pathname === item.path
                return (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors
              ${isActive
                                ? 'text-[var(--color-green-primary)]'
                                : 'text-[var(--color-text-muted)]'
                            }`}
                    >
                        <item.icon size={20} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </NavLink>
                )
            })}
        </nav>
    )
}
