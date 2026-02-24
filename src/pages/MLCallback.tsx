import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../contexts/AppContext'
import { exchangeCode, fetchUserInfo } from '../utils/mlApi'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

export function MLCallback() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { state, dispatch } = useApp()
    const [status, setStatus] = useState('Conectando ao Mercado Livre...')

    useEffect(() => {
        const code = searchParams.get('code')
        if (!code) {
            toast.error('Código de autorização não encontrado.')
            navigate('/configuracoes')
            return
        }

        const creds = state.settings.mlCredentials
        if (!creds?.appId || !creds?.secretKey) {
            toast.error('APP_ID ou SECRET_KEY não configurados.')
            navigate('/configuracoes')
            return
        }

        const redirectUri = `${window.location.origin}/callback`

        async function doExchange() {
            try {
                setStatus('Obtendo token de acesso...')
                const newCreds = await exchangeCode(
                    creds!.appId,
                    creds!.secretKey,
                    code!,
                    redirectUri
                )

                setStatus('Buscando informações da conta...')
                const user = await fetchUserInfo(newCreds)

                const finalCreds = { ...newCreds, userId: user.id }

                dispatch({
                    type: 'SET_SETTINGS',
                    payload: { ...state.settings, mlCredentials: finalCreds },
                })

                toast.success(`Conectado como ${user.nickname}!`)
                navigate('/configuracoes')
            } catch (err: any) {
                console.error('ML Auth Error:', err)
                toast.error(`Erro na autenticação: ${err.message}`)
                navigate('/configuracoes')
            }
        }

        doExchange()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <Loader2 size={48} className="text-[var(--color-green-primary)] animate-spin mb-6" />
            <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
                Autenticação Mercado Livre
            </h2>
            <p className="text-[var(--color-text-secondary)]">{status}</p>
        </div>
    )
}
