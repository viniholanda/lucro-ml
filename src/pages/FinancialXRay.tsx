import { useMemo } from 'react'
import { useApp } from '../contexts/AppContext'
import { calcularLucroPorVenda, calcularLucroUnitarioProduto, calcularPrecoMinimo, calcularPrevisaoFaturamento } from '../utils/calculations'
import { formatCurrency, formatPercent, getDateRange } from '../utils/formatters'
import { DollarSign, TrendingDown, Target, AlertTriangle, Megaphone, TrendingUp } from 'lucide-react'

export default function FinancialXRay() {
    const { state } = useApp()
    const { produtos, vendas, campanhas, settings, periodo } = state
    const { inicio, fim } = getDateRange(periodo)
    const vendasPeriodo = useMemo(() => vendas.filter(v => v.data >= inicio && v.data <= fim), [vendas, inicio, fim])

    // Aggregate data
    const data = useMemo(() => {
        let faturamento = 0, cusProd = 0, taxasML = 0, frete = 0, impostos = 0, ads = 0, devol = 0
        vendasPeriodo.forEach(v => {
            const prod = produtos.find(p => p.id === v.produtoId)
            if (!prod) return
            const b = calcularLucroPorVenda(v, prod, settings, campanhas)
            faturamento += b.receitaBruta
            cusProd += b.custoProdutos
            taxasML += b.totalTaxasML
            frete += b.custoFreteReal
            impostos += b.imposto
            ads += b.custoAdsPorVenda
            devol += b.devolucao
        })
        const custoTotal = cusProd + taxasML + frete + impostos + ads + devol
        const lucro = faturamento - custoTotal
        const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0

        // By product
        const lucroPorProduto: Record<string, { nome: string; lucroTotal: number; margem: number; qtd: number }> = {}
        vendasPeriodo.forEach(v => {
            const prod = produtos.find(p => p.id === v.produtoId)
            if (!prod) return
            const b = calcularLucroPorVenda(v, prod, settings, campanhas)
            if (!lucroPorProduto[v.produtoId]) lucroPorProduto[v.produtoId] = { nome: prod.nome, lucroTotal: 0, margem: 0, qtd: 0 }
            lucroPorProduto[v.produtoId].lucroTotal += b.lucroLiquido
            lucroPorProduto[v.produtoId].qtd += v.quantidade
        })
        Object.values(lucroPorProduto).forEach(p => { p.margem = p.qtd > 0 ? 0 : 0 })

        const topProdutos = Object.values(lucroPorProduto).sort((a, b) => b.lucroTotal - a.lucroTotal).slice(0, 5)
        const prejuizoProdutos = produtos.map(p => ({ ...p, breakdown: calcularLucroUnitarioProduto(p, settings), precoMinimo: calcularPrecoMinimo(p, settings) })).filter(p => p.breakdown.margemPercent < 0)

        // Monthly revenues for forecast
        const now = new Date()
        const faturamentoMensal: number[] = []
        for (let i = 2; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            const fat = vendas.filter(v => v.data.startsWith(mKey)).reduce((a, v) => a + v.precoEfetivoVenda * v.quantidade, 0)
            faturamentoMensal.push(fat)
        }
        const previsao = calcularPrevisaoFaturamento(faturamentoMensal)

        // Ads ROI
        const investAds = campanhas.reduce((a, c) => a + c.investimentoTotal, 0)
        const vendasAds = vendas.filter(v => v.campanhaId).length

        const custoBreakdown = [
            { nome: 'Custo Produtos', valor: cusProd, pct: custoTotal > 0 ? (cusProd / custoTotal) * 100 : 0 },
            { nome: 'Taxas ML', valor: taxasML, pct: custoTotal > 0 ? (taxasML / custoTotal) * 100 : 0 },
            { nome: 'Frete', valor: frete, pct: custoTotal > 0 ? (frete / custoTotal) * 100 : 0 },
            { nome: 'Impostos', valor: impostos, pct: custoTotal > 0 ? (impostos / custoTotal) * 100 : 0 },
            { nome: 'Ads', valor: ads, pct: custoTotal > 0 ? (ads / custoTotal) * 100 : 0 },
            { nome: 'Devoluções', valor: devol, pct: custoTotal > 0 ? (devol / custoTotal) * 100 : 0 },
        ]

        return { faturamento, custoTotal, lucro, margem, topProdutos, prejuizoProdutos, custoBreakdown, previsao, investAds, vendasAds }
    }, [vendasPeriodo, produtos, vendas, campanhas, settings])

    const diasPeriodo = Math.max(1, Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 86400000))

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Raio-X Financeiro</h1>
                <p className="text-sm text-[var(--color-text-secondary)]">Diagnóstico automatizado da saúde financeira do seu negócio.</p>
            </div>

            {/* Top metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-muted)]">Faturamento Bruto</span>
                    <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1">{formatCurrency(data.faturamento)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-muted)]">Lucro Líquido Real</span>
                    <p className={`text-xl font-bold mt-1 ${data.lucro >= 0 ? 'text-[var(--color-green-primary)]' : 'text-[var(--color-red-primary)]'}`}>{formatCurrency(data.lucro)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-muted)]">Margem Média</span>
                    <p className={`text-xl font-bold mt-1 ${data.margem >= settings.metaMargemMinima ? 'text-[var(--color-green-primary)]' : data.margem >= 0 ? 'text-[var(--color-yellow-primary)]' : 'text-[var(--color-red-primary)]'}`}>{formatPercent(data.margem)}</p>
                </div>
                <div className="p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
                    <span className="text-xs text-[var(--color-text-muted)]">Custo Total Op.</span>
                    <p className="text-xl font-bold text-[var(--color-text-primary)] mt-1">{formatCurrency(data.custoTotal)}</p>
                </div>
            </div>

            {/* Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* How much do you really earn? */}
                <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <DollarSign size={20} className="text-[var(--color-green-primary)]" />
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Quanto você realmente ganha?</h3>
                    </div>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                        Você faturou <span className="font-semibold text-[var(--color-text-primary)]">{formatCurrency(data.faturamento)}</span> neste período.
                        Mas depois de TODOS os custos, seu lucro real foi:
                    </p>
                    <div className="relative h-8 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden mb-2">
                        <div className="absolute inset-y-0 left-0 bg-[var(--color-green-primary)] rounded-full flex items-center justify-end pr-3 transition-all duration-1000"
                            style={{ width: `${Math.max(5, data.faturamento > 0 ? (data.lucro / data.faturamento) * 100 : 0)}%` }}>
                            <span className="text-xs font-bold text-white whitespace-nowrap">{formatCurrency(data.lucro)}</span>
                        </div>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                        Isso equivale a <span className="font-semibold text-[var(--color-text-primary)]">{formatCurrency(data.lucro / diasPeriodo)}</span> por dia.
                    </p>
                </div>

                {/* Where is money going? */}
                <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingDown size={20} className="text-[var(--color-red-primary)]" />
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Onde está vazando dinheiro?</h3>
                    </div>
                    <div className="space-y-3">
                        {data.custoBreakdown.filter(c => c.valor > 0).map((c, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-[var(--color-text-secondary)]">{c.nome}</span>
                                    <span className="text-[var(--color-text-primary)] font-medium">{formatCurrency(c.valor)} ({formatPercent(c.pct)})</span>
                                </div>
                                <div className="h-2 bg-[var(--color-bg-tertiary)] rounded-full overflow-hidden">
                                    <div className="h-full bg-[var(--color-blue-primary)] rounded-full transition-all duration-1000" style={{ width: `${c.pct}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Most profitable products */}
                <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Target size={20} className="text-[var(--color-green-primary)]" />
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Qual produto mais dá lucro?</h3>
                    </div>
                    {data.topProdutos.length > 0 ? (
                        <div className="space-y-3">
                            {data.topProdutos.map((p, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-[var(--color-yellow-primary)] text-black' : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)]'}`}>{i + 1}</span>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{p.nome}</p>
                                        <p className="text-xs text-[var(--color-text-muted)]">{p.qtd} un. vendidas</p>
                                    </div>
                                    <span className="text-sm font-bold text-[var(--color-green-primary)]">{formatCurrency(p.lucroTotal)}</span>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-[var(--color-text-muted)]">Nenhuma venda no período.</p>}
                </div>

                {/* Products with loss */}
                <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={20} className="text-[var(--color-red-primary)]" />
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Produtos com prejuízo</h3>
                        {data.prejuizoProdutos.length > 0 && (
                            <span className="px-2 py-1 rounded-md text-xs font-bold bg-[var(--color-red-primary)]/15 text-[var(--color-red-primary)]">
                                {data.prejuizoProdutos.length} produtos
                            </span>
                        )}
                    </div>
                    {data.prejuizoProdutos.length > 0 ? (
                        <div className="space-y-3">
                            {data.prejuizoProdutos.map((p, i) => (
                                <div key={i} className="p-3 rounded-xl bg-[var(--color-red-bg)] border border-[var(--color-red-primary)]/20">
                                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{p.nome}</p>
                                    <p className="text-xs text-[var(--color-red-primary)] font-semibold">Margem: {formatPercent(p.breakdown.margemPercent)}</p>
                                    <p className="text-xs text-[var(--color-text-muted)] mt-1">💡 Preço mínimo para lucrar: <span className="font-semibold text-[var(--color-yellow-primary)]">{formatCurrency(p.precoMinimo)}</span> (atual: {formatCurrency(p.precoVenda)})</p>
                                </div>
                            ))}
                        </div>
                    ) : <p className="text-sm text-[var(--color-green-primary)]">✅ Nenhum produto com margem negativa!</p>}
                </div>

                {/* Ads */}
                <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Megaphone size={20} className="text-[var(--color-blue-primary)]" />
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Seus Ads valem a pena?</h3>
                    </div>
                    {data.investAds > 0 ? (
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">Investimento</span><span className="font-medium text-[var(--color-text-primary)]">{formatCurrency(data.investAds)}</span></div>
                            <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">Vendas atribuídas</span><span className="font-medium text-[var(--color-text-primary)]">{data.vendasAds}</span></div>
                        </div>
                    ) : <p className="text-sm text-[var(--color-text-muted)]">Nenhuma campanha cadastrada.</p>}
                </div>

                {/* Forecast */}
                <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp size={20} className="text-[var(--color-purple-primary)]" />
                        <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Previsão para o próximo mês</h3>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-bg-tertiary)]">
                            <span className="text-xs">📉</span>
                            <div className="flex-1">
                                <p className="text-xs text-[var(--color-text-muted)]">Pessimista</p>
                                <p className="text-sm font-bold text-[var(--color-text-primary)]">{formatCurrency(data.previsao.pessimista)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-green-primary)]/10 border border-[var(--color-green-primary)]/20">
                            <span className="text-xs">📊</span>
                            <div className="flex-1">
                                <p className="text-xs text-[var(--color-text-muted)]">Realista</p>
                                <p className="text-sm font-bold text-[var(--color-green-primary)]">{formatCurrency(data.previsao.realista)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-bg-tertiary)]">
                            <span className="text-xs">📈</span>
                            <div className="flex-1">
                                <p className="text-xs text-[var(--color-text-muted)]">Otimista</p>
                                <p className="text-sm font-bold text-[var(--color-text-primary)]">{formatCurrency(data.previsao.otimista)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
