import { useState } from 'react'
import { useApp } from '../contexts/AppContext'
import { getDefaultSettings, generateDemoProducts, generateDemoSales, generateDemoCampaigns } from '../utils/demoData'
import { exportBackup, importBackup, clearAllData, downloadFile } from '../utils/storage'
import '../utils/formatters'
import type { Settings } from '../types'
import { Save, Download, Upload, Trash2, Database, Sun, Moon, Link, Unlink, PackageSearch, ShoppingCart, Loader2, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAuthUrl, fetchSellerItems, fetchOrders, fetchShipment, getDefaultRedirectUri } from '../utils/mlApi'
import { mlItemToProduto, mlOrderToVenda } from '../utils/mlMapper'

export default function SettingsPage() {
    const { state, dispatch } = useApp()
    const [settings, setSettings] = useState<Settings>(state.settings)
    const [showClearConfirm, setShowClearConfirm] = useState(false)
    const [clearInput, setClearInput] = useState('')

    // ML Integration State
    const mlCreds = state.settings.mlCredentials
    const isConnected = !!(mlCreds?.accessToken && mlCreds.expiresAt > Date.now())
    const [mlAppId, setMlAppId] = useState(mlCreds?.appId || '')
    const [mlSecret, setMlSecret] = useState(mlCreds?.secretKey || '')
    const [mlLoading, setMlLoading] = useState<'idle' | 'produtos' | 'vendas'>('idle')

    function saveSettings() {
        dispatch({ type: 'SET_SETTINGS', payload: settings })
        toast.success('Configurações salvas!')
    }

    function loadDemoData() {
        const products = generateDemoProducts()
        const sales = generateDemoSales(products)
        const campaigns = generateDemoCampaigns(products)
        dispatch({ type: 'SET_PRODUTOS', payload: products })
        dispatch({ type: 'SET_VENDAS', payload: sales })
        dispatch({ type: 'SET_CAMPANHAS', payload: campaigns })
        dispatch({ type: 'SET_SETTINGS', payload: getDefaultSettings() })
        setSettings(getDefaultSettings())
        toast.success(`Dados carregados: ${products.length} produtos, ${sales.length} vendas, ${campaigns.length} campanhas!`)
    }

    function handleExportBackup() {
        const json = exportBackup()
        downloadFile(json, `lucroml-backup-${new Date().toISOString().split('T')[0]}.json`)
        toast.success('Backup exportado!')
    }

    function handleImportBackup() {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return
            const text = await file.text()
            if (importBackup(text)) {
                window.location.reload()
            } else {
                toast.error('Erro ao importar backup!')
            }
        }
        input.click()
    }

    function handleClear() {
        if (clearInput !== 'CONFIRMAR') { toast.error('Digite CONFIRMAR para limpar os dados.'); return }
        clearAllData()
        window.location.reload()
    }

    function updateTaxa(field: string, value: number) {
        setSettings(s => ({ ...s, taxas: { ...s.taxas, [field]: value } }))
    }

    // --- ML Integration handlers ---

    function handleConnectML() {
        if (!mlAppId.trim() || !mlSecret.trim()) {
            toast.error('Preencha o APP_ID e o SECRET_KEY.')
            return
        }
        // Save credentials first (without tokens) so the callback page can read them
        const partialCreds = { appId: mlAppId.trim(), secretKey: mlSecret.trim(), accessToken: '', refreshToken: '', expiresAt: 0, userId: 0 }
        dispatch({ type: 'SET_SETTINGS', payload: { ...state.settings, mlCredentials: partialCreds } })
        // Redirect to ML auth
        window.location.href = getAuthUrl(mlAppId.trim(), getDefaultRedirectUri())
    }

    function handleDisconnectML() {
        const newSettings = { ...state.settings }
        delete newSettings.mlCredentials
        dispatch({ type: 'SET_SETTINGS', payload: newSettings })
        setMlAppId('')
        setMlSecret('')
        toast.success('Desconectado do Mercado Livre.')
    }

    async function handleImportProdutos() {
        if (!mlCreds) return
        setMlLoading('produtos')
        try {
            const items = await fetchSellerItems(mlCreds, (newCreds) => {
                dispatch({ type: 'SET_SETTINGS', payload: { ...state.settings, mlCredentials: newCreds } })
            })
            const produtos = items.map(mlItemToProduto)
            dispatch({ type: 'MERGE_PRODUTOS', payload: produtos })
            toast.success(`${produtos.length} produto(s) importado(s) do Mercado Livre!`)
        } catch (err: any) {
            toast.error(`Erro ao importar produtos: ${err.message}`)
        } finally {
            setMlLoading('idle')
        }
    }

    async function handleImportVendas() {
        if (!mlCreds) return
        setMlLoading('vendas')
        try {
            // Buscar vendas dos últimos 30 dias
            const hoje = new Date()
            const inicio = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000)
            const dateFrom = inicio.toISOString().split('T')[0]
            const dateTo = hoje.toISOString().split('T')[0]

            const orders = await fetchOrders(mlCreds, dateFrom, dateTo, (newCreds) => {
                dispatch({ type: 'SET_SETTINGS', payload: { ...state.settings, mlCredentials: newCreds } })
            })

            // Map de mlItemId → produtoId para vincular vendas a produtos
            const produtoIdMap = new Map<string, string>()
            state.produtos.forEach(p => { if (p.mlItemId) produtoIdMap.set(p.mlItemId, p.id) })

            const vendas = []
            for (const order of orders) {
                let freteReal = 0
                if (order.shipping?.id) {
                    try {
                        const shipment = await fetchShipment(mlCreds, order.shipping.id)
                        freteReal = shipment.cost || 0
                    } catch { /* ignore */ }
                }
                const venda = mlOrderToVenda(order, freteReal, produtoIdMap)
                if (venda) vendas.push(venda)
            }

            dispatch({ type: 'MERGE_VENDAS', payload: vendas })
            toast.success(`${vendas.length} venda(s) importada(s) do Mercado Livre!`)
        } catch (err: any) {
            toast.error(`Erro ao importar vendas: ${err.message}`)
        } finally {
            setMlLoading('idle')
        }
    }

    return (
        <div className="space-y-5 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Configurações</h1>
                <p className="text-sm text-[var(--color-text-secondary)]">Configure seu perfil e preferências do sistema.</p>
            </div>

            {/* ML Integration */}
            <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">🔗 Integração Mercado Livre</h3>
                    {isConnected ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-[var(--color-green-primary)]">
                            <CheckCircle size={14} /> Conectado (ID: {mlCreds?.userId})
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-xs font-medium text-[var(--color-text-muted)]">
                            <XCircle size={14} /> Desconectado
                        </span>
                    )}
                </div>

                {!isConnected ? (
                    <>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                            Conecte sua conta do Mercado Livre para importar produtos e vendas automaticamente.
                            Crie um app no <a href="https://developers.mercadolivre.com.br/devcenter" target="_blank" rel="noopener noreferrer" className="text-[var(--color-blue-primary)] underline">DevCenter</a> e
                            configure a Redirect URI como <code className="text-[10px] bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 rounded">{getDefaultRedirectUri()}</code>.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">APP_ID (Client ID)</label>
                                <input
                                    value={mlAppId}
                                    onChange={e => setMlAppId(e.target.value)}
                                    placeholder="Ex: 1234567890123456"
                                    className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:ring-1 focus:ring-[var(--color-green-primary)] outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">SECRET_KEY</label>
                                <input
                                    type="password"
                                    value={mlSecret}
                                    onChange={e => setMlSecret(e.target.value)}
                                    placeholder="••••••••••••••••"
                                    className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:ring-1 focus:ring-[var(--color-green-primary)] outline-none"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleConnectML}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-yellow-primary)] text-black hover:brightness-110 transition-all"
                        >
                            <Link size={16} /> Conectar ao Mercado Livre
                        </button>
                    </>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={handleImportProdutos}
                                disabled={mlLoading !== 'idle'}
                                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-[var(--color-blue-primary)] text-white hover:brightness-110 transition-all disabled:opacity-50"
                            >
                                {mlLoading === 'produtos' ? <Loader2 size={16} className="animate-spin" /> : <PackageSearch size={16} />}
                                {mlLoading === 'produtos' ? 'Importando...' : 'Importar Produtos'}
                            </button>
                            <button
                                onClick={handleImportVendas}
                                disabled={mlLoading !== 'idle'}
                                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-[var(--color-green-primary)] text-white hover:brightness-110 transition-all disabled:opacity-50"
                            >
                                {mlLoading === 'vendas' ? <Loader2 size={16} className="animate-spin" /> : <ShoppingCart size={16} />}
                                {mlLoading === 'vendas' ? 'Importando...' : 'Importar Vendas (30 dias)'}
                            </button>
                        </div>
                        <button
                            onClick={handleDisconnectML}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-[var(--color-red-primary)] hover:bg-[var(--color-red-bg)] transition-colors"
                        >
                            <Unlink size={14} /> Desconectar
                        </button>
                    </>
                )}
            </div>

            {/* Store Data */}
            <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6 space-y-4">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Dados da Loja</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Nome da Loja</label>
                        <input value={settings.nomeLoja} onChange={e => setSettings(s => ({ ...s, nomeLoja: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:ring-1 focus:ring-[var(--color-green-primary)] outline-none" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Tipo de Empresa</label>
                        <select value={settings.tipoEmpresa} onChange={e => setSettings(s => ({ ...s, tipoEmpresa: e.target.value as Settings['tipoEmpresa'] }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm">
                            <option value="MEI">MEI</option>
                            <option value="simples_nacional">Simples Nacional</option>
                            <option value="lucro_presumido">Lucro Presumido</option>
                            <option value="lucro_real">Lucro Real</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Meta de Margem Mínima (%)</label>
                        <input type="number" step="0.5" value={settings.metaMargemMinima} onChange={e => setSettings(s => ({ ...s, metaMargemMinima: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Meta de Faturamento Mensal (R$)</label>
                        <input type="number" step="100" value={settings.metaFaturamentoMensal} onChange={e => setSettings(s => ({ ...s, metaFaturamentoMensal: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Alíquota de Imposto Padrão (%)</label>
                        <input type="number" step="0.5" value={settings.aliquotaImpostoPadrao} onChange={e => setSettings(s => ({ ...s, aliquotaImpostoPadrao: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm" />
                    </div>
                    <div>
                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Custo Embalagem Padrão (R$)</label>
                        <input type="number" step="0.10" value={settings.custoFixoEnvioPadrao} onChange={e => setSettings(s => ({ ...s, custoFixoEnvioPadrao: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm" />
                    </div>
                </div>
            </div>

            {/* ML Fees */}
            <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6 space-y-4">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Taxas do Mercado Livre</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[var(--color-border)]">
                                <th className="text-left py-2 text-xs text-[var(--color-text-muted)] uppercase">Tipo de Anúncio</th>
                                <th className="text-center py-2 text-xs text-[var(--color-text-muted)] uppercase">Taxa %</th>
                                <th className="text-center py-2 text-xs text-[var(--color-text-muted)] uppercase">Taxa Fixa</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-[var(--color-border)]">
                                <td className="py-2 text-[var(--color-text-primary)]">Clássico</td>
                                <td className="py-2 text-center">
                                    <input type="number" step="0.5" value={settings.taxas.classico} onChange={e => updateTaxa('classico', parseFloat(e.target.value) || 0)} className="w-20 px-2 py-1.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm text-center" />
                                </td>
                                <td className="py-2 text-center" rowSpan={2}>
                                    <input type="number" step="0.50" value={settings.taxas.taxaFixaPorVenda} onChange={e => updateTaxa('taxaFixaPorVenda', parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm text-center" />
                                </td>
                            </tr>
                            <tr className="border-b border-[var(--color-border)]">
                                <td className="py-2 text-[var(--color-text-primary)]">Premium</td>
                                <td className="py-2 text-center">
                                    <input type="number" step="0.5" value={settings.taxas.premium} onChange={e => updateTaxa('premium', parseFloat(e.target.value) || 0)} className="w-20 px-2 py-1.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm text-center" />
                                </td>
                            </tr>
                            <tr>
                                <td className="py-2 text-[var(--color-text-primary)]">Full (adicional/un.)</td>
                                <td className="py-2 text-center text-[var(--color-text-muted)]">-</td>
                                <td className="py-2 text-center">
                                    <input type="number" step="0.50" value={settings.taxas.fullAdicional} onChange={e => updateTaxa('fullAdicional', parseFloat(e.target.value) || 0)} className="w-24 px-2 py-1.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm text-center" />
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">💡 Essas taxas podem variar por categoria. Configure os valores que se aplicam à sua operação.</p>
            </div>

            {/* Appearance */}
            <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6 space-y-4">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Aparência</h3>
                <div className="flex gap-2">
                    {[
                        { value: 'escuro', label: 'Escuro', icon: Moon },
                        { value: 'claro', label: 'Claro', icon: Sun },
                    ].map(t => (
                        <button
                            key={t.value}
                            onClick={() => dispatch({ type: 'SET_TEMA', payload: t.value as 'escuro' | 'claro' })}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                ${state.tema === t.value
                                    ? 'bg-[var(--color-green-primary)] text-white'
                                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-[var(--color-border)]'
                                }`}
                        >
                            <t.icon size={16} />{t.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Save Button */}
            <button onClick={saveSettings} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium bg-[var(--color-green-primary)] text-white hover:brightness-110 transition-all">
                <Save size={16} /> Salvar Configurações
            </button>

            {/* Data Management */}
            <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6 space-y-4">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider">Dados e Backup</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button onClick={handleExportBackup} className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-[var(--color-blue-primary)] text-white hover:brightness-110 transition-all">
                        <Download size={16} /> Exportar Backup (JSON)
                    </button>
                    <button onClick={handleImportBackup} className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-border)] transition-colors">
                        <Upload size={16} /> Importar Backup (JSON)
                    </button>
                    <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-[var(--color-red-primary)] text-white hover:brightness-110 transition-all">
                        <Trash2 size={16} /> Limpar Todos os Dados
                    </button>
                    <button onClick={loadDemoData} className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-[var(--color-green-primary)] text-white hover:brightness-110 transition-all">
                        <Database size={16} /> Carregar Dados Demo
                    </button>
                </div>
            </div>

            {/* Clear Confirmation Modal */}
            {showClearConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-[var(--color-red-primary)] mb-2">⚠️ Limpar TODOS os dados?</h3>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-4">Esta ação não pode ser desfeita. Todos os produtos, vendas e campanhas serão removidos permanentemente.</p>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-3">Digite <span className="font-bold text-[var(--color-text-primary)]">CONFIRMAR</span> para continuar:</p>
                        <input value={clearInput} onChange={e => setClearInput(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm mb-4" placeholder="CONFIRMAR" />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setShowClearConfirm(false); setClearInput('') }} className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)]">Cancelar</button>
                            <button onClick={handleClear} className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-red-primary)] text-white hover:brightness-110 transition-all">Limpar Tudo</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
