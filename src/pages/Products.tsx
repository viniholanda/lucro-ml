import { useState, useMemo } from 'react'
import { useApp } from '../contexts/AppContext'
import { calcularLucroUnitarioProduto, calcularPrecoMinimo } from '../utils/calculations'
import { formatCurrency, formatPercent, generateId, todayISO } from '../utils/formatters'
import type { Produto } from '../types'
import { Plus, Upload, Edit2, Trash2, Copy, X, Package } from 'lucide-react'
import toast from 'react-hot-toast'

const emptoProduto: Omit<Produto, 'id' | 'dataCadastro'> = {
    sku: '', nome: '', categoria: 'Eletrônicos', precoVenda: 0, custoUnitario: 0,
    custoEmbalagem: 2.50, pesoKg: 0.3, tipoAnuncio: 'premium', usaFull: false,
    aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 0, status: 'ativo',
}

export default function Products() {
    const { state, dispatch } = useApp()
    const { produtos, settings } = state
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [form, setForm] = useState(emptoProduto)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState<string>('todos')
    const [filterMargem, setFilterMargem] = useState<string>('todas')
    const [sortKey, setSortKey] = useState<string>('nome')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

    // Products with calculated fields
    const produtosComCalculo = useMemo(() =>
        produtos.map(p => ({
            ...p,
            breakdown: calcularLucroUnitarioProduto(p, settings),
            precoMinimo: calcularPrecoMinimo(p, settings),
        })),
        [produtos, settings]
    )

    // Filter & sort
    const filtered = useMemo(() => {
        let list = produtosComCalculo
        if (search) {
            const s = search.toLowerCase()
            list = list.filter(p => p.nome.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
        }
        if (filterStatus !== 'todos') list = list.filter(p => p.status === filterStatus)
        if (filterMargem === 'positiva') list = list.filter(p => p.breakdown.margemPercent > 0)
        if (filterMargem === 'negativa') list = list.filter(p => p.breakdown.margemPercent < 0)

        list.sort((a, b) => {
            let va: number | string, vb: number | string
            switch (sortKey) {
                case 'preco': va = a.precoVenda; vb = b.precoVenda; break
                case 'custo': va = a.custoUnitario; vb = b.custoUnitario; break
                case 'lucro': va = a.breakdown.lucroLiquido; vb = b.breakdown.lucroLiquido; break
                case 'margem': va = a.breakdown.margemPercent; vb = b.breakdown.margemPercent; break
                default: va = a.nome.toLowerCase(); vb = b.nome.toLowerCase(); break
            }
            if (va < vb) return sortDir === 'asc' ? -1 : 1
            if (va > vb) return sortDir === 'asc' ? 1 : -1
            return 0
        })
        return list
    }, [produtosComCalculo, search, filterStatus, filterMargem, sortKey, sortDir])

    const negativos = produtosComCalculo.filter(p => p.breakdown.margemPercent < 0).length

    function openNew() {
        setForm({ ...emptoProduto, custoEmbalagem: settings.custoFixoEnvioPadrao, aliquotaImposto: settings.aliquotaImpostoPadrao, tipoAnuncio: settings.tipoAnuncioPadrao })
        setEditingId(null)
        setShowModal(true)
    }
    function openEdit(p: Produto) {
        setForm({ sku: p.sku, nome: p.nome, categoria: p.categoria, precoVenda: p.precoVenda, custoUnitario: p.custoUnitario, custoEmbalagem: p.custoEmbalagem, pesoKg: p.pesoKg, tipoAnuncio: p.tipoAnuncio, usaFull: p.usaFull, aliquotaImposto: p.aliquotaImposto, custoFixoAdicional: p.custoFixoAdicional, percentualDevolucao: p.percentualDevolucao, status: p.status })
        setEditingId(p.id)
        setShowModal(true)
    }
    function duplicate(p: Produto) {
        const newP: Produto = { ...p, id: generateId(), sku: p.sku + '-COPIA', nome: p.nome + ' (Cópia)', dataCadastro: todayISO() }
        dispatch({ type: 'ADD_PRODUTO', payload: newP })
        toast.success('Produto duplicado!')
    }
    function save() {
        if (!form.nome || !form.sku || form.precoVenda <= 0) { toast.error('Preencha os campos obrigatórios!'); return }
        if (editingId) {
            dispatch({ type: 'UPDATE_PRODUTO', payload: { ...form, id: editingId, dataCadastro: produtos.find(p => p.id === editingId)?.dataCadastro || todayISO() } })
            toast.success('Produto atualizado!')
        } else {
            dispatch({ type: 'ADD_PRODUTO', payload: { ...form, id: generateId(), dataCadastro: todayISO() } })
            toast.success('Produto cadastrado!')
        }
        setShowModal(false)
    }
    function deleteProd(id: string) {
        dispatch({ type: 'DELETE_PRODUTO', payload: id })
        setDeleteConfirm(null)
        toast.success('Produto excluído!')
    }

    // Preview calculation for the form
    const preview = useMemo(() => {
        const fakeProd: Produto = { ...form, id: 'preview', dataCadastro: '' }
        return calcularLucroUnitarioProduto(fakeProd, settings)
    }, [form, settings])

    const handleSort = (key: string) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortKey(key); setSortDir('asc') }
    }
    const SortIcon = ({ k }: { k: string }) => sortKey === k ? <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span> : null

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Gerenciamento de Produtos</h1>
                    <p className="text-sm text-[var(--color-text-secondary)]">Analise a rentabilidade e controle seu estoque no Mercado Livre.</p>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-border)] transition-colors">
                        <Upload size={16} /> Importar CSV
                    </button>
                    <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-green-primary)] text-white hover:brightness-110 transition-all">
                        <Plus size={16} /> Novo Produto
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                <input
                    type="text" placeholder="🔍 Buscar por nome ou SKU..." value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="px-4 py-2 rounded-xl text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:ring-1 focus:ring-[var(--color-green-primary)] outline-none w-64"
                />
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 rounded-xl text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)]">
                    <option value="todos">Todos os Status</option>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                </select>
                <select value={filterMargem} onChange={e => setFilterMargem(e.target.value)} className="px-3 py-2 rounded-xl text-sm bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)]">
                    <option value="todas">Todas as Margens</option>
                    <option value="positiva">Margem Positiva</option>
                    <option value="negativa">Margem Negativa</option>
                </select>
                <span className="text-xs text-[var(--color-text-muted)] ml-auto">
                    {filtered.length} produtos{negativos > 0 && <span className="text-[var(--color-red-primary)]"> • {negativos} com margem negativa ⚠️</span>}
                </span>
            </div>

            {/* Empty State */}
            {produtos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Package size={48} className="text-[var(--color-text-muted)] mb-4" />
                    <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Nenhum produto cadastrado</h3>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-4">Cadastre seu primeiro produto para começar a calcular seus lucros.</p>
                    <button onClick={openNew} className="px-5 py-2.5 bg-[var(--color-green-primary)] text-white rounded-xl font-medium hover:brightness-110 transition-all">
                        Cadastrar Produto
                    </button>
                </div>
            ) : (
                /* Table */
                <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-[var(--color-bg-tertiary)]">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer" onClick={() => handleSort('nome')}>Produto <SortIcon k="nome" /></th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer" onClick={() => handleSort('preco')}>Preço <SortIcon k="preco" /></th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer" onClick={() => handleSort('custo')}>Custo <SortIcon k="custo" /></th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Taxas</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer" onClick={() => handleSort('lucro')}>Lucro <SortIcon k="lucro" /></th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider cursor-pointer" onClick={() => handleSort('margem')}>Margem <SortIcon k="margem" /></th>
                                    <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {filtered.map(p => (
                                    <tr key={p.id} className={`hover:bg-[var(--color-bg-tertiary)] transition-colors ${p.breakdown.margemPercent < 0 ? 'bg-[var(--color-red-bg)]' : p.breakdown.margemPercent > 20 ? 'bg-[var(--color-green-bg)]' : ''}`}>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${p.status === 'ativo' ? 'bg-[var(--color-green-primary)]/15 text-[var(--color-green-primary)]' : 'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]'}`}>{p.status === 'ativo' ? 'Ativo' : 'Inativo'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-[var(--color-text-primary)]">{p.nome}</p>
                                            <p className="text-xs text-[var(--color-text-muted)]">{p.sku} • {p.categoria}</p>
                                        </td>
                                        <td className="px-4 py-3 text-right text-[var(--color-text-primary)]">{formatCurrency(p.precoVenda)}</td>
                                        <td className="px-4 py-3 text-right text-[var(--color-text-secondary)]">{formatCurrency(p.custoUnitario)}</td>
                                        <td className="px-4 py-3 text-right text-xs text-[var(--color-text-muted)]">
                                            {formatCurrency(p.breakdown.totalTaxasML)}<br />
                                            <span className="text-[10px]">{p.tipoAnuncio === 'premium' ? 'Premium' : 'Clássico'}</span>
                                        </td>
                                        <td className={`px-4 py-3 text-right font-semibold ${p.breakdown.lucroLiquido >= 0 ? 'text-[var(--color-green-primary)]' : 'text-[var(--color-red-primary)]'}`}>
                                            {formatCurrency(p.breakdown.lucroLiquido)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${p.breakdown.margemPercent > 20 ? 'bg-[var(--color-green-primary)]/15 text-[var(--color-green-primary)]' : p.breakdown.margemPercent > 0 ? 'bg-[var(--color-yellow-primary)]/15 text-[var(--color-yellow-primary)]' : 'bg-[var(--color-red-primary)]/15 text-[var(--color-red-primary)]'}`}>
                                                {formatPercent(p.breakdown.margemPercent)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-blue-primary)] transition-colors"><Edit2 size={14} /></button>
                                                <button onClick={() => duplicate(p)} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"><Copy size={14} /></button>
                                                <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] hover:text-[var(--color-red-primary)] transition-colors"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Product Form Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-5 border-b border-[var(--color-border)]">
                            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">{editingId ? 'Editar Produto' : 'Novo Produto'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]"><X size={18} /></button>
                        </div>
                        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Form fields */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Informações Básicas</h3>
                                <div>
                                    <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Nome do Produto *</label>
                                    <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:ring-1 focus:ring-[var(--color-green-primary)] outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">SKU *</label>
                                        <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:ring-1 focus:ring-[var(--color-green-primary)] outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Categoria</label>
                                        <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm">
                                            {['Eletrônicos', 'Acessórios', 'Casa e Decoração', 'Moda', 'Beleza', 'Esportes', 'Automotivo', 'Brinquedos', 'Informática', 'Ferramentas', 'Outro'].map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide pt-2">Preços e Custos</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Preço de Venda *</label>
                                        <input type="number" step="0.01" value={form.precoVenda || ''} onChange={e => setForm(f => ({ ...f, precoVenda: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:ring-1 focus:ring-[var(--color-green-primary)] outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Custo do Produto *</label>
                                        <input type="number" step="0.01" value={form.custoUnitario || ''} onChange={e => setForm(f => ({ ...f, custoUnitario: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:ring-1 focus:ring-[var(--color-green-primary)] outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Embalagem (R$)</label>
                                        <input type="number" step="0.01" value={form.custoEmbalagem || ''} onChange={e => setForm(f => ({ ...f, custoEmbalagem: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:ring-1 focus:ring-[var(--color-green-primary)] outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Peso (kg)</label>
                                        <input type="number" step="0.01" value={form.pesoKg || ''} onChange={e => setForm(f => ({ ...f, pesoKg: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:ring-1 focus:ring-[var(--color-green-primary)] outline-none" />
                                    </div>
                                </div>

                                <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide pt-2">Configuração de Taxas</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Tipo de Anúncio</label>
                                        <select value={form.tipoAnuncio} onChange={e => setForm(f => ({ ...f, tipoAnuncio: e.target.value as 'classico' | 'premium' }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm">
                                            <option value="classico">Clássico ({settings.taxas.classico}%)</option>
                                            <option value="premium">Premium ({settings.taxas.premium}%)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-[var(--color-text-secondary)] mb-1 block">Imposto (%)</label>
                                        <input type="number" step="0.1" value={form.aliquotaImposto || ''} onChange={e => setForm(f => ({ ...f, aliquotaImposto: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2.5 rounded-lg bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm focus:ring-1 focus:ring-[var(--color-green-primary)] outline-none" />
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.usaFull} onChange={e => setForm(f => ({ ...f, usaFull: e.target.checked }))} className="w-4 h-4 rounded border-[var(--color-border)] accent-[var(--color-green-primary)]" />
                                    <span className="text-sm text-[var(--color-text-secondary)]">Usa Mercado Full (+{formatCurrency(settings.taxas.fullAdicional)}/un.)</span>
                                </label>
                            </div>

                            {/* Preview */}
                            <div className="bg-[var(--color-bg-tertiary)] rounded-xl p-5 border border-[var(--color-border)] h-fit sticky top-4">
                                <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">📊 Simulação de Lucro</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">Receita Bruta</span><span className="text-[var(--color-text-primary)] font-medium">{formatCurrency(preview.receitaBruta)}</span></div>
                                    <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">(-) Taxa ML ({form.tipoAnuncio === 'premium' ? settings.taxas.premium : settings.taxas.classico}%)</span><span className="text-[var(--color-red-primary)]">- {formatCurrency(preview.taxaMLPercent)}</span></div>
                                    <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">(-) Taxa Fixa ML</span><span className="text-[var(--color-red-primary)]">- {formatCurrency(preview.taxaMLFixa)}</span></div>
                                    {preview.taxaFull > 0 && <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">(-) Full</span><span className="text-[var(--color-red-primary)]">- {formatCurrency(preview.taxaFull)}</span></div>}
                                    <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">(-) Frete Estimado</span><span className="text-[var(--color-red-primary)]">- {formatCurrency(preview.custoFreteReal)}</span></div>
                                    <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">(-) Imposto ({form.aliquotaImposto}%)</span><span className="text-[var(--color-red-primary)]">- {formatCurrency(preview.imposto)}</span></div>
                                    <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">(-) Custo Produto</span><span className="text-[var(--color-red-primary)]">- {formatCurrency(preview.custoProdutos)}</span></div>
                                    <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">(-) Embalagem</span><span className="text-[var(--color-red-primary)]">- {formatCurrency(preview.custoFixos)}</span></div>
                                    <hr className="border-[var(--color-border)] my-2" />
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-[var(--color-text-primary)]">💰 Lucro Unitário</span>
                                        <span className={`text-lg font-bold ${preview.lucroLiquido >= 0 ? 'text-[var(--color-green-primary)]' : 'text-[var(--color-red-primary)]'}`}>{formatCurrency(preview.lucroLiquido)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-[var(--color-text-primary)]">📈 Margem</span>
                                        <span className={`font-bold ${preview.margemPercent >= 0 ? 'text-[var(--color-green-primary)]' : 'text-[var(--color-red-primary)]'}`}>{formatPercent(preview.margemPercent)}</span>
                                    </div>
                                    <div className={`text-center py-2 rounded-lg text-sm font-bold mt-2 ${preview.margemPercent > settings.metaMargemMinima ? 'bg-[var(--color-green-primary)]/15 text-[var(--color-green-primary)]' : preview.margemPercent > 0 ? 'bg-[var(--color-yellow-primary)]/15 text-[var(--color-yellow-primary)]' : 'bg-[var(--color-red-primary)]/15 text-[var(--color-red-primary)] pulse-danger'}`}>
                                        {preview.margemPercent > settings.metaMargemMinima ? '✅ SAUDÁVEL' : preview.margemPercent > 0 ? '⚠️ ATENÇÃO' : '🔴 PREJUÍZO'}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 p-5 border-t border-[var(--color-border)]">
                            <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-border)] transition-colors">Cancelar</button>
                            <button onClick={save} className="px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--color-green-primary)] text-white hover:brightness-110 transition-all">{editingId ? 'Salvar Alterações' : 'Cadastrar Produto'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6 max-w-sm w-full">
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-2">Excluir Produto?</h3>
                        <p className="text-sm text-[var(--color-text-secondary)] mb-5">Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] border border-[var(--color-border)]">Cancelar</button>
                            <button onClick={() => deleteProd(deleteConfirm)} className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-red-primary)] text-white hover:brightness-110 transition-all">Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
