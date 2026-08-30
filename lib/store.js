// Tiny persistent store. Everything the kid makes survives refresh & reopen.
// localStorage is fine at this scale (drawings are small PNGs); quota failures
// degrade gracefully to in-memory.

const KEY = 'scribble-studio-v1';

export function loadState() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let saveTimer = null;
export function saveState(partial) {
  if (typeof window === 'undefined') return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const prev = loadState() || {};
      localStorage.setItem(KEY, JSON.stringify({ ...prev, ...partial }));
    } catch {
      /* quota exceeded — keep running in memory */
    }
  }, 350);
}

export function clearSaved() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(KEY); } catch {}
}

export const SUB_TYPES = {
  character: [
    { id: 'person', label: '🧍 Person' },
    { id: 'animal', label: '🐾 Animal' },
    { id: 'monster', label: '👹 Monster' },
    { id: 'robot', label: '🤖 Robot' },
    { id: 'magical', label: '🧚 Magical' },
  ],
  backdrop: [
    { id: 'outdoors', label: '🌳 Outdoors' },
    { id: 'indoors', label: '🏠 Indoors' },
    { id: 'city', label: '🏙️ City' },
    { id: 'space', label: '🚀 Space' },
    { id: 'underwater', label: '🌊 Underwater' },
    { id: 'fantasy', label: '🏰 Fantasy' },
  ],
  prop: [
    { id: 'vehicle', label: '🚗 Vehicle' },
    { id: 'tool', label: '🗡️ Tool' },
    { id: 'food', label: '🍎 Food' },
    { id: 'treasure', label: '💎 Treasure' },
    { id: 'furniture', label: '🪑 Furniture' },
    { id: 'nature', label: '🌸 Nature' },
  ],
  effect: [
    { id: 'word', label: '💥 Action word' },
    { id: 'weather', label: '⛈️ Weather' },
    { id: 'magic', label: '✨ Magic' },
    { id: 'emotion', label: '❤️ Emotion' },
  ],
};

export const SUB_HINTS = {
  person: 'A person! Think of their hair, clothes, and a big expression.',
  animal: 'An animal! Pet, wild beast, or a mix of both?',
  monster: 'A monster! Extra eyes, horns, fangs — go weird and wild!',
  robot: 'A robot! Boxes, bolts, buttons and an antenna.',
  magical: 'A magical being! Wings, a wand, sparkles and glow.',
  outdoors: 'Outdoors! Trees, hills, sky and a sun.',
  indoors: 'Indoors! Walls, a floor, a window, furniture.',
  city: 'A city! Tall buildings, windows, roads and cars.',
  space: 'Space! Dark sky, stars, planets and a rocket.',
  underwater: 'Underwater! Blue water, bubbles, seaweed and fish.',
  fantasy: 'A fantasy land! Castles, mountains, maybe a dragon cave.',
  vehicle: 'A vehicle! Give it wheels, wings, or rockets.',
  tool: 'A tool! A sword, wand, hammer or gadget.',
  food: 'Food! Yummy, silly, or a giant snack.',
  treasure: 'Treasure! Gold, gems, a chest or a magic key.',
  furniture: 'Furniture! A throne, bed, table or toy box.',
  nature: 'Nature! A flower, tree, rock or waterfall.',
  word: 'An action word! POW! BOOM! ZOOM! Write it BIG.',
  weather: 'Weather! Rain, lightning, sunshine or snow.',
  magic: 'Magic! Sparkles, swirls, glows and stars.',
  emotion: 'An emotion! Hearts for love, a cloud for grumpy.',
};

export const PALETTE = [
  '#E8442E', '#FF6B6B', '#FF884D', '#FFA53C', '#FFC933', '#FFE45C',
  '#B6E24A', '#6FD44A', '#2FB86B', '#1F9E6E',
  '#3FD0E8', '#3FB8E8', '#2563D9', '#5B4FE0', '#7C5CD9', '#B36BE8',
  '#FF6FC4', '#FF8FCF', '#FFB3D1',
  '#FCE0C8', '#F1C79E', '#D9A46A', '#B57B47', '#8A5A34', '#5C3A21',
  '#7A4E2E', '#A88A6B', '#C9C4BC', '#8A8794', '#1A1B2E', '#FFFFFF',
];
