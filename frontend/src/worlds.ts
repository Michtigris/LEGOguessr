export type WorldId =
  | 'tatooine'
  | 'hoth'
  | 'kashyyyk'
  | 'kamino'
  | 'geonosis'
  | 'mustafar'
  | 'endor'
  | 'scarif'
  | 'coruscant'

export type WorldDef = {
  id: WorldId
  name: string
  vibe: string
  ink: 'day' | 'night'
}

/** Catalogue des mondes — chaque surface de l’app en pioche un. */
export const WORLDS: Record<WorldId, WorldDef> = {
  tatooine: {
    id: 'tatooine',
    name: 'Tatooine',
    vibe: 'Dunes, deux soleils, chaleur qui tremble',
    ink: 'day',
  },
  hoth: {
    id: 'hoth',
    name: 'Hoth',
    vibe: 'Glace, blizzard, silence blanc',
    ink: 'day',
  },
  kashyyyk: {
    id: 'kashyyyk',
    name: 'Kashyyyk',
    vibe: 'Canopée, brume verte, racines géantes',
    ink: 'day',
  },
  kamino: {
    id: 'kamino',
    name: 'Kamino',
    vibe: 'Océan, pluie, plateformes d’acier',
    ink: 'night',
  },
  geonosis: {
    id: 'geonosis',
    name: 'Geonosis',
    vibe: 'Arène ocre, poussière, ruche',
    ink: 'day',
  },
  mustafar: {
    id: 'mustafar',
    name: 'Mustafar',
    vibe: 'Lave, cendre, duel',
    ink: 'night',
  },
  endor: {
    id: 'endor',
    name: 'Endor',
    vibe: 'Forêt, mousse, clairière',
    ink: 'day',
  },
  scarif: {
    id: 'scarif',
    name: 'Scarif',
    vibe: 'Lagon, palmiers, bouclier tropical',
    ink: 'day',
  },
  coruscant: {
    id: 'coruscant',
    name: 'Coruscant',
    vibe: 'Tours, néons, trafic aérien',
    ink: 'night',
  },
}

/** Chapitres de l’accueil — voyage qui mélange les univers. */
export const HOME_CHAPTERS: Array<{
  id: WorldId
  title: string
  lead: string
}> = [
  {
    id: 'tatooine',
    title: 'Départ sur les dunes',
    lead: 'Deux soleils. Une liste. Une mission.',
  },
  {
    id: 'kashyyyk',
    title: 'Archives dans la canopée',
    lead: 'Tes sets s’accrochent aux branches comme des trophées.',
  },
  {
    id: 'kamino',
    title: 'Plateformes de scan',
    lead: 'La pluie tombe. Les données montent.',
  },
  {
    id: 'hoth',
    title: 'Silence de glace',
    lead: 'Quand une photo manque, le froid laisse une plaque nette.',
  },
  {
    id: 'scarif',
    title: 'Côte tropicale',
    lead: 'La roue tourne comme une bouée au soleil.',
  },
  {
    id: 'endor',
    title: 'Clairière',
    lead: 'Trois gestes : importe, scanne, joue.',
  },
  {
    id: 'geonosis',
    title: 'Poussière d’arène',
    lead: 'Le Guess, c’est l’arène : quatre suspects, un vainqueur.',
  },
  {
    id: 'mustafar',
    title: 'Pont de lave',
    lead: 'Tension max avant de valider.',
  },
  {
    id: 'coruscant',
    title: 'Nuit urbaine',
    lead: 'Les archives brillent. Le menu ouvre la ville.',
  },
]

export const SCREEN_WORLD: Record<'home' | 'guess' | 'wheel' | 'lists', WorldId> = {
  home: 'tatooine',
  lists: 'coruscant',
  guess: 'mustafar',
  wheel: 'scarif',
}
