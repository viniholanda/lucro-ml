import { useState, useMemo } from 'react'
import { useApp } from '../contexts/AppContext'
import { formatCurrency, formatPercent, formatDate, generateId, todayISO } from '../utils/formatters'
import type { Campanha } from '../types'
import { Plus, X, Megaphone, Edit2, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import toast from 'react-hot-toast'

export default function Campaigns() {
    const { state, dispatch } = useApp()
    const { campanhas, vendas } = state
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState<Partial<Campanha>>({ nome: '', dataInicio: todayISO(), dataFim: '', investimentoTotal: 0, produtosVinculados: [], status: 'ativa' })

    // Stats per campaign
    const campanhasComStats = useMemo(() =>
        campanhas.map(c => {
            const vendasCampanha = vendas.filter(v => v.campanhaId === c.id)
            const qtdVendas = vendasCampanha.length
            const receita = vendasCampanha.reduce((acc, v) => acc + v.precoEfetivoVenda * v.quantidade, 0)
            const roi = c.investimentoTotal > 0 ? ((receita - c.investimentoTotal) / c.investimentoTotal) * 100 : 0
            const roas = c.investimentoTotal > 0 ? receita / c.investimentoTotal : 0
            return { ...c, qtdVendas, receita, roi, roas }
        }),
        [campanhas, vendas]
    )

    const totais = useMemo(() => ({
        investimento: campanhas.reduce((a, c) => a + c.investimentoTotal, 0),
        receita: campanhasComStats.reduce((a, c) => a + c.receita, 0),
        roiMedio: campanhasComStats.length > 0 ? campanhasComStats.reduce((a, c) => a + c.roi, 0) / campanhasComStats.length : 0,
    }), [campanhas, campanhasComStats])

    // Chart data
    const chartData = useMemo(() =>
        campanhasComStats.map(c => ({ name: c.nome.length > 20 ? c.nome.substring(0, 20) + '...' : c.nome, roi: Math.round(c.roi * 10) / 10 })).sort((a, b) => b.roi - a.roi),
        [campanhasComStats]
    )

    function save() {
        if (!form.nome || !form.investimentoTotal) { toast.error('Preencha os campos obrigatórios!'); return }
        const campanha: Campanha = {
            id: editingId || generateId(), nome: form.nome!, dataInicio: form.dataInicio || todayISO(),
            dataFim: form.dataFim || '', investimentoTotal: form.investimentoTotal || 0,
            produtosVinculados: form.produtosVinculados || [], status: (form.status as Campanha['status']) || 'ativa'
        }
        if (editingId) { dispatch({ type: 'UPDATE_CAMPANHA', payload: campanha }); toast.success('Campanha atualizada!') }
        else { dispatch({ type: 'ADD_CAMPANHA', payload: campanha }); toast.success('Campanha criada!') }
        setShowModal(false)
    }

    function openEdit(c: Campanha) { setForm(c); setEditingId(c.id); setShowModal(true) }
    function openNew() { setForm({ nome: '', dataInicio: todayISO(), dataFim: '', investimentoTotal: 0, produtosVinculados: [], status: 'ativa' }); setEditingId(null); setShowModal(true) }

    return (
        <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Campanhas & Ads</h1>
                    <p className="text-sm text-[var(--color-text-secondary)]">Gerencie seus investimentos em publicidade no Mercado Livre.</p>
                </div>
                <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-green-primary)] text-white hover:brightness-110 transition-all">
                    <Plus size={16} /> Nova Campanha
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Investimento Total', value: formatCurrency(totais.investimento), color: 'yellow' },
                    { label: 'Receita via Ads', value: formatCurrency(totais.receita), color: 'blue' },
                    { label: 'Lucro via Ads', value: formatCurrency(totais.receita - totais.investimento), color: 'green' },
                    { label: 'ROI Médio', value: formatPercent(totais.roiMedio), color: totais.roiMedio > 0 ? 'green' : 'red' },
                ].map((c, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                        <span className="text-xs text-[var(--color-text-muted)] uppercase">{c.label}</span>
                        <p className={`text-xl font-bold mt-1 text-[var(--color-${c.color}-primary)]`}>{c.value}</p>
                    </div>
                ))}
            </div>

            {campanhas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)]">
                    <Megaphone size={48} className="text-[var(--color-text-muted)] mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Nenhuma campanha cadastrada</h3>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-4">Crie sua primeira campanha para rastrear o ROI dos seus anúncios.</p>
                    <button onClick={openNew} className="px-5 py-2.5 bg-[var(--color-green-primary)] text-white rounded-xl font-medium hover:brightness-110 transition-all">Criar Campanha</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Table */}
                    <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-[var(--color-bg-tertiary)]">
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Status</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Campanha</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Invest.</th>
                                        <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">ROI</th>
                                        <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--color-border)]">
                                    {campanhasComStats.map(c => (
                                        <tr key={c.id} className="hover:bg-[var(--color-bg-tertiary)] transition-colors">
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${c.status === 'ativa' ? 'bg-[var(--color-green-primary)]/15 text-[var(--color-green-primary)]' : c.status === 'pausada' ? 'bg-[var(--color-yellow-primary)]/15 text-[var(--color-yellow-primary)]' : 'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]'}`}>
                                                    {c.status === 'ativa' ? 'Ativa' : c.status === 'pausada' ? 'Pausada' : 'Encerrada'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-[var(--color-text-primary)]">{c.nome}</p>
                                                <p className="text-xs text-[var(--color-text-muted)]">{formatDate(c.dataInicio)} {c.dataFim ? `→ ${formatDate(c.dataFim)}` : '→ em andamento'}</p>
                                            </td>
                                            <td className="px-4 py-3 text-right text-[var(--color-text-primary)]">{formatCurrency(c.investimentoTotal)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`px-2 py-1 rounded-md text-xs font-bold ${c.roi > 0 ? 'bg-[var(--color-green-primary)]/15 text-[var(--color-green-primary)]' : 'bg-[var(--color-red-primary)]/15 text-[var(--color-red-primary)]'}`}>
                                                    {formatPercent(c.roi)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-blue-primary)] transition-colors"><Edit2 size={14} /></button>
                                                    <button onClick={() => { dispatch({ type: 'DELETE_CAMPANHA', payload: c.id }); toast.success('Campanha excluída!') }} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-red-primary)] transition-colors"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ROI Chart */}
                    <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-5 min-w-0">
                        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">Comparativo de ROI por Campanha</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                                <XAxis type="number" stroke="var(--color-text-muted)" fontSize={11} tickFormatter={(v: number) => `${v}%`} />
                                <YAxis type="category" dataKey="name" stroke="var(--color-text-muted)" fontSize={11} width={120} />
                                <Tooltip contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 12 }} formatter={(value: any) => formatPercent(value)} />
                                <Bar dataKey="roi" name="ROI %" radius={[0, 6, 6, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={index} fill={entry.roi >= 0 ? '#00A650' : '#EF4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Campaign Form Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
                            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{editingId ? 'Editar Campanha' : 'Nova Campanha'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"><X size={18} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Nome da Campanha *</label>
                                <input value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Data Início</label>
                                    <input type="date" value={form.dataInicio || ''} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Data Fim</label>
                                    <input type="date" value={form.dataFim || ''} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Investimento Total (R$) *</label>
                                <input type="number" step="0.01" value={form.investimentoTotal || ''} onChange={e => setForm(f => ({ ...f, investimentoTotal: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Status</label>
                                <select value={form.status || 'ativa'} onChange={e => setForm(f => ({ ...f, status: e.target.value as Campanha['status'] }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm">
                                    <option value="ativa">Ativa</option>
                                    <option value="pausada">Pausada</option>
                                    <option value="encerrada">Encerrada</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t border-[var(--color-border)]">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)]">Cancelar</button>
                            <button onClick={save} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-green-primary)] text-white hover:brightness-110 transition-all">{editingId ? 'Salvar' : 'Criar Campanha'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
