import type { Produto, Venda } from '../types'
import { generateId } from './formatters'

/**
 * Converte um item da API do Mercado Livre para o tipo Produto interno.
 */
export function mlItemToProduto(item: any): Produto {
    const tipoAnuncio: 'classico' | 'premium' =
        item.listing_type_id === 'gold_special' || item.listing_type_id === 'gold_pro'
            ? 'premium'
            : 'classico'

    const usaFull = item.shipping?.logistic_type === 'fulfillment'

    return {
        id: generateId(),
        sku: item.id || '',
        nome: item.title || 'Sem título',
        categoria: item.category_id || 'Outro',
        precoVenda: item.price || 0,
        custoUnitario: 0, // o ML não fornece custo — usuário preenche depois
        custoEmbalagem: 0,
        pesoKg: item.shipping?.dimensions ? parseFloat(item.shipping.dimensions.split('x')[0]) / 1000 || 0.5 : 0.5,
        tipoAnuncio,
        usaFull,
        aliquotaImposto: 6, // padrão
        custoFixoAdicional: 0,
        percentualDevolucao: 3, // estimativa padrão
        status: item.status === 'active' ? 'ativo' : 'inativo',
        dataCadastro: new Date().toISOString(),
        mlItemId: item.id,
    }
}

/**
 * Converte uma order da API do Mercado Livre para o tipo Venda interno.
 */
export function mlOrderToVenda(
    order: any,
    freteReal: number,
    produtoIdMap: Map<string, string> // mlItemId → produtoId interno
): Venda | null {
    const orderItem = order.order_items?.[0]
    if (!orderItem) return null

    const mlItemId = orderItem.item?.id
    const produtoId = mlItemId ? produtoIdMap.get(mlItemId) : undefined
    if (!produtoId) return null // produto não importado

    const teveDevolucao = order.status === 'cancelled'

    return {
        id: generateId(),
        data: order.date_created?.split('T')[0] || new Date().toISOString().split('T')[0],
        produtoId,
        quantidade: orderItem.quantity || 1,
        precoEfetivoVenda: orderItem.unit_price || 0,
        custoFreteReal: freteReal,
        teveDevolucao,
        custoDevolucao: teveDevolucao ? (orderItem.unit_price || 0) * (orderItem.quantity || 1) : 0,
        motivoDevolucao: teveDevolucao ? 'Cancelamento ML' : undefined,
        mlOrderId: order.id?.toString(),
    }
}
