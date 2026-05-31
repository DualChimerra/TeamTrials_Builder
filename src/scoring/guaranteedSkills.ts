import type { Style, Category } from '../types'
import { STYLE_LABEL } from '../types'

// Tier of a guaranteed-activation skill. Gold is far more valuable than normal.
export type Tier = 'gold' | 'normal'

// Scope = when the skill is relevant.
//  - 'general'        : always relevant
//  - style:<s>        : relevant only when the horse is assigned style <s>
//  - dist:<c>         : relevant only for that race category
//  - 'trickFront'     : relevant for Front Runner + Pace Chaser
//  - 'trickBack'      : relevant for Late Surger + End Closer
export type Scope =
  | { kind: 'general' }
  | { kind: 'style'; style: Style }
  | { kind: 'dist'; category: Category }
  | { kind: 'trickFront' }
  | { kind: 'trickBack' }

export interface GuaranteedEntry {
  name: string
  tier: Tier
  bracket: boolean // listed in [brackets] => lower priority within its tier
  scope: Scope
}

// Helper builders -----------------------------------------------------------
const g = (name: string): Omit<GuaranteedEntry, 'scope'> => ({ name, tier: 'gold', bracket: false })
const gb = (name: string): Omit<GuaranteedEntry, 'scope'> => ({ name, tier: 'gold', bracket: true })
const n = (name: string): Omit<GuaranteedEntry, 'scope'> => ({ name, tier: 'normal', bracket: false })
const nb = (name: string): Omit<GuaranteedEntry, 'scope'> => ({ name, tier: 'normal', bracket: true })

function scoped(scope: Scope, entries: Omit<GuaranteedEntry, 'scope'>[]): GuaranteedEntry[] {
  return entries.map((e) => ({ ...e, scope }))
}

// ---- GENERAL (apply regardless of style/distance) -------------------------
const GENERAL: GuaranteedEntry[] = scoped({ kind: 'general' }, [
  // golds (build prioritises these first)
  g('Center Stage'),
  g('Swinging Maestro'),
  g('Breath of Fresh Air'),
  g('Professor of Curvature'),
  g('In Body and Mind'),
  g('Beeline Burst'),
  g('Corner Connoisseur'),
  g('Rushing Gale!'),
  g('Lane Legerdemain'),
  g('Concentration'),
  // normals
  n('Prudent Positioning'),
  n('Corner Recovery'),
  n('Straightaway Recovery'),
  n('Triple 7s'),
  n('Corner Adept'),
  n('Homestretch Haste'),
  n('Straightaway Adept'),
  n('Corner Acceleration'),
  n('Straightaway Acceleration'),
  n('Go with the Flow'),
  n('Focus'),
  // bracketed normals (lower priority)
  nb('Slipstream'),
  nb("Playtime's Over!"),
  nb('Highlander'),
])

// ---- Positional generics tied to a race category --------------------------
// "<Distance> Corners / Straightaways" — relevant when the category matches.
const DIST_GENERIC: GuaranteedEntry[] = (
  [
    ['sprint', 'Sprint'],
    ['mile', 'Mile'],
    ['medium', 'Medium'],
    ['long', 'Long'],
  ] as [Category, string][]
).flatMap(([category, label]) =>
  scoped({ kind: 'dist', category }, [n(`${label} Corners`), n(`${label} Straightaways`)]),
)

// "<Style> Corners / Straightaways / Savvy" — relevant when the style matches.
const STYLE_GENERIC: GuaranteedEntry[] = (Object.keys(STYLE_LABEL) as Style[]).flatMap((style) =>
  scoped({ kind: 'style', style }, [
    n(`${STYLE_LABEL[style]} Corners`),
    n(`${STYLE_LABEL[style]} Straightaways`),
    n(`${STYLE_LABEL[style]} Savvy`),
  ]),
)

// ---- Per running style -----------------------------------------------------
const FRONT = scoped({ kind: 'style', style: 'front' }, [
  g('Escape Artist'),
  g('Taking The Lead'),
  gb('Unrestrained'),
  gb('Restless'),
  n('Fast-Paced'),
  n('Early Lead'),
  nb('Final Push'),
  nb("Leader's Pride"),
  nb('Moxie'),
])

