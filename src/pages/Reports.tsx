import { useMemo } from 'react'
import { useApp } from '../contexts/AppContext'
import { calcularLucroPorVenda, calcularCurvaABC, calcularPrevisaoFaturamento } from '../utils/calculations'
import { formatCurrency, formatPercent, getDateRange, getMonthName } from '../utils/formatters'
import { exportCSV } from '../utils/storage'
import { Download } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart as RLineChart, Line, Legend } from 'recharts'

export default function Reports() {
    const { state } = useApp()
    const { produtos, vendas, campanhas, settings, periodo } = state
    const { inicio, fim } = getDateRange(periodo)
    const vendasPeriodo = useMemo(() => vendas.filter(v => v.data >= inicio && v.data <= fim), [vendas, inicio, fim])

    // DRE
    const dre = useMemo(() => {
        let receita = 0, devol = 0, cusProd = 0, taxasML = 0, frete = 0, impostos = 0, ads = 0, embalagem = 0
        vendasPeriodo.forEach(v => {
            const prod = produtos.find(p => p.id === v.produtoId)
            if (!prod) return
            const b = calcularLucroPorVenda(v, prod, settings, campanhas)
            receita += b.receitaBruta
            devol += b.devolucao
            cusProd += b.custoProdutos
            taxasML += b.totalTaxasML
            frete += b.custoFreteReal
            impostos += b.imposto
            ads += b.custoAdsPorVenda
            embalagem += b.custoFixos
        })
        const recLiq = receita - devol
        const lucBruto = recLiq - cusProd
        const lucLiq = lucBruto - taxasML - frete - impostos - ads - embalagem
        const margem = receita > 0 ? (lucLiq / receita) * 100 : 0
        return { receita, devol, recLiq, cusProd, lucBruto, taxasML, frete, impostos, ads, embalagem, lucLiq, margem }
    }, [vendasPeriodo, produtos, settings, campanhas])

    // ABC Curve
    const curvaABC = useMemo(() => calcularCurvaABC(produtos, vendasPeriodo, settings, campanhas).slice(0, 20), [produtos, vendasPeriodo, settings, campanhas])

    // Loss products (used in full version)
    // const prejuizo = useMemo(() =>
    //     produtos.map(p => ({ ...p, b: calcularLucroUnitarioProduto(p, settings) }))
    //         .filter(p => p.b.margemPercent < 0)
    //         .sort((a, b) => a.b.lucroLiquido - b.b.lucroLiquido),
    //     [produtos, settings]
    // )

    // Monthly comparison
    const comparativo = useMemo(() => {
        const now = new Date()
        return Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
            const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            const vs = vendas.filter(v => v.data.startsWith(mKey))
            let fat = 0, custos = 0
            vs.forEach(v => {
                const prod = produtos.find(p => p.id === v.produtoId)
                if (!prod) return
                const b = calcularLucroPorVenda(v, prod, settings, campanhas)
                fat += b.receitaBruta; custos += b.custoTotal
            })
            const lucro = fat - custos
            return { mes: getMonthName(d.getMonth()), faturamento: fat, custos, lucro, margem: fat > 0 ? (lucro / fat) * 100 : 0, vendas: vs.length }
        })
    }, [vendas, produtos, settings, campanhas])

    // Forecast
    const previsao = useMemo(() => {
        const fatMensal = comparativo.slice(-3).map(m => m.faturamento)
        return calcularPrevisaoFaturamento(fatMensal)
    }, [comparativo])

    // Returns
    const devolucoes = useMemo(() => {
        const devVendas = vendasPeriodo.filter(v => v.teveDevolucao)
        const custoDevol = devVendas.reduce((a, v) => a + v.custoDevolucao, 0)
        const taxa = vendasPeriodo.length > 0 ? (devVendas.length / vendasPeriodo.length) * 100 : 0
        return { total: devVendas.length, custo: custoDevol, taxa }
    }, [vendasPeriodo])

    function exportDRE() {
        exportCSV(
            ['Item', 'Valor'],
            [
                ['Receita Bruta', formatCurrency(dre.receita)],
                ['Devoluções', formatCurrency(dre.devol)],
                ['Receita Líquida', formatCurrency(dre.recLiq)],
                ['Custo Produtos', formatCurrency(dre.cusProd)],
                ['Lucro Bruto', formatCurrency(dre.lucBruto)],
                ['Taxas ML', formatCurrency(dre.taxasML)],
                ['Frete', formatCurrency(dre.frete)],
                ['Impostos', formatCurrency(dre.impostos)],
                ['Ads', formatCurrency(dre.ads)],
                ['Embalagem', formatCurrency(dre.embalagem)],
                ['Lucro Líquido', formatCurrency(dre.lucLiq)],
                ['Margem', formatPercent(dre.margem)],
            ],
            'dre-lucroml.csv'
        )
    }

    // Report section definitions (used for future navigation)
    // const reports = [
    //     { id: 'dre', title: 'DRE Simplificado' },
    //     { id: 'prejuizo', title: 'Produtos com Prejuízo' },
    //     { id: 'ranking', title: 'Curva ABC de Produtos' },
    //     { id: 'comparativo', title: 'Comparativo Mensal' },
    //     { id: 'previsao', title: 'Previsão de Faturamento' },
    //     { id: 'devolucoes', title: 'Análise de Devoluções' },
    // ]

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Relatórios</h1>
                <p className="text-sm text-[var(--color-text-secondary)]">Análises detalhadas de desempenho financeiro.</p>
            </div>

            {/* DRE */}
            <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)]">📄 DRE Simplificado</h3>
                    <button onClick={exportDRE} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] transition-colors">
                        <Download size={14} /> Exportar CSV
                    </button>
                </div>
                <div className="space-y-2 text-sm max-w-lg">
                    {[
                        { label: 'Receita Bruta de Vendas', value: dre.receita, bold: false },
                        { label: '(-) Devoluções e Cancelamentos', value: -dre.devol, bold: false },
                        { label: '= Receita Líquida', value: dre.recLiq, bold: true, sep: true },
                        { label: '(-) Custo dos Produtos Vendidos', value: -dre.cusProd, bold: false },
                        { label: '= Lucro Bruto', value: dre.lucBruto, bold: true, sep: true },
                        { label: '(-) Taxas Mercado Livre', value: -dre.taxasML, bold: false },
                        { label: '(-) Frete', value: -dre.frete, bold: false },
                        { label: '(-) Impostos', value: -dre.impostos, bold: false },
                        { label: '(-) Investimento em Ads', value: -dre.ads, bold: false },
                        { label: '(-) Embalagem', value: -dre.embalagem, bold: false },
                    ].map((row, i) => (
                        <div key={i}>
                            {row.sep && <hr className="border-[var(--color-border)] my-2" />}
                            <div className={`flex justify-between ${row.bold ? 'font-bold text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                                <span>{row.label}</span>
                                <span className={row.value < 0 ? 'text-[var(--color-red-primary)]' : ''}>{formatCurrency(Math.abs(row.value))}</span>
                            </div>
                        </div>
                    ))}
                    <hr className="border-[var(--color-border)] my-2" />
                    <div className={`flex justify-between text-lg font-bold ${dre.lucLiq >= 0 ? 'text-[var(--color-green-primary)]' : 'text-[var(--color-red-primary)]'}`}>
                        <span>= LUCRO LÍQUIDO REAL</span>
                        <span>{formatCurrency(dre.lucLiq)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-[var(--color-text-muted)]">
                        <span>Margem Líquida</span>
                        <span className="font-semibold">{formatPercent(dre.margem)}</span>
                    </div>
                </div>
            </div>

            {/* ABC Curve */}
            {curvaABC.length > 0 && (
                <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6">
                    <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">📊 Curva ABC de Produtos</h3>
                    <ResponsiveContainer width="100%" height={Math.max(200, curvaABC.length * 40)}>
                        <BarChart data={curvaABC.map(c => ({ name: c.produto.nome.length > 25 ? c.produto.nome.substring(0, 25) + '...' : c.produto.nome, lucro: c.lucroTotal, classificacao: c.classificacao }))} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis type="number" stroke="var(--color-text-muted)" fontSize={11} tickFormatter={(v: number) => formatCurrency(v)} />
                            <YAxis type="category" dataKey="name" stroke="var(--color-text-muted)" fontSize={11} width={200} />
                            <Tooltip contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 12 }} formatter={(value: number | undefined) => formatCurrency(value ?? 0)} />
                            <Bar dataKey="lucro" name="Lucro" radius={[0, 6, 6, 0]}>
                                {curvaABC.map((entry, index) => {
                                    const color = entry.classificacao === 'A' ? '#00A650' : entry.classificacao === 'B' ? '#F59E0B' : '#EF4444'
                                    return <rect key={index} fill={color} />
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Monthly Comparison */}
            <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">📈 Comparativo Mensal</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <RLineChart data={comparativo}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                        <XAxis dataKey="mes" stroke="var(--color-text-muted)" fontSize={11} />
                        <YAxis stroke="var(--color-text-muted)" fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 12, fontSize: 12 }} formatter={(value: number | undefined) => formatCurrency(value ?? 0)} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="faturamento" name="Faturamento" stroke="#3B82F6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#00A650" strokeWidth={2} dot={false} />
                    </RLineChart>
                </ResponsiveContainer>
            </div>

            {/* Forecast */}
            <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">🔮 Previsão de Faturamento</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[var(--color-bg-tertiary)] text-center">
                        <p className="text-xs text-[var(--color-text-muted)]">📉 Pessimista</p>
                        <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{formatCurrency(previsao.pessimista)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--color-green-primary)]/10 border border-[var(--color-green-primary)]/20 text-center">
                        <p className="text-xs text-[var(--color-text-muted)]">📊 Realista</p>
                        <p className="text-lg font-bold text-[var(--color-green-primary)] mt-1">{formatCurrency(previsao.realista)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--color-bg-tertiary)] text-center">
                        <p className="text-xs text-[var(--color-text-muted)]">📈 Otimista</p>
                        <p className="text-lg font-bold text-[var(--color-text-primary)] mt-1">{formatCurrency(previsao.otimista)}</p>
                    </div>
                </div>
            </div>

            {/* Returns */}
            <div className="bg-[var(--color-bg-secondary)] rounded-2xl border border-[var(--color-border)] p-6">
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">🔄 Análise de Devoluções</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[var(--color-bg-tertiary)] text-center">
                        <p className="text-xs text-[var(--color-text-muted)]">Total Devoluções</p>
                        <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{devolucoes.total}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--color-bg-tertiary)] text-center">
                        <p className="text-xs text-[var(--color-text-muted)]">Custo Total</p>
                        <p className="text-2xl font-bold text-[var(--color-red-primary)] mt-1">{formatCurrency(devolucoes.custo)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--color-bg-tertiary)] text-center">
                        <p className="text-xs text-[var(--color-text-muted)]">Taxa de Devolução</p>
                        <p className="text-2xl font-bold text-[var(--color-yellow-primary)] mt-1">{formatPercent(devolucoes.taxa)}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
