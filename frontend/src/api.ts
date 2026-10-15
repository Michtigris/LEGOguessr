export type Stats = {
  total: number
  enriched: number
  pending: number
  active_list_id: number | null
  active: SetList | null
}

export type SetList = {
  id: number
  name: string
  created_at: string
  updated_at: string
  total: number
  enriched: number
  pending: number
}

export type ListsPayload = {
  lists: SetList[]
  active_list_id: number | null
  active: SetList | null
  revision: number
}

export type ArchiveSet = {
  set_num: string
  quantity: number
  name?: string | null
  year?: number | null
  num_parts?: number | null
  num_minifigs?: number | null
  set_img_url?: string | null
  set_url?: string | null
  enriched?: number
}

export type ArchiveList = {
  name: string
  active: boolean
  sets: ArchiveSet[]
}

export type Archive = {
  version: number
  revision: number
  lists: ArchiveList[]
}

export type SetSummary = {
  set_num: string
  name?: string | null
  year?: number | null
  num_parts?: number | null
  num_minifigs?: number | null
  set_img_url?: string | null
  set_url?: string | null
}

export type GuessRound = {
  mode: 'guess'
  clues: {
    year_range: [number, number]
    parts_range: [number, number]
    minifigs_range: [number, number]
  }
  choices: Array<{
    set_num: string
    name: string
    set_img_url?: string | null
  }>
  answer_set_num: string
  bonuses: {
    letter: string
    year_exact: number | null
    parts_exact: number | null
    figs_exact: number | null
    peek_img: string | null
  }
  bonus_credits: number
}

export type GuessResult = {
  correct: boolean
  answer: SetSummary
  guess_set_num: string
}

export type WheelRound = {
  mode: 'wheel'
  segments: Array<{ set_num: string; name: string }>
  sets: SetSummary[]
}

const API_KEY_STORAGE = 'lego_guessr_api_key'
const DEVICE_KEY = 'lego_guessr_device'
const ARCHIVE_KEY = 'lego_guessr_archive'
const DEVICE_RE = /^[A-Za-z0-9_-]{16,80}$/

function readCookie(name: string): string {
  const prefix = `${name}=`
  for (const part of document.cookie.split(';')) {
    const item = part.trim()
    if (item.startsWith(prefix)) return decodeURIComponent(item.slice(prefix.length))
  }
  return ''
}

export function getDeviceId(): string {
  const stored = localStorage.getItem(DEVICE_KEY) || ''
  const fromCookie = readCookie('lego_device')
  let id = DEVICE_RE.test(stored) ? stored : DEVICE_RE.test(fromCookie) ? fromCookie : ''
  if (!id) id = crypto.randomUUID().replace(/-/g, '')
  localStorage.setItem(DEVICE_KEY, id)
  document.cookie = `lego_device=${id}; Max-Age=34560000; Path=/; SameSite=Lax`
  return id
}

export function loadArchive(): Archive | null {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Archive
    if (!data || data.version !== 1 || !Array.isArray(data.lists)) return null
    return data
  } catch {
    return null
  }
}

export function saveArchive(archive: Archive) {
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive))
  } catch {
    /* quota pleine : la session serveur reste valable tant que le serveur vit */
  }
}

export function getStoredApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) ?? ''
}

export function setStoredApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE, key.trim())
}

async function readError(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const data = JSON.parse(text) as { detail?: unknown }
    if (typeof data.detail === 'string') return data.detail
    if (data.detail != null) return JSON.stringify(data.detail)
  } catch {
    /* not JSON */
  }
  const trimmed = text.trim()
  if (trimmed) {
    return `${res.status}: ${trimmed.slice(0, 180)}`
  }
  return `${res.status} ${res.statusText || 'Erreur réseau'}`
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  withApiKey = false,
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('X-Device-Id', getDeviceId())
  if (withApiKey) {
    const key = getStoredApiKey()
    if (key) headers.set('X-API-Key', key)
  }
  const res = await fetch(path, { ...init, headers })
  if (!res.ok) throw new Error(await readError(res))
  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>
  }
  return undefined as T
}

export const api = {
  health: () => request<{ status: string }>('/api/health'),
  stats: () => request<Stats>('/api/stats'),
  lists: () => request<ListsPayload>('/api/lists'),
  createList: async (name: string, file: File) => {
    const body = new FormData()
    body.append('name', name)
    body.append('file', file)
    return request<ListsPayload & { list: SetList; imported: number }>(
      '/api/lists',
      { method: 'POST', body },
    )
  },
  updateList: async (listId: number, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return request<ListsPayload & { list: SetList; imported: number }>(
      `/api/lists/${listId}/update`,
      { method: 'POST', body },
    )
  },
  deleteList: (listId: number) =>
    request<ListsPayload>(`/api/lists/${listId}`, { method: 'DELETE' }),
  selectList: (listId: number) =>
    request<ListsPayload>('/api/lists/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_id: listId }),
    }),
  renameList: (listId: number, name: string) =>
    request<ListsPayload & { list: SetList }>(`/api/lists/${listId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }),
  enrich: (batchSize = 20) =>
    request<
      {
        processed: number
        errors: Array<{ set_num: string; error: string }>
        missing_count?: number
      } & Stats
    >(`/api/enrich?batch_size=${batchSize}`, { method: 'POST' }, true),
  nobg: (batchSize = 6) =>
    request<
      {
        processed: number
        remaining: number
        errors: Array<{ set_num: string; error: string }>
      } & Stats
    >(`/api/nobg?batch_size=${batchSize}`, { method: 'POST' }),
  nobgStatus: () =>
    request<{
      total: number
      with_image: number
      transparent: number
      pending: number
    }>('/api/nobg/status'),
  exportExcel: () => {
    window.open('/api/export/excel', '_blank')
  },
  snapshot: () => request<Archive>('/api/session/snapshot'),
  restore: (archive: Archive) =>
    request<ListsPayload>('/api/session/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(archive),
    }),
  exportListPdf: async (listId: number, fallbackName: string) => {
    const res = await fetch(`/api/lists/${listId}/export/pdf`, {
      headers: { 'X-Device-Id': getDeviceId() },
    })
    if (!res.ok) throw new Error(await readError(res))
    const blob = await res.blob()
    const header = res.headers.get('Content-Disposition') || ''
    const star = /filename\*=UTF-8''([^;]+)/i.exec(header)
    const plain = /filename="([^"]+)"/i.exec(header)
    let filename = fallbackName
    if (star?.[1]) filename = decodeURIComponent(star[1])
    else if (plain?.[1]) filename = plain[1]
    if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf'
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  },
  startGuess: () => request<GuessRound>('/api/game/guess', { method: 'POST' }),
  checkGuess: (answer_set_num: string, guess_set_num: string) =>
    request<GuessResult>('/api/game/guess/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer_set_num, guess_set_num }),
    }),
  startWheel: () => request<WheelRound>('/api/game/wheel', { method: 'POST' }),
}
