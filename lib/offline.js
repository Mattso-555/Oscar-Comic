// Offline idea engine. Used automatically when the Claude API route has no key
// or the network fails — so the story helper never goes dark on a kid.

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const WILD = ['a giant sneezing dragon', 'a pizza that came alive', 'a talking sock', 'an army of tickle-monsters', 'a robot who only speaks in burps', 'a cloud that rains jellybeans', 'a grumpy wizard', 'a tiny but VERY loud mouse', 'a door to upside-down land', 'a magical hiccup', 'a mountain made of socks', 'a sandwich with superpowers'];
const TROUBLE = ['everything turned purple', 'all the shadows went on strike', 'gravity took a day off', 'the sun overslept', 'every word turned into a giggle', 'the floor became jelly', 'all the socks vanished', 'time started going backwards'];

function castOf(items) {
  const chars = items.filter((c) => c.tag === 'character');
  return {
    hero: chars.find((c) => c.role === 'goodie')?.name || chars[0]?.name || 'your hero',
    foe: chars.find((c) => c.role === 'baddie')?.name || 'a sneaky villain (draw one!)',
    pal: chars.find((c) => c.role === 'sidekick')?.name || chars[1]?.name || 'a trusty sidekick (draw one!)',
    place: items.find((c) => c.tag === 'backdrop')?.name || 'a place you should draw',
    thing: items.find((c) => c.tag === 'prop')?.name || 'something you should draw',
  };
}

export function offlineIdeas(items) {
  const c = castOf(items);
  return shuffle([
    `${c.hero} discovers ${pick(WILD)} hiding in ${c.place}!`,
    `Uh oh — ${c.foe} steals ${c.thing}. ${c.hero} must get it back!`,
    `One morning ${pick(TROUBLE)}, and only ${c.hero} can fix it!`,
    `${c.hero} and ${c.pal} build a rocket out of ${c.thing}.`,
    `${c.foe} throws a party — but it's a TRAP. Draw the trap!`,
    `${c.hero} finds a secret map. Quick, draw where it leads!`,
    `${pick(WILD)} challenges ${c.hero} to a silly contest.`,
    `Everyone shrinks tiny! Draw the giant thing they must climb.`,
  ]).slice(0, 3);
}

export function offlineNext(items) {
  const c = castOf(items);
  return shuffle([
    `Suddenly ${pick(WILD)} bursts in — surprise!`,
    `${c.hero} trips and discovers a hidden trapdoor.`,
    `${c.foe} appears with an evil (but kind of silly) plan.`,
    `A mysterious box wobbles… draw what's inside!`,
    `${c.pal} has a wild idea nobody expected.`,
    `Everything goes quiet… then ${pick(TROUBLE)}!`,
    `Time to meet someone new — draw them now!`,
  ]).slice(0, 3);
}

export function offlineLines(items) {
  const c = castOf(items);
  return shuffle([
    `Wait… did that sock just WINK at me?`,
    `I regret everything. Mostly the pizza.`,
    `${c.hero}, do NOT press that button!`,
    `Too late. I pressed the button.`,
    `This is the best worst idea ever!`,
    `Nobody move — I dropped my snack!`,
    `You'll never catch me! …I'm right here.`,
    `Is it supposed to glow like that?`,
  ]).slice(0, 3);
}

export function offlinePlan(items) {
  const c = castOf(items);
  const title = pick([
    `The Great ${c.thing !== 'something you should draw' ? c.thing : 'Sock'} Mystery`,
    `${c.hero} Saves the Day`,
    `${c.hero} vs ${c.foe}`,
  ]);
  // Comics talk in speech bubbles — captions stay tiny and rare.
  const panels = [
    { caption: `${c.place}…`, dialogue: [{ who: c.hero, says: 'What a totally normal day!' }], sfx: null },
    { caption: null, dialogue: [{ who: c.hero, says: `Wait… what is THAT?!` }], sfx: 'WHOA!' },
    { caption: null, dialogue: [{ who: c.foe, says: 'It is MINE now!' }, { who: c.hero, says: 'Not so fast!' }], sfx: null },
    { caption: null, dialogue: [{ who: c.pal, says: 'I have a wild idea…' }], sfx: null },
    { caption: null, dialogue: [{ who: c.hero, says: `Quick — the ${c.thing}!` }], sfx: 'ZOOM!' },
    { caption: 'THE END?', dialogue: [{ who: c.foe, says: 'I regret everything.' }], sfx: 'KABOOM!' },
  ];
  return { title, panels };
}

const NAME_FIRST = ['Zappy', 'Sir', 'Captain', 'Lady', 'Professor', 'Baron', 'Wiggly', 'Sparkle', 'Grumble', 'Bouncy', 'Fuzzy', 'Mega', 'Tiny', 'Turbo', 'Sneaky', 'Giggles', 'Dr', 'Count', 'Super'];
const NAME_LAST = ['McBolt', 'Whiskers', 'Wigglesworth', 'Sparklepants', 'Grumbletooth', 'Fizzbang', 'Snugglebeast', 'Zoomer', 'Boop', 'Noodle', 'Sprocket', 'Pumpernickel', 'Von Fluff', 'Thunderpaws', 'Bumble', 'Snax'];
const NAME_BY_KIND = {
  person: ['Buddy', 'Hero', 'Champ', 'Scout', 'Pip', 'Biff'],
  animal: ['Paws', 'Whiskers', 'Fang', 'Hoppy', 'Waddles', 'Nibbles'],
  monster: ['Gnarlox', 'Snarl', 'Blorp', 'Grimble', 'Chomp'],
  robot: ['Bolt', 'Circuit', 'Gizmo', 'Clank', 'Beep'],
  magical: ['Sparkle', 'Stardust', 'Twinkle', 'Glimmer', 'Wisp'],
  vehicle: ['Trusty', 'The Whizzer', 'Zappo'],
  default: ['Buddy', 'Pip', 'Zippy'],
};

export function offlineNames(subType) {
  const kd = NAME_BY_KIND[subType] || NAME_BY_KIND.default;
  const combos = [
    () => `${pick(NAME_FIRST)} ${pick(NAME_LAST)}`,
    () => `${pick(NAME_FIRST)} ${pick(kd)}`,
    () => `${pick(kd)} ${pick(NAME_LAST)}`,
    () => pick(NAME_FIRST) + pick(['o', 'zee', 'ster', 'ly']),
    () => pick(kd),
  ];
  const names = new Set();
  let guard = 0;
  while (names.size < 5 && guard++ < 40) names.add(pick(combos)());
  return [...names].slice(0, 5);
}
