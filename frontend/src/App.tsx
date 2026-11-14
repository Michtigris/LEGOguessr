import { useCallback, useEffect, useRef, useState } from 'react'
import {
  api,
  loadArchive,
  saveArchive,
  type ArchiveSet,
  type ExploreSet,
  type GuessResult,
  type GuessRound,
  type MinifigResult,
  type MinifigRound,
  type SetList,
  type UniversePack,
  type WheelRound,
} from './api'
import { SetWheel } from './SetWheel'
import { WorldCast, WorldNav, WorldSky } from './Worldscapes'
import { HOME_CHAPTERS, SCREEN_WORLD, WORLDS, type WorldId } from './worlds'

type Screen = 'home' | 'guess' | 'wheel' | 'minifig'

function prettyName(name: string) {
  return name.replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatRange([low, high]: [number, number]) {
  return `${low} – ${high}`
}

function AppMenu({
  open,
  listsOpen,
  hasActive,
  busy,
  onClose,
  onHome,
  onToggleLists,
  onExplore,
  onGuess,
  onMinifig,
  onWheel,
}: {
  open: boolean
  listsOpen: boolean
  hasActive: boolean
  busy: boolean
  onClose: () => void
  onHome: () => void
  onToggleLists: () => void
  onExplore: () => void
  onGuess: () => void
  onMinifig: () => void
  onWheel: () => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onClose()
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="site-menu" ref={rootRef} role="menu">
      <button type="button" role="menuitem" onClick={onHome}>
        <strong>Accueil</strong>
        <small>voyage Tatooine → nuit</small>
      </button>
      <button type="button" role="menuitem" onClick={onToggleLists}>
        <strong>{listsOpen ? 'Fermer les listes' : 'Mes listes'}</strong>
        <small>{hasActive ? 'active prête' : 'importer / gérer'}</small>
      </button>
      <button type="button" role="menuitem" onClick={onExplore}>
        <strong>Explorer</strong>
        <small>SW · LOTR · Hobbit · sorties · MOCs</small>
      </button>
      <p className="site-menu-label">Mini-jeux</p>
      <button type="button" role="menuitem" disabled={busy} onClick={onGuess}>
        <strong>Guess sets</strong>
        <small>Mustafar · ta liste</small>
      </button>
      <button type="button" role="menuitem" disabled={busy} onClick={onMinifig}>
        <strong>Guess minifigs</strong>
        <small>catalogue Rebrickable</small>
      </button>
      <button type="button" role="menuitem" disabled={busy} onClick={onWheel}>
        <strong>Roue</strong>
        <small>Hoth · ta liste</small>
      </button>
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
      referrerPolicy="no-referrer"
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [showcase, setShowcase] = useState<ArchiveSet[]>([])
  const [universes, setUniverses] = useState<UniversePack[]>([])
  const [latestSets, setLatestSets] = useState<ExploreSet[]>([])
  const [mocs, setMocs] = useState<ExploreSet[]>([])
  const [exploreReady, setExploreReady] = useState(false)
  const [minifigRound, setMinifigRound] = useState<MinifigRound | null>(null)
  const [minifigResult, setMinifigResult] = useState<MinifigResult | null>(null)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [world, setWorld] = useState<WorldId>('tatooine')
  const enrichBoot = useRef(false)
  const chapterRefs = useRef<Partial<Record<WorldId, HTMLElement | null>>>({})
  const navLock = useRef(false)

  useEffect(() => {
    if (screen !== 'home') return
    let cancel = false
    api
      .snapshot()
      .then((snap) => {
        if (cancel) return
        const list = snap.lists.find((item) => item.active) ?? snap.lists[0]
        const photos = (list?.sets ?? []).filter((set) => set.set_img_url)
        setShowcase(photos.slice(0, 16))
      })
      .catch(() => {
        if (!cancel) setShowcase([])
      })
    return () => {
      cancel = true
    }
  }, [screen, active?.id, active?.enriched])

  useEffect(() => {
    let cancel = false
    void (async () => {
      try {
        const uni = await api.exploreUniverses(10)
        if (!cancel) setUniverses(uni.universes)
      } catch {
        /* catalogue optionnel */
      }
      try {
        const latest = await api.exploreLatest(16)
        if (!cancel) setLatestSets(latest.sets)
      } catch {
        /* catalogue optionnel */
      }
      try {
        const mocPack = await api.exploreMocs(10)
        if (!cancel) setMocs(mocPack.mocs)
      } catch {
        /* clé API absente → fallback serveur ou vide */
      }
      if (!cancel) setExploreReady(true)
    })()
    return () => {
      cancel = true
    }
  }, [])

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
    if (screen === 'minifig') {
      setWorld(SCREEN_WORLD.minifig)
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
        if (navLock.current) return
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio - a.intersectionRatio ||
              a.boundingClientRect.top - b.boundingClientRect.top,
          )[0]
        const id = visible?.target.getAttribute('data-world') as WorldId | null
        if (id && WORLDS[id]) setWorld(id)
      },
      { root: null, threshold: [0.15, 0.35, 0.55, 0.7], rootMargin: '-8% 0px -28% 0px' },
    )
    nodes.forEach((node) => observer.observe(node))
    return () => observer.disconnect()
  }, [screen, listsOpen, exploreReady, showcase.length])

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

  async function openMinifig() {
    setBusy(true)
    setMinifigResult(null)
    try {
      const round = await api.startMinifig()
      setMinifigRound(round)
      setScreen('minifig')
      setListsOpen(false)
      setMenuOpen(false)
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Impossible de lancer le guess minifig')
    } finally {
      setBusy(false)
    }
  }

  async function submitMinifig(guess: string) {
    if (!minifigRound || minifigResult) return
    setBusy(true)
    try {
      setMinifigResult(await api.checkMinifig(minifigRound.answer_fig_num, guess))
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Erreur')
    } finally {
      setBusy(false)
    }
  }

  const setCount = lists.reduce((total, list) => total + list.total, 0)
  const worldMeta = WORLDS[world]
  const surface = listsOpen ? 'lists' : screen

  function jumpToWorld(id: WorldId) {
    setScreen('home')
    setListsOpen(false)
    setMenuOpen(false)
    navLock.current = true
    setWorld(id)
    window.setTimeout(() => {
      chapterRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.setTimeout(() => {
        navLock.current = false
      }, 1100)
    }, 70)
  }

  function goHome() {
    jumpToWorld('tatooine')
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
      <header className="site-header">
        <button
          type="button"
          className="brand"
          onClick={() => goHome()}
        >
          LEGO Guessr
        </button>
        <nav className="site-nav" aria-label="Navigation principale">
          <button type="button" className="nav-link" onClick={() => jumpToWorld('coruscant')}>
            Explorer
          </button>
          <button
            type="button"
            className="nav-link"
            onClick={() => {
              setListsOpen(true)
              setMenuOpen(false)
            }}
          >
            Listes
          </button>
          <button
            type="button"
            className={`nav-burger ${menuOpen || listsOpen ? 'active' : ''}`}
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <span />
            <span />
            <span />
            {active && <i className="list-dot" />}
          </button>
        </nav>
        <AppMenu
          open={menuOpen}
          listsOpen={listsOpen}
          hasActive={!!active}
          busy={busy}
          onClose={() => setMenuOpen(false)}
          onHome={() => goHome()}
          onToggleLists={() => {
            setListsOpen((open) => !open)
            setMenuOpen(false)
          }}
          onExplore={() => jumpToWorld('coruscant')}
          onGuess={() => {
            setMenuOpen(false)
            void openGuess()
          }}
          onMinifig={() => {
            void openMinifig()
          }}
          onWheel={() => {
            setMenuOpen(false)
            void openWheel()
          }}
        />
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
                      className="btn btn-primary btn-sm"
                      disabled={busy || list.total === 0}
                      onClick={() => void exportListPdf(list.id)}
                      title="Créer un PDF de cette liste"
                    >
                      PDF
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

          {/* ——— 1–3. Tatooine : hero → coffre → missions ——— */}
          <section
            className="chapter"
            data-world="tatooine"
            ref={(node) => {
              chapterRefs.current.tatooine = node
            }}
          >
            <div className="chapter-hero">
              <section className="hero hero-solo">
                <p className="eyebrow">Tatooine</p>
                <h1 className="hero-title">
                  LEGO
                  <br />
                  Guessr
                </h1>
                <p className="hero-lead">
                  Ta collection devient un terrain de jeu. Descends : archives,
                  univers, sorties, puis reviens jouer.
                </p>
                <div className="hero-cta">
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => void openGuess()}
                  >
                    Lancer un Guess
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => jumpToWorld('coruscant')}
                  >
                    Explorer le catalogue
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setListsOpen(true)}>
                    Mes listes
                  </button>
                </div>
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
                    <dt>Active</dt>
                    <dd>{active ? prettyName(active.name) : '—'}</dd>
                  </div>
                </dl>
              </section>
              <div className="scroll-hint" aria-hidden="true">
                <span>Descendre</span>
                <i />
              </div>
            </div>

            {/* ——— 2. Vault collection ——— */}
            <div className="band surface surface-sand">
              <header className="band-head">
                <div>
                  <p className="eyebrow">Coffre</p>
                  <h2>Ta collection en vitrine</h2>
                  <p>
                    {showcase.length
                      ? `${showcase.length} sets de « ${prettyName(active?.name || 'ta liste')} » — le Guess pioche dedans.`
                      : 'Importe un Excel : les boîtes s’installent ici.'}
                  </p>
                </div>
                <button type="button" className="btn btn-ghost" onClick={() => setListsOpen(true)}>
                  Gérer
                </button>
              </header>
              {showcase.length > 0 ? (
                <div className="vault-grid">
                  {showcase.map((set, index) => (
                    <figure
                      key={set.set_num}
                      className={`vault-cell vault-cell-${(index % 5) + 1}`}
                    >
                      <SetImage
                        src={set.set_img_url}
                        alt={prettyName(set.name || set.set_num)}
                        label={set.set_num.replace(/-\d+$/, '')}
                      />
                      <figcaption>
                        <strong>{prettyName(set.name || set.set_num)}</strong>
                        <small>{set.set_num}</small>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <button type="button" className="empty-vault" onClick={() => setListsOpen(true)}>
                  <strong>Importer ta première liste</strong>
                  <span>Excel Rebrickable / wishlist — photos et stats suivent.</span>
                </button>
              )}
            </div>

            {/* ——— 3. Missions ——— */}
            <div className="band surface surface-ember">
              <header className="band-head">
                <div>
                  <p className="eyebrow">Missions</p>
                  <h2>Trois façons de jouer</h2>
                  <p>Guess sur ta liste, roue glacée sur Hoth, minifigs du catalogue mondial.</p>
                </div>
              </header>
              <div className="mission-lanes">
                <button
                  type="button"
                  className="lane lane-guess"
                  disabled={busy}
                  onClick={() => void openGuess()}
                >
                  <span className="lane-kicker">01 · Mustafar</span>
                  <strong>Guess sets</strong>
                  <span>Quatre suspects, indices, éliminations. Un seul gagnant.</span>
                </button>
                <button
                  type="button"
                  className="lane lane-wheel"
                  disabled={busy}
                  onClick={() => void openWheel()}
                >
                  <span className="lane-kicker">02 · Hoth</span>
                  <strong>Roue</strong>
                  <span>Tourne. Trois sets sortent de la liste active.</span>
                </button>
                <button
                  type="button"
                  className="lane lane-fig"
                  disabled={busy}
                  onClick={() => void openMinifig()}
                >
                  <span className="lane-kicker">03 · Geonosis</span>
                  <strong>Guess minifig</strong>
                  <span>Une photo Rebrickable, quatre noms. Qui est-ce ?</span>
                </button>
              </div>
            </div>
          </section>

          {/* ——— 4. Coruscant archives ——— */}
          <section
            className="chapter chapter-night-start"
            data-world="coruscant"
            ref={(node) => {
              chapterRefs.current.coruscant = node
            }}
          >
            <div className="night-gate surface surface-night">
              <p className="eyebrow">Coruscant · nuit</p>
              <h2>{HOME_CHAPTERS[1].title}</h2>
              <p className="hero-lead">
                Catalogue officiel Rebrickable — pas du remplissage : univers,
                sorties, MOCs.
              </p>
            </div>

            {!exploreReady && (
              <p className="note surface surface-night">Chargement du catalogue…</p>
            )}

            {universes.map((pack, packIndex) => {
              const hero = pack.sets[0]
              const rest = pack.sets.slice(1, 7)
              return (
                <article
                  key={pack.id}
                  className={`universe-spread surface surface-night spread-${packIndex}`}
                >
                  <header className="spread-head">
                    <div>
                      <p className="eyebrow">Univers</p>
                      <h3>{pack.name}</h3>
                      <p>{pack.total.toLocaleString('fr-FR')} sets dans le catalogue</p>
                    </div>
                  </header>
                  <div className="spread-body">
                    {hero && (
                      <a
                        className="spread-hero"
                        href={hero.set_url || `https://rebrickable.com/sets/${hero.set_num}/`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <SetImage
                          src={hero.set_img_url}
                          alt={prettyName(hero.name || hero.set_num)}
                          label={hero.set_num.replace(/-\d+$/, '')}
                        />
                        <div>
                          <strong>{prettyName(hero.name || hero.set_num)}</strong>
                          <small>
                            {hero.year ?? '—'} · {hero.num_parts ?? '?'} pcs
                          </small>
                        </div>
                      </a>
                    )}
                    <div className="spread-grid">
                      {rest.map((set) => (
                        <a
                          key={set.set_num}
                          className="spread-tile"
                          href={set.set_url || `https://rebrickable.com/sets/${set.set_num}/`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <SetImage
                            src={set.set_img_url}
                            alt={prettyName(set.name || set.set_num)}
                            label={set.set_num.replace(/-\d+$/, '')}
                          />
                          <span>{prettyName(set.name || set.set_num)}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </article>
              )
            })}

            <section className="band surface surface-night">
              <header className="band-head">
                <div>
                  <p className="eyebrow">Radar</p>
                  <h2>Dernières sorties</h2>
                  <p>Les sets retail les plus récents du dump Rebrickable.</p>
                </div>
              </header>
              <div className="poster-rail">
                {latestSets.map((set) => (
                  <a
                    key={set.set_num}
                    className="poster-card"
                    href={set.set_url || `https://rebrickable.com/sets/${set.set_num}/`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <SetPlate src={set.set_img_url} alt={prettyName(set.name || set.set_num)} fallback />
                    <div className="meta">
                      <strong>{prettyName(set.name || set.set_num)}</strong>
                      <small>
                        {set.year} · {set.num_parts ?? '?'} pcs
                      </small>
                    </div>
                  </a>
                ))}
              </div>
            </section>

            <section className="band surface surface-night">
              <header className="band-head">
                <div>
                  <p className="eyebrow">Atelier</p>
                  <h2>MOCs à surveiller</h2>
                  <p>Créations Rebrickable — API si clé, sinon sélection éditoriale.</p>
                </div>
              </header>
              <div className="moc-mosaic">
                {mocs.map((moc, index) => (
                  <a
                    key={moc.set_num}
                    className={`moc-card moc-${(index % 3) + 1}`}
                    href={moc.set_url || `https://rebrickable.com/mocs/${moc.set_num}/`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <SetPlate src={moc.set_img_url} alt={prettyName(moc.name || moc.set_num)} fallback />
                    <div className="meta">
                      <strong>{prettyName(moc.name || moc.set_num)}</strong>
                      <small>
                        {moc.year ?? 'MOC'}
                        {moc.designer ? ` · ${moc.designer}` : ''}
                      </small>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          </section>

          {/* ——— 5. Mustafar close ——— */}
          <footer
            className="chapter chapter-footer"
            data-world="mustafar"
            ref={(node) => {
              chapterRefs.current.mustafar = node
            }}
          >
            <div className="surface surface-lava finale">
              <p className="eyebrow">Mustafar</p>
              <h2>Fin de transmission</h2>
              <p className="hero-lead">
                Reviens jouer, enrichis une liste, ou exporte un PDF depuis tes archives.
              </p>
              <div className="finale-grid">
                <button type="button" className="finale-card" disabled={busy} onClick={() => void openGuess()}>
                  <span>Guess</span>
                  <strong>Nouvelle manche</strong>
                </button>
                <button type="button" className="finale-card" disabled={busy} onClick={() => void openWheel()}>
                  <span>Hoth</span>
                  <strong>Tourner la roue</strong>
                </button>
                <button type="button" className="finale-card" disabled={busy} onClick={() => void openMinifig()}>
                  <span>Minifig</span>
                  <strong>Qui est-ce ?</strong>
                </button>
                <button type="button" className="finale-card" onClick={() => setListsOpen(true)}>
                  <span>Archives</span>
                  <strong>Listes & PDF</strong>
                </button>
              </div>
            </div>
          </footer>

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

      {screen === 'minifig' && minifigRound && (
        <section className="panel">
          <div className="topbar">
            <div>
              <p className="eyebrow">Geonosis</p>
              <h2>Guess minifig</h2>
              <p className="muted" style={{ margin: 0 }}>
                Qui est cette figurine ? Quatre noms, une seule bonne réponse.
              </p>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setScreen('home')}>
              Accueil
            </button>
          </div>

          <div className="minifig-stage">
            <div className="minifig-portrait">
              <SetPlate
                key={minifigRound.answer_fig_num}
                src={minifigRound.image}
                alt="Figurine mystère"
                fallback
                label="FIG"
              />
            </div>
            <div className="minifig-choices">
              {minifigRound.choices.map((choice) => {
                const isGuess = minifigResult?.guess_fig_num === choice.fig_num
                const isAnswer = minifigResult?.answer.fig_num === choice.fig_num
                let className = 'btn btn-secondary minifig-choice'
                if (minifigResult && isAnswer) className += ' is-correct'
                if (minifigResult && isGuess && !minifigResult.correct) className += ' is-wrong'
                return (
                  <button
                    key={choice.fig_num}
                    type="button"
                    className={className}
                    disabled={busy || !!minifigResult}
                    onClick={() => void submitMinifig(choice.fig_num)}
                  >
                    {prettyName(choice.name)}
                  </button>
                )
              })}
            </div>
          </div>

          {minifigResult && (
            <div className={`reveal ${minifigResult.correct ? 'win' : 'lose'}`}>
              <SetPlate
                src={minifigResult.answer.fig_img_url || minifigRound.image}
                alt={minifigResult.answer.name}
                fallback
              />
              <div>
                <h3 style={{ marginTop: 0 }}>
                  {minifigResult.correct ? 'Bien vu !' : 'Raté…'}
                </h3>
                <p style={{ margin: '0 0 0.4rem' }}>
                  <strong>{prettyName(minifigResult.answer.name)}</strong>
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  {minifigResult.answer.fig_num}
                  {minifigResult.answer.num_parts
                    ? ` · ${minifigResult.answer.num_parts} pcs`
                    : ''}
                </p>
                <div className="row" style={{ marginTop: '0.9rem' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void openMinifig()}
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
              <p className="eyebrow">Hoth</p>
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
