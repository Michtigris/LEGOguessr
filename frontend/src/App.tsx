import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  api,
  loadArchive,
  saveArchive,
  type ArchiveSet,
  type GuessResult,
  type GuessRound,
  type SetList,
  type WheelRound,
} from './api'
import { SetWheel } from './SetWheel'
import { WorldCast, WorldNav, WorldSky } from './Worldscapes'
import { HOME_CHAPTERS, SCREEN_WORLD, WORLDS, type WorldId } from './worlds'

type Screen = 'home' | 'guess' | 'wheel'

function prettyName(name: string) {
  return name.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatRange([low, high]: [number, number]) {
  return `${low} – ${high}`
}

function AppMenu({
  lists,
  side,
  busy,
  listsOpen,
  hasActive,
  onToggleLists,
  onExport,
}: {
  lists: SetList[]
  side: 'left' | 'right'
  busy: boolean
  listsOpen: boolean
  hasActive: boolean
  onToggleLists: () => void
  onExport: (id: number) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`export-menu side-${side}`} ref={rootRef}>
      <button
        type="button"
        className={`list-icon-btn ${open || listsOpen ? 'active' : ''}`}
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Menu"
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path fill="currentColor" d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
        </svg>
        {hasActive && <span className="list-dot" />}
      </button>
      {open && (
        <div className="export-popover" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onToggleLists()
            }}
          >
            <strong>{listsOpen ? 'Fermer les listes' : 'Listes de sets'}</strong>
            <small>{listsOpen ? 'fermer' : 'gérer'}</small>
          </button>
          <p className="export-popover-title">Exporter en PDF</p>
          {!lists.length ? (
            <p className="export-empty">Aucune liste pour l’instant.</p>
          ) : (
            <ul>
              {lists.map((list) => (
                <li key={list.id}>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy || list.total === 0}
                    onClick={() => {
                      setOpen(false)
                      onExport(list.id)
                    }}
                  >
                    <strong>{prettyName(list.name)}</strong>
                    <small>{list.total ? `${list.total} sets` : 'vide'}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function SetImage({
  src,
  alt,
  label,
}: {
  src?: string | null
  alt: string
  label?: string
}) {
  const [broken, setBroken] = useState(!src)

  return broken || !src ? (
    <div className="img-fallback" aria-hidden={!alt}>
      <span className="img-fallback-kicker">SET</span>
      <strong>{label || alt || '???'}</strong>
    </div>
  ) : (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="set-img"
      onError={() => setBroken(true)}
    />
  )
}

function SetPlate({
  src,
  alt,
  fallback = false,
  label,
}: {
  src?: string | null
  alt: string
  fallback?: boolean
  label?: string
}) {
  if (!src && !fallback) return <div className="set-plate" />
  return (
    <div className="set-plate">
      <SetImage src={src} alt={alt} label={label || alt} />
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [listsOpen, setListsOpen] = useState(false)
  const [lists, setLists] = useState<SetList[]>([])
  const [activeListId, setActiveListId] = useState<number | null>(null)
  const [active, setActive] = useState<SetList | null>(null)

  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageOk, setMessageOk] = useState(false)

  const [newListName, setNewListName] = useState('')
  const [selectedListId, setSelectedListId] = useState<number | null>(null)
  const createFileRef = useRef<HTMLInputElement>(null)
  const updateFileRef = useRef<HTMLInputElement>(null)

  const [guessRound, setGuessRound] = useState<GuessRound | null>(null)
  const [guessResult, setGuessResult] = useState<GuessResult | null>(null)
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null)
  const [eliminated, setEliminated] = useState<Set<string>>(new Set())
  const [bonusCredits, setBonusCredits] = useState(2)
  const [unlockedBonuses, setUnlockedBonuses] = useState<Set<string>>(new Set())

  const [wheelRound, setWheelRound] = useState<WheelRound | null>(null)
  const [wheelSpinning, setWheelSpinning] = useState(false)
  const [wheelRevealed, setWheelRevealed] = useState(false)
  const [burgerSide, setBurgerSide] = useState<'left' | 'right'>('right')
  const [showcase, setShowcase] = useState<ArchiveSet[]>([])
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [world, setWorld] = useState<WorldId>('tatooine')
  const enrichBoot = useRef(false)
  const chapterRefs = useRef<Partial<Record<WorldId, HTMLElement | null>>>({})
  const navLock = useRef(false)
  const heroRowRef = useRef<HTMLDivElement>(null)
  const brandRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    const row = heroRowRef.current
    const brand = brandRef.current
    if (!row || !brand) return

    function placeBurger() {
      if (!row || !brand) return
      const range = document.createRange()
      range.selectNodeContents(brand)
      const textWidth = range.getBoundingClientRect().width
      const rowGap = parseFloat(getComputedStyle(row).columnGap || '16') || 16
      const button = 52
      const needed = textWidth + rowGap + button
      setBurgerSide(needed <= row.clientWidth + 1 ? 'right' : 'left')
    }

    placeBurger()
    const observer = new ResizeObserver(placeBurger)
    observer.observe(row)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (screen !== 'home') return
    let cancel = false
    api
      .snapshot()
      .then((snap) => {
        if (cancel) return
        const list = snap.lists.find((item) => item.active) ?? snap.lists[0]
        const photos = (list?.sets ?? []).filter((set) => set.set_img_url)
        setShowcase(photos.slice(0, 7))
      })
      .catch(() => {
        if (!cancel) setShowcase([])
      })
    return () => {
      cancel = true
    }
  }, [screen, active?.id, active?.enriched])

  useEffect(() => {
    if (listsOpen) {
      setWorld(SCREEN_WORLD.lists)
      return
    }
    if (screen === 'guess') {
      setWorld(SCREEN_WORLD.guess)
      return
    }
    if (screen === 'wheel') {
      setWorld(SCREEN_WORLD.wheel)
      return
    }

    const nodes = HOME_CHAPTERS.map((chapter) => chapterRefs.current[chapter.id]).filter(
      (node): node is HTMLElement => !!node,
    )
    if (!nodes.length) {
      setWorld('tatooine')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top ||
              b.intersectionRatio - a.intersectionRatio,
          )[0]
        const id = visible?.target.getAttribute('data-world') as WorldId | null
        if (id && WORLDS[id]) setWorld(id)
      },
      { root: null, threshold: [0.2, 0.45, 0.65], rootMargin: '-12% 0px -42% 0px' },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [screen, listsOpen, showcase.length])

  const refreshLists = useCallback(async () => {
    let data = await api.lists()
    const archive = loadArchive()
    if (
      archive &&
      (archive.revision > (data.revision ?? 0) ||
        (data.lists.length === 0 && archive.lists.length > 0))
    ) {
      data = await api.restore(archive)
    }
    if (
      !archive ||
      archive.revision !== data.revision ||
      archive.lists.length !== data.lists.length
    ) {
      try {
        saveArchive(await api.snapshot())
      } catch {
        /* l'affichage des listes ne dépend pas de la copie locale */
      }
    }
    setLists(data.lists)
    setActiveListId(data.active_list_id)
    setActive(data.active)
    return data
  }, [])

  useEffect(() => {
    void refreshLists().catch(() => undefined)
  }, [refreshLists])

  function flash(ok: boolean, text: string) {
    setMessageOk(ok)
    setMessage(text)
  }

  function requireListOrOpen(): boolean {
    if (!lists.length) {
      setListsOpen(true)
      flash(false, 'Ajoute au moins une grande liste Excel (Film, Série, Jeux…) avant de jouer.')
      return false
    }
    if (!activeListId) {
      setListsOpen(true)
      flash(false, 'Sélectionne une liste pour piocher dedans.')
      return false
    }
    return true
  }

  async function enrichActive() {
    if (!requireListOrOpen()) return
    setBusy(true)
    try {
      let total = 0
      let pending = active?.pending ?? 1
      for (let step = 0; step < 40 && pending > 0; step += 1) {
        const result = await api.enrich(40)
        total += result.processed
        pending = result.pending ?? 0
        flash(true, `Infos et photos : ${total} sets récupérés…`)
        if (result.processed === 0) break
      }
      await refreshLists()
      flash(
        true,
        total
          ? `Infos récupérées : ${total} sets (nom, année, pièces, photo).`
          : 'Aucune info nouvelle. Réessaie dans un instant.',
      )
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Enrichissement impossible')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (enrichBoot.current || busy) return
    if (!active || active.pending <= 0) return
    enrichBoot.current = true
    void enrichActive()
  }, [active, busy])

  async function removeBackgrounds() {
    if (!requireListOrOpen()) return
    setBusy(true)
    try {
      let remaining = 1
      let total = 0
      let loops = 0
      while (remaining > 0 && loops < 80) {
        const result = await api.nobg(4)
        total += result.processed
        remaining = result.remaining
        loops += 1
        await refreshLists()
        flash(true, `Fonds transparents : ${total} traités · ${remaining} restants…`)
        if (result.processed === 0) break
      }
      flash(true, `Fonds transparents terminés (${total} images).`)
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Échec suppression de fond')
    } finally {
      setBusy(false)
    }
  }

  async function createList(file: File | null) {
    if (!file) return
    const name = newListName.trim() || file.name.replace(/\.(csv|xlsx|xlsm)$/i, '')
    setBusy(true)
    try {
      const result = await api.createList(name, file)
      setLists(result.lists)
      setActiveListId(result.active_list_id)
      setActive(result.active)
      setNewListName('')
      await refreshLists()
      const enriched = result.active?.enriched ?? result.list.enriched
      const deferred = (result as { enrich?: { deferred?: boolean } }).enrich?.deferred
      flash(
        true,
        deferred
          ? `Liste « ${result.list.name} » : ${result.imported} sets importés. Clique ensuite « Récupérer les infos Rebrickable ».`
          : `Liste « ${result.list.name} » : ${result.imported} sets importés, ${enriched} enrichis (photo, année, pièces…).`,
      )
      if (createFileRef.current) createFileRef.current.value = ''
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Création impossible')
    } finally {
      setBusy(false)
    }
  }

  async function updateSelected(file: File | null) {
    if (!file || selectedListId == null) return
    setBusy(true)
    try {
      const result = await api.updateList(selectedListId, file)
      setLists(result.lists)
      setActiveListId(result.active_list_id)
      setActive(result.active)
      await refreshLists()
      const enriched = result.active?.enriched ?? result.list.enriched
      const deferred = (result as { enrich?: { deferred?: boolean } }).enrich?.deferred
      flash(
        true,
        deferred
          ? `Liste mise à jour : ${result.imported} sets. Clique « Récupérer les infos Rebrickable » pour les photos.`
          : `Liste mise à jour : ${result.imported} sets, ${enriched} enrichis. Nom conservé.`,
      )
      if (updateFileRef.current) updateFileRef.current.value = ''
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Mise à jour impossible')
    } finally {
      setBusy(false)
    }
  }

  async function selectList(id: number) {
    setBusy(true)
    try {
      const result = await api.selectList(id)
      setLists(result.lists)
      setActiveListId(result.active_list_id)
      setActive(result.active)
      setSelectedListId(id)
      flash(true, `Liste « ${prettyName(result.active?.name || '')} » sélectionnée.`)
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Sélection impossible')
    } finally {
      setBusy(false)
    }
  }

  async function renameList(id: number) {
    const name = renameValue.trim()
    if (!name) return
    setBusy(true)
    try {
      const result = await api.renameList(id, name)
      setLists(result.lists)
      setActiveListId(result.active_list_id)
      setActive(result.active)
      setRenamingId(null)
      flash(true, `Liste renommée « ${prettyName(name)} ».`)
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Renommage impossible')
    } finally {
      setBusy(false)
    }
  }

  async function deleteList(id: number) {
    const target = lists.find((l) => l.id === id)
    if (!target) return
    if (!window.confirm(`Effacer la liste « ${prettyName(target.name)} » ?`)) return
    setBusy(true)
    try {
      const result = await api.deleteList(id)
      setLists(result.lists)
      setActiveListId(result.active_list_id)
      setActive(result.active)
      if (selectedListId === id) setSelectedListId(null)
      flash(true, 'Liste effacée.')
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Suppression impossible')
    } finally {
      setBusy(false)
    }
  }

  async function exportListPdf(id: number) {
    const target = lists.find((list) => list.id === id)
    if (!target) return
    setBusy(true)
    flash(true, `Création du PDF « ${target.name} »…`)
    try {
      await api.exportListPdf(id, target.name)
      flash(true, `PDF « ${target.name} » téléchargé.`)
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Export PDF impossible')
    } finally {
      setBusy(false)
    }
  }

  async function openGuess() {
    if (!requireListOrOpen()) return
    setBusy(true)
    setGuessResult(null)
    setSelectedGuess(null)
    setEliminated(new Set())
    setUnlockedBonuses(new Set())
    try {
      const round = await api.startGuess()
      setGuessRound(round)
      setBonusCredits(round.bonus_credits ?? 2)
      setScreen('guess')
      setListsOpen(false)
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Impossible de lancer Guess')
      setListsOpen(true)
    } finally {
      setBusy(false)
    }
  }

  function toggleEliminate(setNum: string) {
    if (guessResult) return
    setEliminated((prev) => {
      const next = new Set(prev)
      if (next.has(setNum)) next.delete(setNum)
      else next.add(setNum)
      return next
    })
  }

  function unlockBonus(key: string) {
    if (guessResult || unlockedBonuses.has(key) || bonusCredits <= 0) return
    setUnlockedBonuses((prev) => new Set(prev).add(key))
    setBonusCredits((c) => c - 1)
  }

  async function submitGuess(guess: string) {
    if (!guessRound || guessResult) return
    setSelectedGuess(guess)
    setBusy(true)
    try {
      setGuessResult(await api.checkGuess(guessRound.answer_set_num, guess))
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  async function openWheel() {
    if (!requireListOrOpen()) return
    setBusy(true)
    setWheelRevealed(false)
    setWheelSpinning(false)
    try {
      const round = await api.startWheel()
      setWheelRound(round)
      setScreen('wheel')
      setListsOpen(false)
      // kick spin on next tick
      window.setTimeout(() => setWheelSpinning(true), 80)
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Impossible de lancer la roue')
      setListsOpen(true)
    } finally {
      setBusy(false)
    }
  }

  async function respinWheel() {
    setBusy(true)
    setWheelRevealed(false)
    setWheelSpinning(false)
    try {
      const round = await api.startWheel()
      setWheelRound(round)
      window.setTimeout(() => setWheelSpinning(true), 80)
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Impossible de relancer')
    } finally {
      setBusy(false)
    }
  }

  const setCount = lists.reduce((total, list) => total + list.total, 0)
  const worldMeta = WORLDS[world]
  const surface = listsOpen ? 'lists' : screen

  function jumpToWorld(id: WorldId) {
    const node = chapterRefs.current[id]
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setWorld(id)
  }

  return (
    <div
      className={`app app-${surface} world-${world} ink-${worldMeta.ink} ${
        listsOpen || screen !== 'home' ? 'app-panel' : 'app-home'
      }`}
    >
      <WorldSky world={world} />
      <WorldCast world={world} />
      {screen === 'home' && !listsOpen && (
        <WorldNav active={world} onJump={jumpToWorld} />
      )}
      <header className="top-hero">
        <div className={`top-hero-row burger-${burgerSide}`} ref={heroRowRef}>
          <button
            type="button"
            className="brand"
            ref={brandRef}
            onClick={() => {
              setScreen('home')
              setListsOpen(false)
            }}
          >
            LEGO Guessr
          </button>
          <AppMenu
            lists={lists}
            side={burgerSide}
            busy={busy}
            listsOpen={listsOpen}
            hasActive={!!active}
            onToggleLists={() => setListsOpen((open) => !open)}
            onExport={(id) => void exportListPdf(id)}
          />
        </div>
      </header>

      {message && screen !== 'home' && !listsOpen && (
        <div className={`message ${messageOk ? 'ok' : ''}`}>{message}</div>
      )}

      {listsOpen && (
        <section className="panel lists-panel">
          <div className="topbar">
            <div>
              <p className="eyebrow">Coruscant · Archives</p>
              <h2>Tes listes</h2>
              <p className="lead">
                Un Excel suffit : numéro de set, quantité, version. La quantité
                pèse dans la roue, le Guess tire des sets uniques. Tout reste
                dans ce navigateur.
              </p>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setListsOpen(false)}>
              Fermer
            </button>
          </div>

          {!lists.length && (
            <p className="note">
              Aucune liste pour l’instant. Importe un Excel pour commencer.
            </p>
          )}

          <ul className="list-rows">
            {lists.map((list) => {
              const isActive = list.id === activeListId
              const isFocused = list.id === selectedListId
              return (
                <li
                  key={list.id}
                  className={`list-row ${isActive ? 'active' : ''} ${isFocused ? 'focused' : ''}`}
                >
                  {renamingId === list.id ? (
                    <form
                      className="rename-form"
                      onSubmit={(event) => {
                        event.preventDefault()
                        void renameList(list.id)
                      }}
                    >
                      <input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        aria-label="Nouveau nom"
                        autoFocus
                      />
                      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
                        OK
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setRenamingId(null)}
                      >
                        Annuler
                      </button>
                    </form>
                  ) : (
                    <button
                      type="button"
                      className="list-row-main"
                      onClick={() => setSelectedListId(list.id)}
                    >
                      <strong>{prettyName(list.name)}</strong>
                      <small>
                        {list.total} sets · {list.enriched} scannés
                        {isActive ? ' · active' : ''}
                      </small>
                    </button>
                  )}
                  <div className="list-row-actions">
                    <button
                      type="button"
                      className="btn btn-blue btn-sm"
                      disabled={busy || isActive}
                      onClick={() => void selectList(list.id)}
                    >
                      Sélectionner
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={busy}
                      onClick={() => {
                        setRenamingId(list.id)
                        setRenameValue(prettyName(list.name))
                      }}
                    >
                      Renommer
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={busy}
                      onClick={() => {
                        setSelectedListId(list.id)
                        updateFileRef.current?.click()
                      }}
                    >
                      Mettre à jour
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() => void deleteList(list.id)}
                    >
                      Effacer
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>

          <input
            ref={updateFileRef}
            type="file"
            accept=".xlsx,.xlsm,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            onChange={(e) => void updateSelected(e.target.files?.[0] ?? null)}
          />

          <div className="create-box">
            <h3>Nouvelle liste</h3>
            <div className="row">
              <div className="field">
                <label htmlFor="listName">Nom (ex. Film, Série, Jeux…)</label>
                <input
                  id="listName"
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="Film"
                />
              </div>
            </div>
            <div className="row" style={{ marginTop: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => createFileRef.current?.click()}
              >
                Importer un Excel…
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy || !activeListId}
                onClick={() => void enrichActive()}
              >
                {busy ? 'Récupération…' : 'Récupérer les infos Rebrickable'}
              </button>
              <button
                type="button"
                className="btn btn-blue"
                disabled={busy || !activeListId}
                onClick={() => void removeBackgrounds()}
                title="rembg local — enlève le fond blanc une fois par set"
              >
                Fonds transparents
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={!activeListId}
                onClick={() => api.exportExcel()}
              >
                Excel
              </button>
            </div>
            <input
              ref={createFileRef}
              type="file"
              accept=".xlsx,.xlsm,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              hidden
              onChange={(e) => void createList(e.target.files?.[0] ?? null)}
            />
          </div>

          {message && (
            <div className={`message ${messageOk ? 'ok' : ''}`}>{message}</div>
          )}
        </section>
      )}

      {screen === 'home' && !listsOpen && (
        <main className="stage">
          <p className="world-chip">
            <span>{worldMeta.name}</span>
            {worldMeta.vibe}
          </p>

          <section
            className="chapter"
            data-world="tatooine"
            ref={(node) => {
              chapterRefs.current.tatooine = node
            }}
          >
            <div className="stage-top">
              <section className="hero">
                <p className="eyebrow">Transmission · {HOME_CHAPTERS[0].title}</p>
                <h1 className="hero-title">
                  Quel set
                  <br />
                  est-ce ?
                </h1>
                <p className="hero-lead">
                  Voyage entre les mondes. Charge une liste, lance une mission.
                  Quatre suspects, trois indices, une roue.
                </p>
                <dl className="stats">
                  <div>
                    <dt>Listes</dt>
                    <dd>{lists.length}</dd>
                  </div>
                  <div>
                    <dt>Sets</dt>
                    <dd>{setCount}</dd>
                  </div>
                  <div>
                    <dt>Liste active</dt>
                    <dd>{active ? prettyName(active.name) : '—'}</dd>
                  </div>
                </dl>
              </section>

              <section className="home-modes">
                <button
                  type="button"
                  className="mission mission-guess"
                  disabled={busy}
                  onClick={() => void openGuess()}
                >
                  <span className="mission-studs" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="mission-kicker">Mustafar · 01</span>
                  <span className="mission-title">Guess</span>
                  <span className="mission-desc">
                    Indices, éliminations, un seul set. Trouve-le avant de
                    valider.
                  </span>
                  <span className="mission-stamp">SCAN</span>
                </button>
                <button
                  type="button"
                  className="mission mission-wheel"
                  disabled={busy}
                  onClick={() => void openWheel()}
                >
                  <span className="mission-ring" aria-hidden="true" />
                  <span className="mission-kicker">Scarif · 02</span>
                  <span className="mission-title">Roue</span>
                  <span className="mission-desc">
                    Tourne. Trois sets sortent de la liste active, photo et
                    stats.
                  </span>
                </button>
              </section>
            </div>
          </section>

          <section
            className="chapter"
            data-world="kashyyyk"
            ref={(node) => {
              chapterRefs.current.kashyyyk = node
            }}
          >
            <header className="chapter-head">
              <p className="eyebrow">Kashyyyk</p>
              <h2>{HOME_CHAPTERS[1].title}</h2>
              <p className="hero-lead">{HOME_CHAPTERS[1].lead}</p>
            </header>
            {showcase.length > 0 ? (
              <div className="rail" aria-label="Aperçu de la liste active">
                {showcase.map((set) => (
                  <figure className="polaroid" key={set.set_num}>
                    <div className="polaroid-frame">
                      <SetImage
                        src={set.set_img_url}
                        alt={prettyName(set.name || set.set_num)}
                        label={set.set_num.replace(/-\d+$/, '')}
                      />
                    </div>
                    <figcaption>{prettyName(set.name || set.set_num)}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <p className="note">Importe une liste : les photos pousseront ici.</p>
            )}
          </section>

          <section
            className="chapter"
            data-world="kamino"
            ref={(node) => {
              chapterRefs.current.kamino = node
            }}
          >
            <header className="chapter-head">
              <p className="eyebrow">Kamino</p>
              <h2>{HOME_CHAPTERS[2].title}</h2>
              <p className="hero-lead">{HOME_CHAPTERS[2].lead}</p>
            </header>
            <div className="platform-steps">
              <article>
                <span>01</span>
                <h3>Importe</h3>
                <p>Excel, wishlist, Rebrickable. Le menu ouvre Coruscant.</p>
              </article>
              <article>
                <span>02</span>
                <h3>Scan</h3>
                <p>Noms, photos, années et pièces : la pluie de données.</p>
              </article>
              <article>
                <span>03</span>
                <h3>Mission</h3>
                <p>Guess sur Mustafar, roue sur Scarif, PDF catalogue.</p>
              </article>
            </div>
          </section>

          <section
            className="chapter"
            data-world="hoth"
            ref={(node) => {
              chapterRefs.current.hoth = node
            }}
          >
            <header className="chapter-head">
              <p className="eyebrow">Hoth</p>
              <h2>{HOME_CHAPTERS[3].title}</h2>
              <p className="hero-lead">{HOME_CHAPTERS[3].lead}</p>
            </header>
            <div className="ice-card">
              <strong>Parade image manquante</strong>
              <p>
                Si Rebrickable n’a pas la photo, une plaque froide affiche le
                numéro du set. Les fonds blancs fondent dans le cadre.
              </p>
            </div>
          </section>

          <section
            className="chapter"
            data-world="scarif"
            ref={(node) => {
              chapterRefs.current.scarif = node
            }}
          >
            <header className="chapter-head">
              <p className="eyebrow">Scarif</p>
              <h2>{HOME_CHAPTERS[4].title}</h2>
              <p className="hero-lead">{HOME_CHAPTERS[4].lead}</p>
            </header>
            <button
              type="button"
              className="mission mission-wheel mission-inline"
              disabled={busy}
              onClick={() => void openWheel()}
            >
              <span className="mission-kicker">Lancer la roue</span>
              <span className="mission-title">Scarif spin</span>
              <span className="mission-desc">Trois sets, soleil et lagon.</span>
            </button>
          </section>

          <section
            className="chapter"
            data-world="endor"
            ref={(node) => {
              chapterRefs.current.endor = node
            }}
          >
            <header className="chapter-head">
              <p className="eyebrow">Endor</p>
              <h2>{HOME_CHAPTERS[5].title}</h2>
              <p className="hero-lead">{HOME_CHAPTERS[5].lead}</p>
            </header>
            <div className="steps">
              <article>
                <span>01</span>
                <h3>Menu</h3>
                <p>Listes, rename, PDF, Excel.</p>
              </article>
              <article>
                <span>02</span>
                <h3>Jouer</h3>
                <p>Guess ou roue selon l’humeur.</p>
              </article>
              <article>
                <span>03</span>
                <h3>Garder</h3>
                <p>Tes archives restent dans ce navigateur.</p>
              </article>
            </div>
          </section>

          <section
            className="chapter"
            data-world="geonosis"
            ref={(node) => {
              chapterRefs.current.geonosis = node
            }}
          >
            <header className="chapter-head">
              <p className="eyebrow">Geonosis</p>
              <h2>{HOME_CHAPTERS[6].title}</h2>
              <p className="hero-lead">{HOME_CHAPTERS[6].lead}</p>
            </header>
            <button
              type="button"
              className="mission mission-guess mission-inline"
              disabled={busy}
              onClick={() => void openGuess()}
            >
              <span className="mission-kicker">Entrer dans l’arène</span>
              <span className="mission-title">Guess</span>
              <span className="mission-desc">Quatre suspects. Un seul vrai.</span>
            </button>
          </section>

          <section
            className="chapter"
            data-world="mustafar"
            ref={(node) => {
              chapterRefs.current.mustafar = node
            }}
          >
            <header className="chapter-head">
              <p className="eyebrow">Mustafar</p>
              <h2>{HOME_CHAPTERS[7].title}</h2>
              <p className="hero-lead">{HOME_CHAPTERS[7].lead}</p>
            </header>
            <p className="ember-note">
              Les bonus coûtent cher. La lave ne pardonne pas un mauvais guess.
            </p>
          </section>

          <section
            className="chapter chapter-last"
            data-world="coruscant"
            ref={(node) => {
              chapterRefs.current.coruscant = node
            }}
          >
            <header className="chapter-head">
              <p className="eyebrow">Coruscant</p>
              <h2>{HOME_CHAPTERS[8].title}</h2>
              <p className="hero-lead">{HOME_CHAPTERS[8].lead}</p>
            </header>
            <div className="city-cta">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setListsOpen(true)}
              >
                Ouvrir les archives
              </button>
              <p className="muted">
                Tours, néons, listes. Le burger reste ton portail.
              </p>
            </div>
          </section>

          {message && <div className={`message ${messageOk ? 'ok' : ''}`}>{message}</div>}
        </main>
      )}

      {screen === 'guess' && guessRound && (
        <section className="panel">
          <div className="topbar">
            <div>
              <p className="eyebrow">Mustafar</p>
              <h2>Guess aléatoire</h2>
              <p className="muted" style={{ margin: 0 }}>
                Clique une case pour l’éliminer · ✓ pour valider ton guess
              </p>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setScreen('home')}>
              Accueil
            </button>
          </div>

          <div className="guess-layout">
            <div className="guess-main">
              <div className="clues">
                <div className="clue">
                  <span>Année</span>
                  <strong>
                    {unlockedBonuses.has('year')
                      ? String(guessRound.bonuses.year_exact ?? '—')
                      : formatRange(guessRound.clues.year_range)}
                  </strong>
                </div>
                <div className="clue">
                  <span>Pièces</span>
                  <strong>
                    {unlockedBonuses.has('parts')
                      ? String(guessRound.bonuses.parts_exact ?? '—')
                      : formatRange(guessRound.clues.parts_range)}
                  </strong>
                </div>
                <div className="clue">
                  <span>Figurines</span>
                  <strong>
                    {unlockedBonuses.has('figs')
                      ? String(guessRound.bonuses.figs_exact ?? '—')
                      : formatRange(guessRound.clues.minifigs_range)}
                  </strong>
                </div>
              </div>

              {unlockedBonuses.has('peek') && guessRound.bonuses.peek_img && (
                <div className="bonus-peek">
                  <span>Aperçu bonus</span>
                  <SetPlate src={guessRound.bonuses.peek_img} alt="Aperçu flou" />
                </div>
              )}

              {unlockedBonuses.has('letter') && (
                <div className="bonus-letter">
                  Initiale du nom : <strong>{guessRound.bonuses.letter}</strong>
                </div>
              )}

              <div className="choices choices-visual">
                {guessRound.choices.map((choice) => {
                  const isGuess = selectedGuess === choice.set_num
                  const isAnswer = guessResult?.answer.set_num === choice.set_num
                  const isOut = eliminated.has(choice.set_num)
                  let className = 'choice visual'
                  if (isOut && !guessResult) className += ' eliminated'
                  if (guessResult && isAnswer) className += ' correct'
                  if (guessResult && isGuess && !guessResult.correct) className += ' wrong'
                  return (
                    <div key={choice.set_num} className={className}>
                      <button
                        type="button"
                        className="choice-face"
                        disabled={busy || !!guessResult}
                        onClick={() => toggleEliminate(choice.set_num)}
                        title="Griser / dégriser"
                      >
                        <SetPlate
                          src={choice.set_img_url}
                          alt={choice.name}
                          fallback
                        />
                        <div className="meta">
                          <strong>{choice.name}</strong>
                          <small>{choice.set_num}</small>
                        </div>
                        {isOut && !guessResult && <span className="elim-stamp">Éliminé</span>}
                      </button>
                      {!guessResult && !isOut && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm guess-confirm"
                          disabled={busy}
                          onClick={() => void submitGuess(choice.set_num)}
                        >
                          ✓ Deviner
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <aside className="bonus-panel">
              <h3>Bonus</h3>
              <p className="muted">
                Crédits : <strong>{bonusCredits}</strong>
              </p>
              <div className="bonus-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={
                    !!guessResult || bonusCredits <= 0 || unlockedBonuses.has('peek')
                  }
                  onClick={() => unlockBonus('peek')}
                >
                  Aperçu flou
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={
                    !!guessResult || bonusCredits <= 0 || unlockedBonuses.has('letter')
                  }
                  onClick={() => unlockBonus('letter')}
                >
                  Initiale
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={
                    !!guessResult || bonusCredits <= 0 || unlockedBonuses.has('year')
                  }
                  onClick={() => unlockBonus('year')}
                >
                  Année exacte
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={
                    !!guessResult || bonusCredits <= 0 || unlockedBonuses.has('parts')
                  }
                  onClick={() => unlockBonus('parts')}
                >
                  Pièces exactes
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={
                    !!guessResult || bonusCredits <= 0 || unlockedBonuses.has('figs')
                  }
                  onClick={() => unlockBonus('figs')}
                >
                  Figs exactes
                </button>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginTop: '0.75rem', width: '100%' }}
                disabled={!!guessResult || eliminated.size === 0}
                onClick={() => setEliminated(new Set())}
              >
                Réafficher tout
              </button>
            </aside>
          </div>

          {guessResult && (
            <div className={`reveal ${guessResult.correct ? 'win' : 'lose'}`}>
              <SetPlate
                src={guessResult.answer.set_img_url}
                alt={guessResult.answer.name ?? guessResult.answer.set_num}
                fallback
              />
              <div>
                <h3 style={{ marginTop: 0 }}>
                  {guessResult.correct ? 'Bravo !' : 'Raté…'}
                </h3>
                <p style={{ margin: '0 0 0.4rem' }}>
                  <strong>{guessResult.answer.name}</strong> ({guessResult.answer.set_num})
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  {guessResult.answer.year} · {guessResult.answer.num_parts} pièces ·{' '}
                  {guessResult.answer.num_minifigs} figurines
                </p>
                <div className="row" style={{ marginTop: '0.9rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void openGuess()}
                  >
                    Nouvelle manche
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {screen === 'wheel' && wheelRound && (
        <section className="panel">
          <div className="topbar">
            <div>
              <p className="eyebrow">Scarif</p>
              <h2>Roue des sets</h2>
              <p className="muted" style={{ margin: 0 }}>
                Tourne… puis découvre 3 sets de ta liste.
              </p>
            </div>
            <div className="row">
              <button
                type="button"
                className="btn btn-blue"
                disabled={busy || wheelSpinning}
                onClick={() => void respinWheel()}
              >
                Relancer
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setScreen('home')}>
                Accueil
              </button>
            </div>
          </div>

          <SetWheel
            segments={wheelRound.segments}
            spinning={wheelSpinning}
            onDone={() => {
              setWheelSpinning(false)
              setWheelRevealed(true)
            }}
          />

          {wheelRevealed && (
            <div className="trio-grid" style={{ marginTop: '1.25rem' }}>
              {wheelRound.sets.map((set) => (
                <article key={set.set_num} className="trio-card">
                  <SetPlate
                    src={set.set_img_url}
                    alt={set.name ?? set.set_num}
                    fallback
                  />
                  <div className="meta">
                    <strong>{set.name}</strong>
                    <small>{set.set_num}</small>
                    <small>
                      {set.year} · {set.num_parts} pièces
                    </small>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
