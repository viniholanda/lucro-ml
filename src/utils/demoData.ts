import type { Settings, Produto, Venda, Campanha } from '../types'
import { generateId } from './formatters'

function randomBetween(min: number, max: number): number {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100
}



function randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]
}

export function getDefaultSettings(): Settings {
    return {
        id: 'default',
        nomeLoja: 'Minha Loja ML',
        tipoEmpresa: 'simples_nacional',
        aliquotaImpostoPadrao: 6,
        tipoAnuncioPadrao: 'premium',
        custoFixoEnvioPadrao: 2.50,
        metaMargemMinima: 15,
        metaFaturamentoMensal: 50000,
        taxas: { classico: 11, premium: 16, taxaFixaPorVenda: 5, fullAdicional: 6 },
        freteEstimado: {
            tipo: 'por_peso',
            tabelaPeso: [
                { pesoMin: 0, pesoMax: 0.5, valor: 15.90 },
                { pesoMin: 0.5, pesoMax: 1, valor: 19.90 },
                { pesoMin: 1, pesoMax: 3, valor: 25.90 },
                { pesoMin: 3, pesoMax: 5, valor: 32.90 },
                { pesoMin: 5, pesoMax: 10, valor: 45.90 },
            ]
        }
    }
}

export function generateDemoProducts(): Produto[] {
    const products: Array<Omit<Produto, 'id' | 'dataCadastro'>> = [
        { sku: 'LML-001', nome: 'Fone Bluetooth XZ Pro', categoria: 'Eletrônicos', precoVenda: 129.90, custoUnitario: 38.00, custoEmbalagem: 2.50, pesoKg: 0.3, tipoAnuncio: 'premium', usaFull: true, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 3, status: 'ativo' },
        { sku: 'LML-002', nome: 'Smartwatch FitBand', categoria: 'Eletrônicos', precoVenda: 189.90, custoUnitario: 65.00, custoEmbalagem: 3.00, pesoKg: 0.4, tipoAnuncio: 'premium', usaFull: true, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 4, status: 'ativo' },
        { sku: 'LML-003', nome: 'Carregador Turbo 65W', categoria: 'Eletrônicos', precoVenda: 79.90, custoUnitario: 18.00, custoEmbalagem: 1.50, pesoKg: 0.2, tipoAnuncio: 'classico', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 2, status: 'ativo' },
        { sku: 'LML-004', nome: 'Caixa de Som Portátil', categoria: 'Eletrônicos', precoVenda: 159.90, custoUnitario: 52.00, custoEmbalagem: 4.00, pesoKg: 0.8, tipoAnuncio: 'premium', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 3, status: 'ativo' },
        { sku: 'LML-005', nome: 'Mouse Gamer RGB', categoria: 'Informática', precoVenda: 89.90, custoUnitario: 28.00, custoEmbalagem: 2.00, pesoKg: 0.25, tipoAnuncio: 'premium', usaFull: true, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 2, status: 'ativo' },
        { sku: 'LML-006', nome: 'Teclado Mecânico Compacto', categoria: 'Informática', precoVenda: 199.90, custoUnitario: 72.00, custoEmbalagem: 4.00, pesoKg: 0.7, tipoAnuncio: 'premium', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 2, status: 'ativo' },
        { sku: 'LML-007', nome: 'Hub USB-C 7 em 1', categoria: 'Informática', precoVenda: 119.90, custoUnitario: 35.00, custoEmbalagem: 2.00, pesoKg: 0.15, tipoAnuncio: 'classico', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 3, status: 'ativo' },
        { sku: 'LML-008', nome: 'Webcam Full HD', categoria: 'Informática', precoVenda: 149.90, custoUnitario: 48.00, custoEmbalagem: 3.00, pesoKg: 0.3, tipoAnuncio: 'premium', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 4, status: 'ativo' },
        { sku: 'LML-009', nome: 'Capa iPhone 15 Silicone', categoria: 'Acessórios', precoVenda: 29.90, custoUnitario: 12.00, custoEmbalagem: 1.00, pesoKg: 0.05, tipoAnuncio: 'classico', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 8, status: 'ativo' },
        { sku: 'LML-010', nome: 'Capa Samsung S24 Anti-impacto', categoria: 'Acessórios', precoVenda: 34.90, custoUnitario: 14.00, custoEmbalagem: 1.00, pesoKg: 0.08, tipoAnuncio: 'classico', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 6, status: 'ativo' },
        { sku: 'LML-011', nome: 'Película iPhone 15 Vidro', categoria: 'Acessórios', precoVenda: 19.90, custoUnitario: 8.00, custoEmbalagem: 0.80, pesoKg: 0.03, tipoAnuncio: 'classico', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 12, status: 'ativo' },
        { sku: 'LML-012', nome: 'Película Galaxy S24', categoria: 'Acessórios', precoVenda: 14.90, custoUnitario: 7.50, custoEmbalagem: 0.80, pesoKg: 0.03, tipoAnuncio: 'classico', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 15, status: 'ativo' },
        { sku: 'LML-013', nome: 'Suporte Veicular Magnético', categoria: 'Acessórios', precoVenda: 23.90, custoUnitario: 11.00, custoEmbalagem: 1.50, pesoKg: 0.15, tipoAnuncio: 'classico', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 5, status: 'ativo' },
        { sku: 'LML-014', nome: 'Carregador Wireless', categoria: 'Acessórios', precoVenda: 59.90, custoUnitario: 20.00, custoEmbalagem: 2.00, pesoKg: 0.2, tipoAnuncio: 'premium', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 4, status: 'ativo' },
        { sku: 'LML-015', nome: 'Cabo USB-C 2m Reforçado', categoria: 'Acessórios', precoVenda: 39.90, custoUnitario: 8.00, custoEmbalagem: 1.00, pesoKg: 0.08, tipoAnuncio: 'classico', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 3, status: 'ativo' },
        { sku: 'LML-016', nome: 'Luminária LED Mesa', categoria: 'Casa e Decoração', precoVenda: 89.90, custoUnitario: 32.00, custoEmbalagem: 5.00, pesoKg: 1.2, tipoAnuncio: 'premium', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 3, status: 'ativo' },
        { sku: 'LML-017', nome: 'Organizador Maquiagem Acrílico', categoria: 'Casa e Decoração', precoVenda: 69.90, custoUnitario: 22.00, custoEmbalagem: 4.00, pesoKg: 0.8, tipoAnuncio: 'classico', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 2, status: 'ativo' },
        { sku: 'LML-018', nome: 'Kit 3 Quadros Decorativos', categoria: 'Casa e Decoração', precoVenda: 79.90, custoUnitario: 25.00, custoEmbalagem: 6.00, pesoKg: 2.0, tipoAnuncio: 'classico', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 5, status: 'ativo' },
        { sku: 'LML-019', nome: 'Difusor de Aromas', categoria: 'Casa e Decoração', precoVenda: 99.90, custoUnitario: 30.00, custoEmbalagem: 4.00, pesoKg: 0.6, tipoAnuncio: 'premium', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 3, status: 'ativo' },
        { sku: 'LML-020', nome: 'Lixeira Sensor Automática', categoria: 'Casa e Decoração', precoVenda: 149.90, custoUnitario: 55.00, custoEmbalagem: 8.00, pesoKg: 2.5, tipoAnuncio: 'premium', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 4, status: 'ativo' },
        { sku: 'LML-021', nome: 'Garrafa Térmica 1L', categoria: 'Esportes', precoVenda: 49.90, custoUnitario: 15.00, custoEmbalagem: 3.00, pesoKg: 0.5, tipoAnuncio: 'classico', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 2, status: 'ativo' },
        { sku: 'LML-022', nome: 'Faixa Elástica Kit 5', categoria: 'Esportes', precoVenda: 44.90, custoUnitario: 8.00, custoEmbalagem: 1.50, pesoKg: 0.3, tipoAnuncio: 'classico', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 1, status: 'ativo' },
        { sku: 'LML-023', nome: 'Tapete Yoga Premium', categoria: 'Esportes', precoVenda: 79.90, custoUnitario: 22.00, custoEmbalagem: 4.00, pesoKg: 1.5, tipoAnuncio: 'classico', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 3, status: 'ativo' },
        { sku: 'LML-024', nome: 'Kit Chaves Precisão 25pcs', categoria: 'Ferramentas', precoVenda: 39.90, custoUnitario: 12.00, custoEmbalagem: 2.00, pesoKg: 0.35, tipoAnuncio: 'classico', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 1, status: 'ativo' },
        { sku: 'LML-025', nome: 'Multímetro Digital', categoria: 'Ferramentas', precoVenda: 59.90, custoUnitario: 18.00, custoEmbalagem: 2.50, pesoKg: 0.4, tipoAnuncio: 'classico', usaFull: false, aliquotaImposto: 6, custoFixoAdicional: 0, percentualDevolucao: 2, status: 'ativo' },
    ]

    return products.map(p => ({
        ...p,
        id: generateId(),
        dataCadastro: '2024-01-15',
    }))
}

