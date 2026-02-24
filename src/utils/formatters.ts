const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat('pt-BR')

const percentFormatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
})

export function formatCurrency(value: number): string {
    return currencyFormatter.format(value)
}

export function formatNumber(value: number): string {
    return numberFormatter.format(value)
}

export function formatPercent(value: number): string {
    return `${percentFormatter.format(value)}%`
}

export function formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR')
}

export function formatDateShort(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

export function formatMonthYear(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

export function getMonthName(month: number): string {
    const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return names[month] || ''
}

export function getDayOfWeekName(day: number): string {
    const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return names[day] || ''
}

export function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

export function todayISO(): string {
    return new Date().toISOString().split('T')[0]
}

export function getDateRange(periodo: string): { inicio: string; fim: string } {
    const hoje = new Date()
    const fim = hoje.toISOString().split('T')[0]
    let inicio: Date

    switch (periodo) {
        case 'hoje':
            return { inicio: fim, fim }
        case '7dias':
            inicio = new Date(hoje)
            inicio.setDate(inicio.getDate() - 7)
            return { inicio: inicio.toISOString().split('T')[0], fim }
        case '30dias':
            inicio = new Date(hoje)
            inicio.setDate(inicio.getDate() - 30)
            return { inicio: inicio.toISOString().split('T')[0], fim }
        case '3meses':
            inicio = new Date(hoje)
            inicio.setMonth(inicio.getMonth() - 3)
            return { inicio: inicio.toISOString().split('T')[0], fim }
        case '6meses':
            inicio = new Date(hoje)
            inicio.setMonth(inicio.getMonth() - 6)
            return { inicio: inicio.toISOString().split('T')[0], fim }
        case '12meses':
            inicio = new Date(hoje)
            inicio.setFullYear(inicio.getFullYear() - 1)
            return { inicio: inicio.toISOString().split('T')[0], fim }
        default:
            inicio = new Date(hoje)
            inicio.setDate(inicio.getDate() - 30)
            return { inicio: inicio.toISOString().split('T')[0], fim }
    }
}
