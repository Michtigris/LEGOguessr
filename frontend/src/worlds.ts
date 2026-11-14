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

/**
 * Accueil : long Tatooine → longue nuit Coruscant → footer Mustafar.
 * Pas un monde par écran — on reste assez longtemps pour respirer.
 */
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
    id: 'coruscant',
    title: 'Archives de la nuit',
    lead: 'Univers, sorties, MOCs — le vrai catalogue, pas du remplissage.',
  },
  {
    id: 'mustafar',
    title: 'Fin de transmission',
    lead: 'La lave clôt le voyage. Reviens quand tu veux.',
  },
]

export const SCREEN_WORLD: Record<
  'home' | 'guess' | 'wheel' | 'lists' | 'minifig' | 'explore',
  WorldId
> = {
  home: 'tatooine',
  lists: 'coruscant',
  explore: 'coruscant',
  guess: 'mustafar',
  wheel: 'hoth',
  minifig: 'geonosis',
}