export function generateDemoSales(produtos: Produto[]): Venda[] {
    const vendas: Venda[] = []
    const now = new Date()
    const vendasPorMes = [35, 30, 38, 42, 40, 36, 33, 38, 44, 48, 72, 65]
    const acessoriosIds = produtos.filter(p => p.categoria === 'Acessórios').map(p => p.id)

    for (let m = 0; m < 12; m++) {
        const mesDate = new Date(now.getFullYear(), now.getMonth() - 11 + m, 1)
        const daysInMonth = new Date(mesDate.getFullYear(), mesDate.getMonth() + 1, 0).getDate()
        const qtdVendas = vendasPorMes[m]

        for (let v = 0; v < qtdVendas; v++) {
            const produto = randomChoice(produtos.filter(p => p.status === 'ativo'))
            const dia = Math.min(Math.floor(Math.random() * daysInMonth) + 1, daysInMonth)
            const dataVenda = new Date(mesDate.getFullYear(), mesDate.getMonth(), dia)
            const desconto = Math.random() < 0.15 ? randomBetween(0.85, 0.95) : 1
            const quantidade = Math.random() < 0.1 ? Math.floor(randomBetween(2, 4)) : 1
            const teveDevolucao = Math.random() < 0.05 && acessoriosIds.includes(produto.id)

            vendas.push({
                id: generateId(),
                data: dataVenda.toISOString().split('T')[0],
                produtoId: produto.id,
                quantidade,
                precoEfetivoVenda: Math.round(produto.precoVenda * desconto * 100) / 100,
                custoFreteReal: randomBetween(12, 35),
                teveDevolucao,
                custoDevolucao: teveDevolucao ? randomBetween(15, 45) : 0,
                motivoDevolucao: teveDevolucao ? randomChoice(['Defeito', 'Arrependimento', 'Dano no Transporte']) : undefined,
                observacoes: '',
            })
        }
    }

    return vendas.sort((a, b) => b.data.localeCompare(a.data))
}

