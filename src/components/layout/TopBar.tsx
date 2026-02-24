import { useApp } from '../../contexts/AppContext'
import { Menu, Bell, Sun, Moon } from 'lucide-react'
import type { PeriodoFiltro } from '../../types'

const periodos: { value: PeriodoFiltro; label: string }[] = [
    { value: 'hoje', label: 'Hoje' },
    { value: '7dias', label: '7 dias' },
    { value: '30dias', label: '30 dias' },
    { value: '3meses', label: '3 meses' },
    { value: '6meses', label: '6 meses' },
    { value: '12meses', label: '12 meses' },
]

export function TopBar() {
    const { state, dispatch } = useApp()
    const alertasAtivos = state.alertas.filter(a => !a.dispensado).length

    return (
        <header className="h-16 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
            {/* Left: hamburger + period filters */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
                    className="lg:hidden p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                >
                    <Menu size={20} />
                </button>

                {/* Period filters - desktop */}
                <div className="hidden md:flex items-center gap-1 bg-[var(--color-bg-tertiary)] rounded-xl p-1">
                    {periodos.map(p => (
                        <button
                            key={p.value}
                            onClick={() => dispatch({ type: 'SET_PERIODO', payload: p.value })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                ${state.periodo === p.value
                                    ? 'bg-[var(--color-green-primary)] text-white shadow-sm'
                                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Period select - mobile */}
                <select
                    value={state.periodo}
                    onChange={e => dispatch({ type: 'SET_PERIODO', payload: e.target.value as PeriodoFiltro })}
                    className="md:hidden bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] text-sm rounded-lg px-3 py-1.5 border border-[var(--color-border)]"
                >
                    {periodos.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                </select>
            </div>

            {/* Right: theme + notifications */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => dispatch({ type: 'SET_TEMA', payload: state.tema === 'escuro' ? 'claro' : 'escuro' })}
                    className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                >
                    {state.tema === 'escuro' ? <Sun size={18} /> : <Moon size={18} />}
                </button>

                <button className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors relative">
                    <Bell size={18} />
                    {alertasAtivos > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--color-red-primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {alertasAtivos > 9 ? '9+' : alertasAtivos}
                        </span>
                    )}
                </button>
            </div>
        </header>
    )
}
