const STORAGE_KEYS = {
    produtos: 'lucroml_produtos',
    vendas: 'lucroml_vendas',
    campanhas: 'lucroml_campanhas',
    settings: 'lucroml_settings',
    alertas: 'lucroml_alertas',
    tema: 'lucroml_tema',
} as const

export function loadFromStorage<T>(key: keyof typeof STORAGE_KEYS, defaultValue: T): T {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS[key])
        if (raw) return JSON.parse(raw) as T
        return defaultValue
    } catch {
        return defaultValue
    }
}

export function saveToStorage<T>(key: keyof typeof STORAGE_KEYS, data: T): void {
    try {
        localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(data))
    } catch (e) {
        console.error('Error saving to localStorage:', e)
    }
}

export function exportBackup(): string {
    const backup: Record<string, unknown> = {}
    for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
        const raw = localStorage.getItem(storageKey)
        if (raw) backup[key] = JSON.parse(raw)
    }
    return JSON.stringify(backup, null, 2)
}

export function importBackup(jsonString: string): boolean {
    try {
        const backup = JSON.parse(jsonString) as Record<string, unknown>
        for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
            if (backup[key]) {
                localStorage.setItem(storageKey, JSON.stringify(backup[key]))
            }
        }
        return true
    } catch {
        return false
    }
}

export function clearAllData(): void {
    for (const storageKey of Object.values(STORAGE_KEYS)) {
        localStorage.removeItem(storageKey)
    }
}

export function downloadFile(content: string, filename: string, type: string = 'application/json'): void {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export function exportCSV(headers: string[], rows: string[][], filename: string): void {
    const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n')
    downloadFile('\uFEFF' + csvContent, filename, 'text/csv;charset=utf-8')
}
