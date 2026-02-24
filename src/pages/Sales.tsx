import { useState, useMemo } from 'react'
import { useApp } from '../contexts/AppContext'
import { calcularLucroPorVenda } from '../utils/calculations'
import { formatCurrency, formatPercent, formatDate, generateId, todayISO, getDateRange } from '../utils/formatters'
import type { Venda } from '../types'
import { Plus, Upload, X, ShoppingCart, DollarSign, TrendingUp, RotateCcw, Trophy, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Sales() {
    const { state, dispatch } = useApp()
    const { produtos, vendas, campanhas, settings, periodo } = state
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState<Partial<Venda>>({ data: todayISO(), produtoId: '', quantidade: 1, precoEfetivoVenda: 0, custoFreteReal: 0, teveDevolucao: false, custoDevolucao: 0, observacoes: '' })
    const [filterProduto, setFilterProduto] = useState('')
    const [filterMargem, setFilterMargem] = useState('todas')

    const { inicio, fim } = getDateRange(periodo)
    const vendasPeriodo = useMemo(() => vendas.filter(v => v.data >= inicio && v.data <= fim), [vendas, inicio, fim])

    // Metrics
    const metricas = useMemo(() => {
        let receita = 0, lucro = 0, devolucoes = 0
        vendasPeriodo.forEach(v => {
            const prod = produtos.find(p => p.id === v.produtoId)
            if (!prod) return
            const b = calcularLucroPorVenda(v, prod, settings, campanhas)
            receita += b.receitaBruta
            lucro += b.lucroLiquido
            if (v.teveDevolucao) devolucoes++
        })
        return { total: vendasPeriodo.length, receita, lucro, devolucoes, taxaDevolucao: vendasPeriodo.length > 0 ? (devolucoes / vendasPeriodo.length) * 100 : 0 }
    }, [vendasPeriodo, produtos, settings, campanhas])

    // Insights
    const insights = useMemo(() => {
        const lucroPorProduto: Record<string, { nome: string; lucro: number; vendas: number; devolucoes: number }> = {}
        vendasPeriodo.forEach(v => {
            const prod = produtos.find(p => p.id === v.produtoId)
            if (!prod) return
            const b = calcularLucroPorVenda(v, prod, settings, campanhas)
            if (!lucroPorProduto[v.produtoId]) lucroPorProduto[v.produtoId] = { nome: prod.nome, lucro: 0, vendas: 0, devolucoes: 0 }
            lucroPorProduto[v.produtoId].lucro += b.lucroLiquido
            lucroPorProduto[v.produtoId].vendas += v.quantidade
            if (v.teveDevolucao) lucroPorProduto[v.produtoId].devolucoes++
        })
        const entries = Object.values(lucroPorProduto)
        const maisVendido = entries.sort((a, b) => b.vendas - a.vendas)[0]
        const maisLucrativo = entries.sort((a, b) => b.lucro - a.lucro)[0]
        const maiorPrejuizo = entries.sort((a, b) => a.lucro - b.lucro)[0]
        return { maisVendido, maisLucrativo, maiorPrejuizo }
    }, [vendasPeriodo, produtos, settings, campanhas])

    // Filtered sales with calculations
    const vendasDisplay = useMemo(() => {
        let list = vendasPeriodo.map(v => {
            const prod = produtos.find(p => p.id === v.produtoId)
            const breakdown = prod ? calcularLucroPorVenda(v, prod, settings, campanhas) : null
            return { ...v, prodNome: prod?.nome || 'Desconhecido', breakdown }
        })
        if (filterProduto) list = list.filter(v => v.produtoId === filterProduto)
        if (filterMargem === 'positiva') list = list.filter(v => v.breakdown && v.breakdown.margemPercent > 0)
        if (filterMargem === 'negativa') list = list.filter(v => v.breakdown && v.breakdown.margemPercent < 0)
        return list
    }, [vendasPeriodo, produtos, settings, campanhas, filterProduto, filterMargem])

    function selectProduto(prodId: string) {
        const prod = produtos.find(p => p.id === prodId)
        setForm(f => ({ ...f, produtoId: prodId, precoEfetivoVenda: prod?.precoVenda || 0, custoFreteReal: 15 }))
    }

    function save() {
        if (!form.produtoId || !form.precoEfetivoVenda) { toast.error('Selecione um produto!'); return }
        const venda: Venda = {
            id: generateId(), data: form.data || todayISO(), produtoId: form.produtoId,
            quantidade: form.quantidade || 1, precoEfetivoVenda: form.precoEfetivoVenda || 0,
            custoFreteReal: form.custoFreteReal || 0, teveDevolucao: form.teveDevolucao || false,
            custoDevolucao: form.custoDevolucao || 0, observacoes: form.observacoes || '',
        }
        const prod = produtos.find(p => p.id === venda.produtoId)
        dispatch({ type: 'ADD_VENDA', payload: venda })
        const b = prod ? calcularLucroPorVenda(venda, prod, settings, campanhas) : null
        toast.success(`Venda registrada! ${b ? `Lucro: ${formatCurrency(b.lucroLiquido)} (${formatPercent(b.margemPercent)})` : ''}`)
        setShowModal(false)
        setForm({ data: todayISO(), produtoId: '', quantidade: 1, precoEfetivoVenda: 0, custoFreteReal: 0, teveDevolucao: false, custoDevolucao: 0, observacoes: '' })
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Gestão de Vendas</h1>
                    <p className="text-sm text-[var(--color-text-secondary)]">Registre e acompanhe suas vendas no Mercado Livre.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
                        <Upload size={16} /> Importar CSV
                    </button>
                    <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-green-primary)] text-white hover:brightness-110 transition-all">
                        <Plus size={16} /> Nova Venda
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Vendas no Período', value: metricas.total, icon: ShoppingCart, color: 'blue' },
                    { label: 'Receita', value: formatCurrency(metricas.receita), icon: DollarSign, color: 'blue' },
                    { label: 'Lucro', value: formatCurrency(metricas.lucro), icon: TrendingUp, color: 'green' },
                    { label: 'Devoluções', value: `${metricas.devolucoes} (${formatPercent(metricas.taxaDevolucao)})`, icon: RotateCcw, color: 'red' },
                ].map((c, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                        <div className="flex items-center gap-2 mb-2">
                            <c.icon size={16} className={`text-[var(--color-${c.color}-primary)]`} />
                            <span className="text-xs text-[var(--color-text-muted)] uppercase">{c.label}</span>
                        </div>
                        <p className="text-xl font-bold text-[var(--color-text-primary)]">{c.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-5">
                {/* Main table area */}
                <div className="flex-1 space-y-3 min-w-0">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-2">
                        <select value={filterProduto} onChange={e => setFilterProduto(e.target.value)} className="px-3 py-2 rounded-xl text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)]">
                            <option value="">Todos os Produtos</option>
                            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                        </select>
                        <select value={filterMargem} onChange={e => setFilterMargem(e.target.value)} className="px-3 py-2 rounded-xl text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)]">
                            <option value="todas">Todas as Margens</option>
                            <option value="positiva">Positiva</option>
                            <option value="negativa">Negativa</option>
                        </select>
                    </div>

                    {vendas.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)]">
                            <ShoppingCart size={48} className="text-[var(--color-text-muted)] mb-4" />
                            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Nenhuma venda registrada</h3>
                            <p className="text-sm text-[var(--color-text-secondary)] mb-4">Registre sua primeira venda para ver seus lucros.</p>
                            <button onClick={() => setShowModal(true)} className="px-5 py-2.5 bg-[var(--color-green-primary)] text-white rounded-xl font-medium hover:brightness-110 transition-all">Registrar Venda</button>
                        </div>
                    ) : (
                        <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-[var(--color-bg-tertiary)]">
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Data</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Produto</th>
                                            <th className="text-center px-3 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Qtd</th>
                                            <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Receita</th>
                                            <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Custos</th>
                                            <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Lucro</th>
                                            <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Margem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border)]">
                                        {vendasDisplay.slice(0, 50).map(v => (
                                            <tr key={v.id} className={`hover:bg-[var(--color-bg-tertiary)] transition-colors ${v.breakdown && v.breakdown.margemPercent < 0 ? 'bg-[var(--color-red-bg)]' : ''}`}>
                                                <td className="px-4 py-3 text-[var(--color-text-secondary)]">{formatDate(v.data)}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[var(--color-text-primary)]">{v.prodNome}</span>
                                                    {v.teveDevolucao && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-[var(--color-red-primary)]/15 text-[var(--color-red-primary)] rounded-md font-medium">DEVOLUÇÃO</span>}
                                                </td>
                                                <td className="px-3 py-3 text-center text-[var(--color-text-secondary)]">{v.quantidade}</td>
                                                <td className="px-4 py-3 text-right text-[var(--color-text-primary)]">{v.breakdown ? formatCurrency(v.breakdown.receitaBruta) : '-'}</td>
                                                <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">{v.breakdown ? formatCurrency(v.breakdown.custoTotal) : '-'}</td>
                                                <td className={`px-4 py-3 text-right font-semibold ${v.breakdown && v.breakdown.lucroLiquido >= 0 ? 'text-[var(--color-green-primary)]' : 'text-[var(--color-red-primary)]'}`}>
                                                    {v.breakdown ? formatCurrency(v.breakdown.lucroLiquido) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    {v.breakdown && (
                                                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${v.breakdown.margemPercent > 20 ? 'bg-[var(--color-green-primary)]/15 text-[var(--color-green-primary)]' : v.breakdown.margemPercent > 0 ? 'bg-[var(--color-yellow-primary)]/15 text-[var(--color-yellow-primary)]' : 'bg-[var(--color-red-primary)]/15 text-[var(--color-red-primary)]'}`}>
                                                            {formatPercent(v.breakdown.margemPercent)}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-4 py-3 border-t border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-xs text-[var(--color-text-muted)] flex justify-between">
                                <span>Total: {formatCurrency(metricas.receita)} receita | {formatCurrency(metricas.lucro)} lucro</span>
                                <span>{vendasDisplay.length} vendas</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Insights sidebar */}
                {vendas.length > 0 && (
                    <div className="lg:w-72 space-y-3">
                        <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-5 space-y-4">
                            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">📊 Insights do Período</h3>
                            {insights.maisVendido && (
                                <div className="flex items-start gap-3"><Trophy size={16} className="text-[var(--color-yellow-primary)] mt-0.5 flex-shrink-0" /><div><p className="text-xs text-[var(--color-text-muted)]">Mais Vendido</p><p className="text-sm font-medium text-[var(--color-text-primary)]">{insights.maisVendido.nome}</p><p className="text-xs text-[var(--color-text-secondary)]">{insights.maisVendido.vendas} un.</p></div></div>
                            )}
                            {insights.maisLucrativo && (
                                <div className="flex items-start gap-3"><DollarSign size={16} className="text-[var(--color-green-primary)] mt-0.5 flex-shrink-0" /><div><p className="text-xs text-[var(--color-text-muted)]">Mais Lucrativo</p><p className="text-sm font-medium text-[var(--color-text-primary)]">{insights.maisLucrativo.nome}</p><p className="text-xs text-[var(--color-green-primary)]">{formatCurrency(insights.maisLucrativo.lucro)}</p></div></div>
                            )}
                            {insights.maiorPrejuizo && insights.maiorPrejuizo.lucro < 0 && (
                                <div className="flex items-start gap-3"><AlertTriangle size={16} className="text-[var(--color-red-primary)] mt-0.5 flex-shrink-0" /><div><p className="text-xs text-[var(--color-text-muted)]">Maior Prejuízo</p><p className="text-sm font-medium text-[var(--color-text-primary)]">{insights.maiorPrejuizo.nome}</p><p className="text-xs text-[var(--color-red-primary)]">{formatCurrency(insights.maiorPrejuizo.lucro)}</p></div></div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Sale Form Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
                            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Nova Venda</h2>
                            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"><X size={18} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Data *</label>
                                    <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Quantidade</label>
                                    <input type="number" min="1" value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: parseInt(e.target.value) || 1 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Produto *</label>
                                <select value={form.produtoId} onChange={e => selectProduto(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm">
                                    <option value="">Selecione um produto...</option>
                                    {produtos.filter(p => p.status === 'ativo').map(p => <option key={p.id} value={p.id}>{p.nome} ({formatCurrency(p.precoVenda)})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Preço Efetivo (R$)</label>
                                    <input type="number" step="0.01" value={form.precoEfetivoVenda || ''} onChange={e => setForm(f => ({ ...f, precoEfetivoVenda: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Frete Real (R$)</label>
                                    <input type="number" step="0.01" value={form.custoFreteReal || ''} onChange={e => setForm(f => ({ ...f, custoFreteReal: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm" />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.teveDevolucao} onChange={e => setForm(f => ({ ...f, teveDevolucao: e.target.checked }))} className="w-4 h-4 rounded border-[var(--color-border)] accent-[var(--color-green-primary)]" />
                                <span className="text-sm text-[var(--color-text-secondary)]">Teve devolução?</span>
                            </label>
                            {form.teveDevolucao && (
                                <div>
                                    <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Custo da Devolução (R$)</label>
                                    <input type="number" step="0.01" value={form.custoDevolucao || ''} onChange={e => setForm(f => ({ ...f, custoDevolucao: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm" />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t border-[var(--color-border)]">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)]">Cancelar</button>
                            <button onClick={save} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-green-primary)] text-white hover:brightness-110 transition-all">Registrar Venda</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
