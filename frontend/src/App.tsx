import { useCallback, useEffect, useRef, useState } from 'react'
import {
  api,
  type GuessResult,
  type GuessRound,
  type SetList,
  type WheelRound,
} from './api'
import { SetWheel } from './SetWheel'

type Screen = 'home' | 'guess' | 'wheel'

const SCENE_BY_SCREEN: Record<Screen, string> = {
  home: 'tatooine',
  guess: 'mustafar',
  wheel: 'coruscant',
}

function formatRange([low, high]: [number, number]) {
  return `${low} – ${high}`
}

function SetPlate({
  src,
  alt,
  fallback = false,
}: {
  src?: string | null
  alt: string
  fallback?: boolean
}) {
  return (
    <div className="set-plate">
      {src ? <img src={src} alt={alt} loading="lazy" /> : fallback ? <div className="img-fallback" /> : null}
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

  const refreshLists = useCallback(async () => {
    const data = await api.lists()
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
      const result = await api.enrich(50)
      await refreshLists()
      flash(
        true,
        `Infos récupérées : ${result.processed} sets. Tu peux ensuite enlever les fonds blancs.`,
      )
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Enrichissement impossible')
    } finally {
      setBusy(false)
    }
  }

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
      const enriched = result.active?.enriched ?? result.list.enriched
      flash(
        true,
        `Liste « ${result.list.name} » : ${result.imported} sets importés, ${enriched} enrichis (photo, année, pièces…).`,
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
      const enriched = result.active?.enriched ?? result.list.enriched
      flash(
        true,
        `Liste mise à jour : ${result.imported} sets, ${enriched} enrichis. Nom conservé.`,
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
      flash(true, `Liste « ${result.active?.name} » sélectionnée.`)
    } catch (err) {
      flash(false, err instanceof Error ? err.message : 'Sélection impossible')
    } finally {
      setBusy(false)
    }
  }

  async function deleteList(id: number) {
    const target = lists.find((l) => l.id === id)
    if (!target) return
    if (!window.confirm(`Effacer la liste « ${target.name} » ?`)) return
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

  return (
    <div className="app">
      <div className="scene-bg" aria-hidden="true">
        {(['tatooine', 'naboo', 'mustafar', 'coruscant'] as const).map((scene) => (
          <div
            key={scene}
            className={`scene-bg-layer ${scene} ${
              (listsOpen ? 'naboo' : SCENE_BY_SCREEN[screen]) === scene ? 'visible' : ''
            }`}
          />
        ))}
        <div className="scene-bg-veil" />
      </div>

      <header className="top-hero">
        <div className="top-hero-row">
          <h1 className="brand">LEGO Guessr</h1>
          <button
            type="button"
            className={`list-icon-btn ${listsOpen ? 'active' : ''}`}
            aria-label="Listes de sets (Film, Série, Jeux…)"
            title="Listes de sets"
            onClick={() => setListsOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                fill="currentColor"
                d="M4 6h2v2H4V6zm0 5h2v2H4v-2zm0 5h2v2H4v-2zm4-10h12v2H8V6zm0 5h12v2H8v-2zm0 5h12v2H8v-2z"
              />
            </svg>
            {active && <span className="list-dot" />}
          </button>
        </div>
        <p className="tagline">
          {active ? (
            <>
              Transmission active · <strong>{active.name}</strong> ·{' '}
              {active.enriched}/{active.total} sets scannés
            </>
          ) : (
            <>Charge une liste de sets, puis choisis ta mission.</>
          )}
        </p>
      </header>

      {listsOpen && (
        <section className="panel lists-panel">
          <div className="topbar">
            <div>
              <h2>Archives de sets</h2>
              <p className="lead" style={{ marginBottom: 0 }}>
                Importe un Excel (ex. <code>75372-1,13,1</code> = set, quantité,
                version). La quantité compte pour la roue ; le Guess utilise des
                sets uniques.
              </p>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setListsOpen(false)}>
              Fermer
            </button>
          </div>

          {!lists.length && (
            <div className="message">
              Aucune liste. Importe un Excel avec une grande liste de sets pour
              commencer (ex. Film, Série, Jeux).
            </div>
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
                  <button
                    type="button"
                    className="list-row-main"
                    onClick={() => setSelectedListId(list.id)}
                  >
                    <strong>{list.name}</strong>
                    <small>
                      {list.total} sets · {list.enriched} enrichis
                      {isActive ? ' · active' : ''}
                    </small>
                  </button>
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
              <h3>Nouvelle liste (grande liste Excel)</h3>
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
        <section className="home-modes">
          <button
            type="button"
            className="big-mode guess"
            disabled={busy}
            onClick={() => void openGuess()}
          >
            <span className="big-mode-kicker">Mission 01</span>
            <span className="big-mode-title">Guess aléatoire</span>
            <span className="big-mode-desc">
              Indices holographiques, élimine les suspects, trouve le set.
            </span>
          </button>
          <button
            type="button"
            className="big-mode wheel"
            disabled={busy}
            onClick={() => void openWheel()}
          >
            <span className="big-mode-kicker">Mission 02</span>
            <span className="big-mode-title">Roue des sets</span>
            <span className="big-mode-desc">
              Fais tourner la roue : trois sets révélés avec aperçu et stats.
            </span>
          </button>
          {message && !listsOpen && (
            <div className={`message ${messageOk ? 'ok' : ''}`}>{message}</div>
          )}
        </section>
      )}

      {screen === 'guess' && guessRound && (
        <section className="panel">
          <div className="topbar">
            <div>
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
                Crédits : <strong style={{ color: 'var(--sw-yellow)' }}>{bonusCredits}</strong>
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
