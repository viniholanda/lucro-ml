import type { Produto, Venda, Campanha, Settings, ProfitBreakdown } from '../types'

/**
 * Calcula o custo fixo do Mercado Livre baseado no preço de venda.
 * Tabela vigente:
 *   Até R$ 12,49       → 50% do valor do produto
 *   R$ 12,50 a R$ 29   → R$ 6,25
 *   R$ 29,01 a R$ 50   → R$ 6,50
 *   R$ 50,01 a R$ 78,99 → R$ 6,75
 *   Acima de R$ 79      → R$ 0
 */
function calcularCustoFixoML(precoVenda: number): number {
    if (precoVenda >= 79) return 0
    if (precoVenda >= 50.01) return 6.75
    if (precoVenda >= 29.01) return 6.50
    if (precoVenda >= 12.50) return 6.25
    return precoVenda * 0.50 // até R$ 12,49
}

/**
 * Calcula o frete estimado.
 * Regra: frete estimado só é cobrado para produtos com preço >= R$ 79.
 * O Mercado Livre dá 50% de desconto no frete (vendedor paga metade).
 */
function calcularFreteEstimado(precoVenda: number, pesoKg: number, settings: Settings): number {
    if (precoVenda < 79) return 0

    let freteBruto = 0
    if (settings.freteEstimado.tipo === 'valor_fixo') {
        freteBruto = settings.freteEstimado.valorFixo || 0
    } else if (settings.freteEstimado.tabelaPeso) {
        const faixa = settings.freteEstimado.tabelaPeso.find(
            f => pesoKg >= f.pesoMin && pesoKg < f.pesoMax
        )
        freteBruto = faixa ? faixa.valor : 0
    }

    // ML dá 50% de desconto no frete
    return freteBruto * 0.5
}

export function calcularLucroPorVenda(
    venda: Venda,
    produto: Produto,
    settings: Settings,
    campanhas: Campanha[]
): ProfitBreakdown {
    const receitaBruta = venda.precoEfetivoVenda * venda.quantidade
    const taxaPercent = produto.tipoAnuncio === 'classico' ? settings.taxas.classico : settings.taxas.premium
    const taxaMLPercent = receitaBruta * (taxaPercent / 100)
    const taxaMLFixa = calcularCustoFixoML(venda.precoEfetivoVenda) * venda.quantidade
    const taxaFull = produto.usaFull ? settings.taxas.fullAdicional * venda.quantidade : 0
    const totalTaxasML = taxaMLPercent + taxaMLFixa + taxaFull
    const imposto = receitaBruta * (produto.aliquotaImposto / 100)
    const custoProdutos = produto.custoUnitario * venda.quantidade
    const custoFixos = produto.custoEmbalagem + (produto.custoFixoAdicional * venda.quantidade)
    const custoFreteReal = venda.custoFreteReal
    const devolucao = venda.teveDevolucao ? venda.custoDevolucao : 0

    let custoAdsPorVenda = 0
    if (venda.campanhaId) {
        const campanha = campanhas.find(c => c.id === venda.campanhaId)
        if (campanha) {
            custoAdsPorVenda = campanha.investimentoTotal / Math.max(1, campanhas.length)
        }
    }

    const custoTotal = totalTaxasML + imposto + custoFreteReal + custoProdutos + custoFixos + devolucao + custoAdsPorVenda
    const lucroLiquido = receitaBruta - custoTotal
    const margemPercent = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0

    return {
        receitaBruta, taxaMLPercent, taxaMLFixa, taxaFull, totalTaxasML,
        imposto, custoProdutos, custoFixos, custoFreteReal, devolucao,
        custoAdsPorVenda, custoTotal, lucroLiquido, margemPercent
    }
}

