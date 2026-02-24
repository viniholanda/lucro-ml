import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { useApp } from '../../contexts/AppContext'

export function MainLayout() {
    const { state } = useApp()

    return (
        <div className="min-h-screen bg-[var(--color-bg-primary)] flex w-full">
            <Sidebar />
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${state.sidebarOpen ? 'layout-padding-open' : 'layout-padding-closed'}`}>
                <TopBar />
                <main className="flex-1 pb-28 lg:pb-10" style={{ padding: '28px 32px' }}>
                    <Outlet />
                </main>
            </div>
            <BottomNav />
        </div>
    )
}
