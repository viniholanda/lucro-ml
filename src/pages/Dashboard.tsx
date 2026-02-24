import { useMemo } from 'react'
import { useApp } from '../contexts/AppContext'
import { calcularLucroPorVenda } from '../utils/calculations'
import { formatCurrency, formatPercent, formatNumber, getDateRange, getMonthName } from '../utils/formatters'
import {
    DollarSign, TrendingDown, Wallet, Percent,
    ShoppingCart, Receipt, Target, RotateCcw
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell, ReferenceLine
} from 'recharts'

export default function Dashboard() {
    const { state } = useApp()
    const { produtos, vendas, campanhas, settings, periodo } = state

    const { inicio, fim } = getDateRange(periodo)
    const vendasPeriodo = useMemo(() =>
        vendas.filter(v => v.data >= inicio && v.data <= fim),
        [vendas, inicio, fim]
    )

    // Calculate previous period for comparison
    const diasPeriodo = Math.max(1, Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 86400000))
    const inicioAnterior = new Date(new Date(inicio).getTime() - diasPeriodo * 86400000).toISOString().split('T')[0]
    const vendasAnterior = useMemo(() =>
        vendas.filter(v => v.data >= inicioAnterior && v.data < inicio),
        [vendas, inicioAnterior, inicio]
    )

    // Metrics
    const metricas = useMemo(() => {
        let faturamento = 0, custos = 0, totalVendas = vendasPeriodo.length, devolucoes = 0
        vendasPeriodo.forEach(v => {
            const prod = produtos.find(p => p.id === v.produtoId)
            if (!prod) return
            const b = calcularLucroPorVenda(v, prod, settings, campanhas)
            faturamento += b.receitaBruta
            custos += b.custoTotal
            if (v.teveDevolucao) devolucoes++
        })
        const lucro = faturamento - custos
        const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0
        const ticket = totalVendas > 0 ? faturamento / totalVendas : 0
        const roi = custos > 0 ? (lucro / custos) * 100 : 0
        const taxaDevolucao = totalVendas > 0 ? (devolucoes / totalVendas) * 100 : 0

        // Previous period
        let faturamentoAnt = 0, custosAnt = 0
        vendasAnterior.forEach(v => {
            const prod = produtos.find(p => p.id === v.produtoId)
            if (!prod) return
            const b = calcularLucroPorVenda(v, prod, settings, campanhas)
            faturamentoAnt += b.receitaBruta
            custosAnt += b.custoTotal
        })
        const lucroAnt = faturamentoAnt - custosAnt
        const margemAnt = faturamentoAnt > 0 ? (lucroAnt / faturamentoAnt) * 100 : 0

        const pctChange = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev) * 100 : 0

        return [
            { label: 'Faturamento Bruto', value: formatCurrency(faturamento), icon: DollarSign, change: pctChange(faturamento, faturamentoAnt), color: 'blue' },
            { label: 'Custos Totais', value: formatCurrency(custos), icon: TrendingDown, change: pctChange(custos, custosAnt), color: 'red', invertChange: true },
            { label: 'Lucro Líquido Real', value: formatCurrency(lucro), icon: Wallet, change: pctChange(lucro, lucroAnt), color: 'green', highlight: true },
            { label: 'Margem Líquida', value: formatPercent(margem), icon: Percent, change: margem - margemAnt, color: margem < 0 ? 'red' : margem < settings.metaMargemMinima ? 'yellow' : 'green' },
            { label: 'Total de Vendas', value: formatNumber(totalVendas), icon: ShoppingCart, change: pctChange(totalVendas, vendasAnterior.length), color: 'blue' },
            { label: 'Ticket Médio', value: formatCurrency(ticket), icon: Receipt, change: 0, color: 'blue' },
            { label: 'ROI Geral', value: formatPercent(roi), icon: Target, change: 0, color: 'green' },
            { label: 'Taxa de Devolução', value: formatPercent(taxaDevolucao), icon: RotateCcw, change: 0, color: taxaDevolucao > 10 ? 'red' : 'yellow', invertChange: true },
        ]
    }, [vendasPeriodo, vendasAnterior, produtos, settings, campanhas])

    // Monthly chart data
    const monthlyData = useMemo(() => {
        const months: Record<string, { faturamento: number; custos: number; lucro: number; margem: number }> = {}
        const now = new Date()
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            months[key] = { faturamento: 0, custos: 0, lucro: 0, margem: 0 }
        }
        vendas.forEach(v => {
            const key = v.data.substring(0, 7)
            if (!months[key]) return
            const prod = produtos.find(p => p.id === v.produtoId)
            if (!prod) return
            const b = calcularLucroPorVenda(v, prod, settings, campanhas)
            months[key].faturamento += b.receitaBruta
            months[key].custos += b.custoTotal
        })
        return Object.entries(months).map(([key, data]) => {
            data.lucro = data.faturamento - data.custos
            data.margem = data.faturamento > 0 ? (data.lucro / data.faturamento) * 100 : 0
            return { mes: getMonthName(parseInt(key.split('-')[1]) - 1), ...data }
        })
    }, [vendas, produtos, settings, campanhas])

    // Costs breakdown for donut chart
    const custosBreakdown = useMemo(() => {
        let cusProd = 0, taxasML = 0, frete = 0, impostos = 0, ads = 0, devol = 0
        vendasPeriodo.forEach(v => {
            const prod = produtos.find(p => p.id === v.produtoId)
            if (!prod) return
            const b = calcularLucroPorVenda(v, prod, settings, campanhas)
            cusProd += b.custoProdutos
            taxasML += b.totalTaxasML
            frete += b.custoFreteReal
            impostos += b.imposto
            ads += b.custoAdsPorVenda
            devol += b.devolucao
        })
        return [
            { name: 'Custo Produto', value: cusProd, color: '#6366F1' },
            { name: 'Taxas ML', value: taxasML, color: '#F59E0B' },
            { name: 'Frete', value: frete, color: '#3B82F6' },
            { name: 'Impostos', value: impostos, color: '#EF4444' },
            { name: 'Ads', value: ads, color: '#EC4899' },
            { name: 'Devoluções', value: devol, color: '#78716C' },
        ].filter(item => item.value > 0)
    }, [vendasPeriodo, produtos, settings, campanhas])

    // Weekday data
    const weekdayData = useMemo(() => {
        const days = [0, 0, 0, 0, 0, 0, 0]
        vendasPeriodo.forEach(v => {
            const d = new Date(v.data + 'T00:00:00')
            days[d.getDay()] += v.quantidade
        })
        const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
        const max = Math.max(...days)
        return names.map((name, i) => ({ name, vendas: days[i], opacity: max > 0 ? 0.3 + (days[i] / max) * 0.7 : 0.3 }))
    }, [vendasPeriodo])

    const colorMap: Record<string, string> = {
        blue: 'var(--color-blue-primary)', red: 'var(--color-red-primary)',
        green: 'var(--color-green-primary)', yellow: 'var(--color-yellow-primary)',
    }

    const emptyState = produtos.length === 0

    if (emptyState) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                <div className="w-20 h-20 rounded-2xl bg-[var(--color-green-primary)]/10 flex items-center justify-center mb-6">
                    <DollarSign size={40} className="text-[var(--color-green-primary)]" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Bem-vindo ao Lucro ML!</h2>
                <p className="text-[var(--color-text-secondary)] mb-6 max-w-md">
                    Comece cadastrando seus produtos ou carregue dados de demonstração nas Configurações.
                </p>
                <div className="flex gap-3">
                    <a href="/produtos" className="px-5 py-2.5 bg-[var(--color-green-primary)] text-white rounded-xl font-medium hover:brightness-110 transition-all">
                        Cadastrar Produto
                    </a>
                    <a href="/configuracoes" className="px-5 py-2.5 bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] rounded-xl font-medium border border-[var(--color-border)] hover:bg-[var(--color-border)] transition-all">
                        Dados de Demonstração
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {metricas.map((m, i) => (
                    <div
                        key={i}
                        className={`p-4 lg:p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg
              bg-[var(--color-bg-secondary)] border-[var(--color-border)]
              ${m.highlight ? 'ring-1 ring-[var(--color-green-primary)]/50 shadow-[0_0_15px_rgba(0,166,80,0.1)]' : ''}`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">{m.label}</span>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${colorMap[m.color]}15` }}>
                                <m.icon size={16} style={{ color: colorMap[m.color] }} />
                            </div>
                        </div>
                        <p className="text-xl lg:text-2xl font-bold text-[var(--color-text-primary)] mb-1">{m.value}</p>
                        {m.change !== 0 && (
                            <span className={`text-xs font-medium ${m.change > 0 ? (m.invertChange ? 'text-[var(--color-red-primary)]' : 'text-[var(--color-green-light)]') : (m.invertChange ? 'text-[var(--color-green-light)]' : 'text-[var(--color-red-primary)]')}`}>
                                {m.change > 0 ? '↑' : '↓'} {formatPercent(Math.abs(m.change))} vs anterior
                            </span>
                        )}
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                {/* Revenue vs Costs vs Profit */}
                <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-5 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Faturamento vs Custos vs Lucro</h3>
                    <p className="text-xs text-[var(--color-text-muted)] mb-4">Últimos 12 meses</p>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="mes" stroke="var(--color-text-muted)" fontSize={11} />
                            <YAxis stroke="var(--color-text-muted)" fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                            <Tooltip
                                contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 12 }}
                                formatter={(value: any) => formatCurrency(value)}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="faturamento" name="Faturamento" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="custos" name="Custos" fill="#EF4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="lucro" name="Lucro" fill="#00A650" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Margin Evolution */}
                <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-5 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Evolução da Margem Líquida %</h3>
                    <p className="text-xs text-[var(--color-text-muted)] mb-4">Últimos 12 meses</p>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={monthlyData}>
                            <defs>
                                <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00A650" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#00A650" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="mes" stroke="var(--color-text-muted)" fontSize={11} />
                            <YAxis stroke="var(--color-text-muted)" fontSize={11} tickFormatter={(v: number) => `${v}%`} />
                            <Tooltip
                                contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 12 }}
                                formatter={(value: any) => formatPercent(value)}
                            />
                            <ReferenceLine y={0} stroke="#EF4444" strokeDasharray="5 5" label={{ value: 'Break-even', fill: '#EF4444', fontSize: 10 }} />
                            <ReferenceLine y={settings.metaMargemMinima} stroke="#F59E0B" strokeDasharray="5 5" label={{ value: 'Meta', fill: '#F59E0B', fontSize: 10 }} />
                            <Area type="monotone" dataKey="margem" stroke="#00A650" fill="url(#greenGrad)" strokeWidth={2} name="Margem %" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Cost Distribution Donut */}
                <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-5 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Distribuição de Custos</h3>
                    <p className="text-xs text-[var(--color-text-muted)] mb-4">Período selecionado</p>
                    <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                            <Pie data={custosBreakdown} cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={3} dataKey="value">
                                {custosBreakdown.map((entry, index) => (
                                    <Cell key={index} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 12 }}
                                formatter={(value: any) => formatCurrency(value)}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Sales by Weekday */}
                <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-5 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Vendas por Dia da Semana</h3>
                    <p className="text-xs text-[var(--color-text-muted)] mb-4">Período selecionado</p>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={weekdayData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} />
                            <YAxis stroke="var(--color-text-muted)" fontSize={11} />
                            <Tooltip
                                contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 12 }}
                            />
                            <Bar dataKey="vendas" name="Vendas" fill="#00A650" radius={[6, 6, 0, 0]}>
                                {weekdayData.map((entry, index) => (
                                    <Cell key={index} fillOpacity={entry.opacity} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
