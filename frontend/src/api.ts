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
  startGuess: () => request<GuessRound>('/api/game/guess', { method: 'POST' }),
  checkGuess: (answer_set_num: string, guess_set_num: string) =>
    request<GuessResult>('/api/game/guess/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer_set_num, guess_set_num }),
    }),
  startWheel: () => request<WheelRound>('/api/game/wheel', { method: 'POST' }),
}
