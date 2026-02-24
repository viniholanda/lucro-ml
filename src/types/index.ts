export interface MLCredentials {
    appId: string
    secretKey: string
    accessToken: string
    refreshToken: string
    expiresAt: number // timestamp ms
    userId: number
}

export interface Settings {
    id: string
    nomeLoja: string
    tipoEmpresa: 'MEI' | 'simples_nacional' | 'lucro_presumido' | 'lucro_real'
    aliquotaImpostoPadrao: number
    tipoAnuncioPadrao: 'classico' | 'premium'
    custoFixoEnvioPadrao: number
    metaMargemMinima: number
    metaFaturamentoMensal: number
    taxas: {
        classico: number
        premium: number
        taxaFixaPorVenda: number
        fullAdicional: number
    }
    freteEstimado: {
        tipo: 'por_peso' | 'valor_fixo'
        valorFixo?: number
        tabelaPeso?: Array<{
            pesoMin: number
            pesoMax: number
            valor: number
        }>
    }
    mlCredentials?: MLCredentials
}

export interface Produto {
    id: string
    sku: string
    nome: string
    categoria: string
    precoVenda: number
    custoUnitario: number
    custoEmbalagem: number
    pesoKg: number
    tipoAnuncio: 'classico' | 'premium'
    usaFull: boolean
    aliquotaImposto: number
    custoFixoAdicional: number
    percentualDevolucao: number
    status: 'ativo' | 'inativo'
    dataCadastro: string
    mlItemId?: string
}

export interface Venda {
    id: string
    data: string
    produtoId: string
    quantidade: number
    precoEfetivoVenda: number
    custoFreteReal: number
    teveDevolucao: boolean
    custoDevolucao: number
    motivoDevolucao?: string
    campanhaId?: string
    clienteId?: string
    observacoes?: string
    mlOrderId?: string
}

export interface Campanha {
    id: string
    nome: string
    dataInicio: string
    dataFim: string
    investimentoTotal: number
    produtosVinculados: string[]
    status: 'ativa' | 'pausada' | 'encerrada'
}

export interface Alerta {
    id: string
    tipo: 'critico' | 'atencao' | 'informativo'
    titulo: string
    descricao: string
    dataGeracao: string
    acao?: { label: string; rota: string }
    dispensado: boolean
}

export interface ProfitBreakdown {
    receitaBruta: number
    taxaMLPercent: number
    taxaMLFixa: number
    taxaFull: number
    totalTaxasML: number
    imposto: number
    custoProdutos: number
    custoFixos: number
    custoFreteReal: number
    devolucao: number
    custoAdsPorVenda: number
    custoTotal: number
    lucroLiquido: number
    margemPercent: number
}

export type PeriodoFiltro = 'hoje' | '7dias' | '30dias' | '3meses' | '6meses' | '12meses' | 'personalizado'

export interface PeriodoPersonalizado {
    inicio: string
    fim: string
}

export type Tema = 'escuro' | 'claro' | 'sistema'

export const CATEGORIAS = [
    'Eletrônicos', 'Acessórios', 'Casa e Decoração', 'Moda',
    'Beleza', 'Esportes', 'Automotivo', 'Brinquedos',
    'Informática', 'Ferramentas', 'Outro'
] as const

export const MOTIVOS_DEVOLUCAO = [
    'Defeito', 'Arrependimento', 'Produto Errado', 'Dano no Transporte', 'Outro'
] as const