export function calcularLucroUnitarioProduto(produto: Produto, settings: Settings): ProfitBreakdown {
    const receitaBruta = produto.precoVenda
    const taxaPercent = produto.tipoAnuncio === 'classico' ? settings.taxas.classico : settings.taxas.premium
    const taxaMLPercent = receitaBruta * (taxaPercent / 100)
    const taxaMLFixa = calcularCustoFixoML(produto.precoVenda)
    const taxaFull = produto.usaFull ? settings.taxas.fullAdicional : 0
    const totalTaxasML = taxaMLPercent + taxaMLFixa + taxaFull
    const imposto = receitaBruta * (produto.aliquotaImposto / 100)
    const custoProdutos = produto.custoUnitario

    const custoFreteReal = calcularFreteEstimado(produto.precoVenda, produto.pesoKg, settings)

    const custoFixos = produto.custoEmbalagem + produto.custoFixoAdicional
    const provDevolucao = receitaBruta * (produto.percentualDevolucao / 100)
    const custoTotal = totalTaxasML + imposto + custoFreteReal + custoProdutos + custoFixos + provDevolucao
    const lucroLiquido = receitaBruta - custoTotal
    const margemPercent = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0

    return {
        receitaBruta, taxaMLPercent, taxaMLFixa, taxaFull, totalTaxasML,
        imposto, custoProdutos, custoFixos, custoFreteReal,
        devolucao: provDevolucao, custoAdsPorVenda: 0,
        custoTotal, lucroLiquido, margemPercent
    }
}

export function calcularPrecoMinimo(produto: Produto, settings: Settings): number {
    const taxaPercent = produto.tipoAnuncio === 'classico' ? settings.taxas.classico : settings.taxas.premium

    const freteEstimado = calcularFreteEstimado(produto.precoVenda, produto.pesoKg, settings)

    // Use the fixed cost for the current price as an approximation
    const custoFixoML = calcularCustoFixoML(produto.precoVenda)

    const custosFixos = produto.custoUnitario + produto.custoEmbalagem + produto.custoFixoAdicional + freteEstimado + custoFixoML
    const taxaFixa = produto.usaFull ? settings.taxas.fullAdicional : 0
    const divisor = 1 - (taxaPercent / 100) - (produto.aliquotaImposto / 100)
    if (divisor <= 0) return custosFixos * 3

    const precoMinimo = (custosFixos + taxaFixa) / divisor
    return Math.ceil(precoMinimo * 10) / 10
}

export function calcularCurvaABC(
    produtos: Produto[],
    vendas: Venda[],
    settings: Settings,
    campanhas: Campanha[]
): Array<{ produto: Produto; lucroTotal: number; percentual: number; acumulado: number; classificacao: 'A' | 'B' | 'C' }> {
    const lucrosPorProduto = produtos.map(produto => {
        const vendasProduto = vendas.filter(v => v.produtoId === produto.id)
        const lucroTotal = vendasProduto.reduce((acc, venda) => {
            const breakdown = calcularLucroPorVenda(venda, produto, settings, campanhas)
            return acc + breakdown.lucroLiquido
        }, 0)
        return { produto, lucroTotal }
    }).filter(item => item.lucroTotal > 0).sort((a, b) => b.lucroTotal - a.lucroTotal)

    const totalLucro = lucrosPorProduto.reduce((acc, item) => acc + item.lucroTotal, 0)
    let acumulado = 0

    return lucrosPorProduto.map(item => {
        const percentual = totalLucro > 0 ? (item.lucroTotal / totalLucro) * 100 : 0
        acumulado += percentual
        const classificacao = acumulado <= 80 ? 'A' : acumulado <= 95 ? 'B' : 'C'
        return { ...item, percentual, acumulado, classificacao }
    })
}

export function calcularPrevisaoFaturamento(faturamentoMensal: number[]): { pessimista: number; realista: number; otimista: number } {
    const ultimos3 = faturamentoMensal.slice(-3)
    if (ultimos3.length === 0) return { pessimista: 0, realista: 0, otimista: 0 }
    const media = ultimos3.reduce((a, b) => a + b, 0) / ultimos3.length
    return {
        pessimista: media * 0.85,
        realista: media,
        otimista: media * 1.15
    }
}
