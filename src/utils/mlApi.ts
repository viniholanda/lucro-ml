import type { MLCredentials } from '../types'

const ML_AUTH_BASE = 'https://auth.mercadolibre.com.br'
const ML_API_BASE = 'https://api.mercadolibre.com'

/**
 * Gera a URL de autorização OAuth do Mercado Livre.
 */
export function getAuthUrl(appId: string, redirectUri: string): string {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: appId,
        redirect_uri: redirectUri,
    })
    return `${ML_AUTH_BASE}/authorization?${params.toString()}`
}

/**
 * Troca o authorization code por access_token via proxy do Vite.
 */
export async function exchangeCode(
    appId: string,
    secretKey: string,
    code: string,
    redirectUri: string
): Promise<MLCredentials> {
    const res = await fetch('/api/ml-token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: appId,
            client_secret: secretKey,
            code,
            redirect_uri: redirectUri,
        }),
    })
    if (!res.ok) throw new Error(`Erro ao obter token: ${res.status}`)
    const data = await res.json()
    return {
        appId,
        secretKey,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
        userId: data.user_id,
    }
}

/**
 * Renova o access_token usando o refresh_token.
 */
export async function refreshAccessToken(creds: MLCredentials): Promise<MLCredentials> {
    const res = await fetch('/api/ml-token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: creds.appId,
            client_secret: creds.secretKey,
            refresh_token: creds.refreshToken,
        }),
    })
    if (!res.ok) throw new Error(`Erro ao renovar token: ${res.status}`)
    const data = await res.json()
    return {
        ...creds,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + data.expires_in * 1000,
    }
}

/**
 * Helper para chamar a API do ML com auto-refresh de token.
 */
async function mlFetch(
    path: string,
    creds: MLCredentials,
    onRefresh?: (newCreds: MLCredentials) => void
): Promise<any> {
    // Refresh se o token está prestes a expirar (5 min de margem)
    if (Date.now() > creds.expiresAt - 5 * 60 * 1000) {
        creds = await refreshAccessToken(creds)
        onRefresh?.(creds)
    }

    const res = await fetch(`${ML_API_BASE}${path}`, {
        headers: { Authorization: `Bearer ${creds.accessToken}` },
    })
    if (!res.ok) throw new Error(`ML API error ${res.status}: ${path}`)
    return res.json()
}

/**
 * Busca informações do usuário autenticado.
 */
export async function fetchUserInfo(
    creds: MLCredentials,
    onRefresh?: (c: MLCredentials) => void
): Promise<{ id: number; nickname: string }> {
    return mlFetch('/users/me', creds, onRefresh)
}

/**
 * Busca todos os itens (anúncios) do vendedor.
 */
export async function fetchSellerItems(
    creds: MLCredentials,
    onRefresh?: (c: MLCredentials) => void
): Promise<any[]> {
    // 1) Buscar IDs dos itens
    const search = await mlFetch(`/users/${creds.userId}/items/search?limit=100`, creds, onRefresh)
    const ids: string[] = search.results || []
    if (ids.length === 0) return []

    // 2) Multiget em lotes de 20
    const items: any[] = []
    for (let i = 0; i < ids.length; i += 20) {
        const batch = ids.slice(i, i + 20).join(',')
        const data = await mlFetch(`/items?ids=${batch}`, creds, onRefresh)
        items.push(...data.map((d: any) => d.body))
    }
    return items
}

/**
 * Busca as vendas (orders) do vendedor no período.
 */
export async function fetchOrders(
    creds: MLCredentials,
    dateFrom: string, // formato: YYYY-MM-DD
    dateTo: string,
    onRefresh?: (c: MLCredentials) => void
): Promise<any[]> {
    const orders: any[] = []
    let offset = 0
    const limit = 50

    while (true) {
        const params = new URLSearchParams({
            seller: creds.userId.toString(),
            'order.date_created.from': `${dateFrom}T00:00:00.000-03:00`,
            'order.date_created.to': `${dateTo}T23:59:59.999-03:00`,
            limit: limit.toString(),
            offset: offset.toString(),
            sort: 'date_desc',
        })
        const data = await mlFetch(`/orders/search?${params.toString()}`, creds, onRefresh)
        orders.push(...(data.results || []))
        if (orders.length >= (data.paging?.total || 0) || (data.results || []).length < limit) break
        offset += limit
    }
    return orders
}

/**
 * Busca detalhes de um envio (frete real).
 */
export async function fetchShipment(
    creds: MLCredentials,
    shipmentId: string | number,
    onRefresh?: (c: MLCredentials) => void
): Promise<any> {
    return mlFetch(`/shipments/${shipmentId}`, creds, onRefresh)
}

/**
 * URL padrão de redirect para o callback (pode ser sobrescrita nas configurações).
 */
export function getDefaultRedirectUri(): string {
    return `${window.location.origin.replace('http://', 'https://')}/callback`
}
