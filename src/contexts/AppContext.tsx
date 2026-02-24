import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react'
import type { Produto, Venda, Campanha, Settings, Alerta, Tema, PeriodoFiltro } from '../types'
import { loadFromStorage, saveToStorage } from '../utils/storage'
import { getDefaultSettings } from '../utils/demoData'

interface AppState {
    produtos: Produto[]
    vendas: Venda[]
    campanhas: Campanha[]
    settings: Settings
    alertas: Alerta[]
    tema: Tema
    periodo: PeriodoFiltro
    sidebarOpen: boolean
}

type Action =
    | { type: 'SET_PRODUTOS'; payload: Produto[] }
    | { type: 'ADD_PRODUTO'; payload: Produto }
    | { type: 'UPDATE_PRODUTO'; payload: Produto }
    | { type: 'DELETE_PRODUTO'; payload: string }
    | { type: 'SET_VENDAS'; payload: Venda[] }
    | { type: 'ADD_VENDA'; payload: Venda }
    | { type: 'UPDATE_VENDA'; payload: Venda }
    | { type: 'DELETE_VENDA'; payload: string }
    | { type: 'SET_CAMPANHAS'; payload: Campanha[] }
    | { type: 'ADD_CAMPANHA'; payload: Campanha }
    | { type: 'UPDATE_CAMPANHA'; payload: Campanha }
    | { type: 'DELETE_CAMPANHA'; payload: string }
    | { type: 'SET_SETTINGS'; payload: Settings }
    | { type: 'SET_ALERTAS'; payload: Alerta[] }
    | { type: 'DISMISS_ALERTA'; payload: string }
    | { type: 'SET_TEMA'; payload: Tema }
    | { type: 'SET_PERIODO'; payload: PeriodoFiltro }
    | { type: 'TOGGLE_SIDEBAR' }
    | { type: 'LOAD_ALL'; payload: Partial<AppState> }
    | { type: 'MERGE_PRODUTOS'; payload: Produto[] }
    | { type: 'MERGE_VENDAS'; payload: Venda[] }

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'SET_PRODUTOS': return { ...state, produtos: action.payload }
        case 'ADD_PRODUTO': return { ...state, produtos: [...state.produtos, action.payload] }
        case 'UPDATE_PRODUTO': return { ...state, produtos: state.produtos.map(p => p.id === action.payload.id ? action.payload : p) }
        case 'DELETE_PRODUTO': return { ...state, produtos: state.produtos.filter(p => p.id !== action.payload) }
        case 'SET_VENDAS': return { ...state, vendas: action.payload }
        case 'ADD_VENDA': return { ...state, vendas: [action.payload, ...state.vendas] }
        case 'UPDATE_VENDA': return { ...state, vendas: state.vendas.map(v => v.id === action.payload.id ? action.payload : v) }
        case 'DELETE_VENDA': return { ...state, vendas: state.vendas.filter(v => v.id !== action.payload) }
        case 'SET_CAMPANHAS': return { ...state, campanhas: action.payload }
        case 'ADD_CAMPANHA': return { ...state, campanhas: [...state.campanhas, action.payload] }
        case 'UPDATE_CAMPANHA': return { ...state, campanhas: state.campanhas.map(c => c.id === action.payload.id ? action.payload : c) }
        case 'DELETE_CAMPANHA': return { ...state, campanhas: state.campanhas.filter(c => c.id !== action.payload) }
        case 'SET_SETTINGS': return { ...state, settings: action.payload }
        case 'SET_ALERTAS': return { ...state, alertas: action.payload }
        case 'DISMISS_ALERTA': return { ...state, alertas: state.alertas.map(a => a.id === action.payload ? { ...a, dispensado: true } : a) }
        case 'SET_TEMA': return { ...state, tema: action.payload }
        case 'SET_PERIODO': return { ...state, periodo: action.payload }
        case 'TOGGLE_SIDEBAR': return { ...state, sidebarOpen: !state.sidebarOpen }
        case 'LOAD_ALL': return { ...state, ...action.payload }
        case 'MERGE_PRODUTOS': {
            const existingIds = new Set(state.produtos.filter(p => p.mlItemId).map(p => p.mlItemId))
            const novos = action.payload.filter(p => !p.mlItemId || !existingIds.has(p.mlItemId))
            return { ...state, produtos: [...state.produtos, ...novos] }
        }
        case 'MERGE_VENDAS': {
            const existingIds = new Set(state.vendas.filter(v => v.mlOrderId).map(v => v.mlOrderId))
            const novas = action.payload.filter(v => !v.mlOrderId || !existingIds.has(v.mlOrderId))
            return { ...state, vendas: [...novas, ...state.vendas] }
        }
        default: return state
    }
}

const initialState: AppState = {
    produtos: loadFromStorage<Produto[]>('produtos', []),
    vendas: loadFromStorage<Venda[]>('vendas', []),
    campanhas: loadFromStorage<Campanha[]>('campanhas', []),
    settings: loadFromStorage<Settings>('settings', getDefaultSettings()),
    alertas: loadFromStorage<Alerta[]>('alertas', []),
    tema: loadFromStorage<Tema>('tema', 'escuro'),
    periodo: '30dias',
    sidebarOpen: true,
}

const AppContext = createContext<{
    state: AppState
    dispatch: React.Dispatch<Action>
}>({
    state: initialState,
    dispatch: () => null,
})

export function AppProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState)

    // Persist to localStorage
    useEffect(() => { saveToStorage('produtos', state.produtos) }, [state.produtos])
    useEffect(() => { saveToStorage('vendas', state.vendas) }, [state.vendas])
    useEffect(() => { saveToStorage('campanhas', state.campanhas) }, [state.campanhas])
    useEffect(() => { saveToStorage('settings', state.settings) }, [state.settings])
    useEffect(() => { saveToStorage('alertas', state.alertas) }, [state.alertas])
    useEffect(() => { saveToStorage('tema', state.tema) }, [state.tema])

    // Apply theme
    useEffect(() => {
        const root = document.documentElement
        if (state.tema === 'claro') {
            root.classList.add('light')
        } else {
            root.classList.remove('light')
        }
    }, [state.tema])

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    return useContext(AppContext)
}