export function generateDemoCampaigns(produtos: Produto[]): Campanha[] {
    const now = new Date()
    const pIds = produtos.map(p => p.id)

    return [
        {
            id: generateId(),
            nome: 'Fones Bluetooth - Sempre',
            dataInicio: new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString().split('T')[0],
            dataFim: '',
            investimentoTotal: 1200,
            produtosVinculados: pIds.slice(0, 2),
            status: 'ativa',
        },
        {
            id: generateId(),
            nome: 'Black Friday 2024',
            dataInicio: new Date(now.getFullYear(), 10, 20).toISOString().split('T')[0],
            dataFim: new Date(now.getFullYear(), 10, 30).toISOString().split('T')[0],
            investimentoTotal: 800,
            produtosVinculados: pIds.slice(0, 8),
            status: 'encerrada',
        },
        {
            id: generateId(),
            nome: 'Smartwatch Verão',
            dataInicio: new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
            dataFim: new Date(now.getFullYear(), 2, 31).toISOString().split('T')[0],
            investimentoTotal: 600,
            produtosVinculados: [pIds[1]],
            status: 'encerrada',
        },
        {
            id: generateId(),
            nome: 'Capas Dezembro',
            dataInicio: new Date(now.getFullYear(), 11, 1).toISOString().split('T')[0],
            dataFim: new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0],
            investimentoTotal: 450,
            produtosVinculados: pIds.slice(8, 11),
            status: 'encerrada',
        },
        {
            id: generateId(),
            nome: 'Películas Promo',
            dataInicio: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0],
            dataFim: '',
            investimentoTotal: 350,
            produtosVinculados: pIds.slice(10, 13),
            status: 'ativa',
        },
    ]
}