const PACE = scoped({ kind: 'style', style: 'pace' }, [
  g('Gourmand'),
  g('Race Planner'),
  g('Speed Star'),
  g('Technician'),
  g('Dazzling Disorientation'),
  gb('Calm and Collected'),
  gb('Determined Descent'),
  n('Hydrate'),
  n('Preferred Position'),
  n('Prepared to Pass'),
  n('Shrewd Step'),
  n('Disorient'),
  nb('Stamina to Spare'),
  nb('Straight Descent'),
])

const LATE = scoped({ kind: 'style', style: 'late' }, [
  g('Relax'),
  g('Hard Worker'),
  g('The Bigger Picture'),
  g('All-Seeing Eyes'),
  gb('15,000,000 CC'),
  gb('Rising Dragon'),
  gb('On Your Left!'),
  gb('Fast & Furious'),
  n('A Small Breather'),
  n('Fighter'),
  n('Studious'),
  n('Sharp Gaze'),
  nb('1,500,000 CC'),
  nb('Outer Swell'),
  nb('Slick Surge'),
  nb('Position Pilfer'),
])

const END = scoped({ kind: 'style', style: 'end' }, [
  g('Encroaching Shadow'),
  g('The Coast Is Clear!'),
  gb('Sleeping Lion'),
  gb('Go-Home Specialist'),
  gb('Crusader'),
  gb('Petrifying Gaze'),
  n('Straightaway Spurt'),
  n('I Can See Right Through You'),
  nb('Standing By'),
  nb('After-School Stroll'),
  nb('Strategist'),
  nb('Intense Gaze'),
])

const TRICK: GuaranteedEntry[] = [
  ...scoped({ kind: 'trickFront' }, [n('Trick (Front)')]),
  ...scoped({ kind: 'trickBack' }, [n('Trick (Rear)')]),
]

// ---- Per race category -----------------------------------------------------
const SPRINT = scoped({ kind: 'dist', category: 'sprint' }, [
  g('Turbo Sprint'),
  g('Perfect Prep!'),
  gb('Plan X'),
  gb('Adored by All'),
  gb('Staggering Lead'),
  gb("You've Got No Shot"),
  gb('Blinding Flash'),
  n('Sprinting Gear'),
  n('Meticulous Measures'),
  nb('Wait-and-See'),
  nb('Countermeasure'),
  nb('Intimidate'),
  nb('Huge Lead'),
  nb('Stop Right There!'),
  nb('Gap Closer'),
])

const MILE = scoped({ kind: 'dist', category: 'mile' }, [
  g('Big-Sisterly'),
  g('Step on the Gas!'),
  gb('Changing Gears'),
  gb('Furious Feat'),
  gb('Greed for Speed'),
  gb('Mile Maven'),
  gb('Keen Eye'),
  gb('Battle Formation'),
  n('Unyielding Spirit'),
  n('Acceleration'),
  nb('Shifting Gears'),
  nb('Updrafters'),
  nb('Speed Eater'),
  nb('Productive Plan'),
  nb('Watchful Eye'),
  nb('Opening Gambit'),
])

const MEDIUM = scoped({ kind: 'dist', category: 'medium' }, [
  g('Clairvoyance'),
  g('Miraculous Step'),
  gb('Killer Tunes'),
  gb('Lightning Step'),
  gb('Trackblazer'),
  gb('Dominator'),
  n('Hawkeye'),
  n('Soft Step'),
  nb('Up-Tempo'),
  nb('Thunderbolt Step'),
  nb('Rosy Outlook'),
  nb('Tether'),
])

const LONG = scoped({ kind: 'dist', category: 'long' }, [
  g('Illusionist'),
  g('Overwhelming Pressure'),
  g('Cooldown'),
  gb('Stamina Siphon'),
  gb('Vanguard Spirit'),
  n('Smoke Screen'),
  n('Pressure'),
  n('Deep Breaths'),
  n('Passing Pro'),
  nb('Stamina Eater'),
  nb('Keeping the Lead'),
])

const DIRT = scoped({ kind: 'dist', category: 'dirt' }, [g('Lead the Charge!'), n('Forward, March!')])

export const GUARANTEED: GuaranteedEntry[] = [
  ...GENERAL,
  ...DIST_GENERIC,
  ...STYLE_GENERIC,
  ...FRONT,
  ...PACE,
  ...LATE,
  ...END,
  ...TRICK,
  ...SPRINT,
  ...MILE,
  ...MEDIUM,
  ...LONG,
  ...DIRT,
]
