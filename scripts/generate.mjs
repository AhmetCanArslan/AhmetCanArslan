#!/usr/bin/env node
// Generates the animated SVG cards in assets/.
// Usage: GITHUB_TOKEN=... node scripts/generate.mjs

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');
const LOGIN = process.env.GITHUB_REPOSITORY_OWNER || 'AhmetCanArslan';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const DISPLAY_NAME = 'Ahmet Can Arslan';
const TAGLINE = 'Android Developer · Grad CS Student';
const W = 880;

// Geist glyph outlines (SemiBold as `sans`, Mono Regular as `mono`), extracted from
// github.com/vercel/geist-font (OFL). GitHub does not load fonts inside README images,
// so text is drawn as paths.
const GEIST = JSON.parse(await readFile(join(dirname(fileURLToPath(import.meta.url)), 'geist.json'), 'utf8'));

// ---------------------------------------------------------------- text

const num = (n) => +n.toFixed(2);

// `track` is letter spacing in em.
function textWidth(str, size, font, track = 0) {
  const { upm, glyphs } = GEIST[font];
  const chars = [...String(str)];
  const units = chars.reduce((sum, ch) => sum + (glyphs[ch] ?? glyphs['?'])[0], 0);
  return (units / upm + track * Math.max(0, chars.length - 1)) * size;
}

// Draws `str` with its baseline starting at (x, y).
function text(str, x, y, size, font, cls, track = 0) {
  const { upm, glyphs } = GEIST[font];
  let pen = 0;
  let out = '';
  for (const ch of String(str)) {
    const [advance, d] = glyphs[ch] ?? glyphs['?'];
    if (d) out += `<path transform="translate(${pen})" d="${d}"/>`;
    pen += advance + track * upm;
  }
  return `<g class="${cls}" transform="translate(${num(x)} ${num(y)}) scale(${num(size / upm)})">${out}</g>`;
}

// ---------------------------------------------------------------- pixel art

const SPRITES = {
  android: [
    '...A........A...',
    '....A......A....',
    '.....AAAAAA.....',
    '...AAAAAAAAAA...',
    '..AAAAAAAAAAAA..',
    '..AAWWAAAAWWAA..',
    '..AAWWAAAAWWAA..',
    '..AAAAAAAAAAAA..',
    '..aaaaaaaaaaaa..',
    '..BBBWWRRWWBBB..',
    '.BBBBLWRRWLBBBB.',
    '.BBBBBLRRLBBBBB.',
    '.BBBBBBRRBBBBBB.',
    '.BBBBBBDDBBBBBB.',
    '.BBDBBBBBBBBDBB.',
    '.BBDBBBBBBBBDBB.',
    '.WWDBBBBBBBBDWW.',
    '.AADDDDDDDDDDAA.',
    '.AA.BBBBBBBB.AA.',
  ],
  legsA: [
    '....BBB..BBB....',
    '....BBB..BBB....',
    '....DDD..BBB....',
    '.........DDDD...',
  ],
  legsB: [
    '....BBB..BBB....',
    '....BBB..BBB....',
    '....BBB..DDD....',
    '...DDDD.........',
  ],
  cactus: [
    '....###....',
    '....###....',
    '....###..#.',
    '.#..###.###',
    '###.###.###',
    '###.###.###',
    '###.###.###',
    '###.###.###',
    '#######.###',
    '.##########',
    '....######.',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
  ],
  cactusSmall: [
    '..##...',
    '..##.#.',
    '#.##.##',
    '#.##.##',
    '#.##.##',
    '####.##',
    '.######',
    '..####.',
    '..##...',
    '..##...',
    '..##...',
    '..##...',
  ],
  flower: ['.W.', 'WYW', '.W.'],
  stone: ['.SSS.', 'SSSSs', 'Sssss'],
  cloud: [
    '.........######........',
    '.......##......###.....',
    '....###...........#....',
    '..##...............###.',
    '.#....................#',
    '#######################',
  ],
  star: ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
  check: ['.......', '......#', '.....##', '#...##.', '##.##..', '.###...', '..#....'],
  commit: ['...#...', '...#...', '..###..', '..#.#..', '..###..', '...#...', '...#...'],
};

// Bitmap rows -> one path of merged horizontal runs of `ch`.
function bitmapPath(rows, x, y, s, ch = '#') {
  let d = '';
  rows.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      if (row[c] !== ch) {
        c++;
        continue;
      }
      let len = 1;
      while (row[c + len] === ch) len++;
      d += `M${x + c * s} ${y + r * s}h${len * s}v${s}h${-len * s}z`;
      c += len;
    }
  });
  return d;
}

// '#' takes the fill of its surroundings, the other letters are fixed colors.
const SPRITE_FILLS = {
  A: '#97c93d',
  a: '#6f9a2b',
  B: '#7a4a2b',
  L: '#99643c',
  D: '#5a3620',
  W: '#f5f5f5',
  R: '#d0342c',
  Y: '#f2b233',
  S: '#9aa0a8',
  s: '#6f757d',
};

// Fixed colors of the runner scene, the same in both themes.
const SCENE_FILLS = {
  dirt: '#7a4a2b',
  dirtDark: '#5a3620',
  dirtLight: '#99643c',
  grass: '#6aa833',
  grassDark: '#4c8a2a',
  grassLight: '#8cc63f',
  cactus: '#2e7d4f',
};

function sprite(name, x, y, s, attrs = '') {
  const rows = SPRITES[name];
  const base = bitmapPath(rows, x, y, s);
  const fills = Object.keys(SPRITE_FILLS)
    .filter((ch) => rows.some((row) => row.includes(ch)))
    .map((ch) => `<path fill="${SPRITE_FILLS[ch]}" d="${bitmapPath(rows, x, y, s, ch)}"/>`)
    .join('');
  if (!fills) return `<path d="${base}" ${attrs}/>`;
  return `<g${attrs && ` ${attrs}`}>${base && `<path d="${base}"/>`}${fills}</g>`;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Monochrome palettes. Each card is written once per theme and the README picks one
// with <picture>, so the cards follow GitHub's theme.
const THEMES = {
  light: { bg: '#ffffff', fg: '#171717', muted: '#666666', line: '#eaeaea', scene: '#c9c9c9' },
  dark: { bg: '#0d1117', fg: '#ededed', muted: '#a1a1a1', line: '#30363d', scene: '#4d545e' },
};

const svg = (t, h, body, css = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}">
<style>
.fg{fill:${t.fg}}.muted{fill:${t.muted}}.line{fill:${t.line}}.scene{fill:${t.scene}}
.card{fill:${t.bg};stroke:${t.line}}.bg{fill:${t.bg}}.edge{fill:none;stroke:${t.line}}
.px{shape-rendering:crispEdges}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes rise{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:translateY(0)}}
${css}
</style>
${body}
</svg>
`;

const fmt = (n) => n.toLocaleString('en-US');

// ---------------------------------------------------------------- data

async function gql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': LOGIN },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GraphQL failed: ${JSON.stringify(json.errors ?? json)}`);
  return json.data;
}

async function fetchData() {
  const { user } = await gql(
    `query($login:String!){user(login:$login){
      id createdAt
      repositories(first:100,ownerAffiliations:OWNER,privacy:PUBLIC,orderBy:{field:STARGAZERS,direction:DESC}){nodes{
        stargazerCount isFork
        issues(states:CLOSED){totalCount}
      }}
    }}`,
    { login: LOGIN },
  );

  const firstYear = new Date(user.createdAt).getUTCFullYear();

  // Real commits authored on default branches. The contribution graph is not used here:
  // it skips forks and anything GitHub did not credit at push time. Private repos are
  // only visible to a personal access token, the default Actions token sees public ones.
  const commitData = await gql(
    `query($login:String!,$id:ID!){user(login:$login){
      repositories(first:100,ownerAffiliations:[OWNER,COLLABORATOR,ORGANIZATION_MEMBER]){nodes{
        isPrivate defaultBranchRef{target{... on Commit{history(author:{id:$id}){totalCount}}}}
      }}
    }}`,
    { login: LOGIN, id: user.id },
  );
  const commitRepos = commitData.user.repositories.nodes;
  const commits = commitRepos.reduce((sum, r) => sum + (r.defaultBranchRef?.target?.history?.totalCount ?? 0), 0);
  const privateRepos = commitRepos.filter((r) => r.isPrivate).length;

  // Forks only count once someone starred them, i.e. they grew into their own project.
  const repos = user.repositories.nodes.filter((r) => !r.isFork || r.stargazerCount > 0);
  return {
    joinedYear: firstYear,
    stars: repos.reduce((s, r) => s + r.stargazerCount, 0),
    solvedIssues: repos.reduce((s, r) => s + r.issues.totalCount, 0),
    commits,
    privateRepos,
  };
}

// ---------------------------------------------------------------- cards

// Endless runner strip behind the hero text. The ground scrolls one full card width per
// loop, and the android's jumps are timed to the two obstacles in that loop. Everything moves
// in whole steps on a shared FPS tick: README images repaint the whole SVG on every
// change, so smooth 60fps motion makes the page lag.
function runnerScene(H) {
  const FPS = 30;
  const STEP = 8; // ground pixels per frame
  const FRAMES = W / STEP; // frames per loop
  const LOOP = FRAMES / FPS; // seconds per card width
  const GROUND = H - 30;
  const GRASS = 12; // thickness of the grass band
  const RUNNER_X = 64;
  const JUMPS = [0.3, 0.75]; // loop fractions at which an obstacle reaches the runner
  const runnerMid = RUNNER_X + 16;
  const obstacleAt = (phase, width) => Math.round(runnerMid + phase * W - width / 2);

  // A band of grass on top of dirt that runs to the bottom of the card.
  const rand = rng(1337);
  const pick = (n) => Math.floor(rand() * n);
  const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
  const DIRT = GROUND + GRASS;
  const layer = {
    dirt: rect(0, DIRT, W, H - DIRT),
    dirtDark: '',
    dirtLight: '',
    grass: rect(0, GROUND, W, GRASS),
    grassDark: rect(0, DIRT - 2, W, 2),
    grassLight: '',
  };
  for (let x = 4 + pick(8) * 2; x < W - 12; x += 14 + pick(14) * 2) {
    for (let i = 0, blades = 2 + pick(3); i < blades; i++) {
      const h = 2 + pick(4) * 2;
      layer[rand() < 0.4 ? 'grassDark' : 'grass'] += rect(x + i * 4 - pick(2) * 2, GROUND - h, 2, h);
    }
  }
  for (let i = 0; i < 70; i++) layer.grassLight += rect(pick(W / 2 - 2) * 2, GROUND + pick(4) * 2, 2 + pick(2) * 2, 2);
  for (let i = 0; i < 90; i++) {
    const y = DIRT + 2 + pick((H - DIRT - 4) / 2) * 2;
    layer[rand() < 0.5 ? 'dirtDark' : 'dirtLight'] += rect(pick(W / 2 - 4) * 2, y, 2 + pick(3) * 2, 2);
  }
  let decor = '';
  for (let i = 0; i < 9; i++) decor += sprite('flower', 20 + pick(W / 2 - 24) * 2, GROUND + 2, 2);
  for (let i = 0; i < 4; i++) decor += sprite('stone', 20 + pick(W / 2 - 24) * 2, GROUND + 2, 2);

  const big = obstacleAt(JUMPS[0], 22);
  const pair = obstacleAt(JUMPS[1], 32);
  const cactus = `fill="${SCENE_FILLS.cactus}"`;
  const strip = `${Object.entries(layer)
    .map(([name, d]) => `<path fill="${SCENE_FILLS[name]}" d="${d}"/>`)
    .join('')}
${decor}
${sprite('cactus', big, GROUND - 30, 2, cactus)}
${sprite('cactusSmall', pair, GROUND - 20, 2, cactus)}${sprite('cactusSmall', pair + 18, GROUND - 20, 2, cactus)}`;
  const clouds = `${sprite('cloud', 150, 22, 2)}${sprite('cloud', 520, GROUND - 84, 2)}${sprite('cloud', 770, 30, 2)}`;

  // Jumps are parabolas sampled once per frame and held with step-end.
  const pct = (f) => `${num((f / FRAMES) * 100)}%`;
  const AIR = Math.round(0.3 * FPS); // frames of half a jump
  const jump = JUMPS.map((p) => {
    const mid = Math.round(p * FRAMES);
    let out = '';
    for (let k = -AIR; k <= AIR; k++) out += `${pct(mid + k)}{transform:translateY(${-Math.round(50 * (1 - (k / AIR) ** 2))}px)}`;
    return out;
  }).join('');

  return {
    css: `@keyframes scroll{to{transform:translateX(-${W}px)}}
@keyframes jump{0%,100%{transform:translateY(0)}${jump}}
.ground{animation:scroll ${num(LOOP)}s steps(${FRAMES}) infinite}
.clouds{animation:scroll ${num(LOOP * 12)}s steps(${W / 4}) infinite}
.runner{animation:jump ${num(LOOP)}s step-end infinite}
.legs{animation:blink .2s steps(1) infinite}`,
    // No clip-path here: clipping an animated layer is redrawn every frame. The root
    // viewport clips the sides and heroCard covers the rounded corners instead.
    body: `<g class="px scene">
<g class="clouds line"><g id="clouds">${clouds}</g><use href="#clouds" x="${W}"/></g>
<g class="ground"><g id="strip">${strip}</g><use href="#strip" x="${W}"/></g>
<g class="runner">
${sprite('android', RUNNER_X, GROUND - 44, 2)}
${sprite('legsA', RUNNER_X, GROUND - 6, 2, 'class="legs"')}
${sprite('legsB', RUNNER_X, GROUND - 6, 2, 'class="legs" style="animation-delay:-.1s"')}
</g>
</g>`,
  };
}

// Google Play mark in its four brand colors, `h` tall with its top-right corner at (right, top).
// The triangle spans x 0..18, y 0..21 in its own units.
function playIcon(right, top, h) {
  const s = h / 21;
  const C = '10.5 10.5';
  const T = '0 0';
  const B = '0 21';
  const P1 = '13.5 7.88';
  const P2 = '13.5 13.13';
  const parts = [
    ['#4285f4', [T, C, B]],
    ['#34a853', [T, P1, C]],
    ['#ea4335', [B, C, P2]],
    ['#fbbc04', [C, P1, '18 10.5', P2]],
  ];
  return `<g transform="translate(${num(right - 18 * s)} ${num(top)}) scale(${num(s)})">${parts
    .map(([fill, pts]) => `<polygon fill="${fill}" points="${pts.join(' ')}"/>`)
    .join('')}</g>`;
}

function heroCard(d, theme) {
  const H = 404;
  const x = 48;
  const scene = runnerScene(H);

  const tagSize = 15;
  const tagX = num(x + textWidth(DISPLAY_NAME, 52, 'sans', -0.035) + 20);
  const step = textWidth('0', tagSize, 'mono');
  const steps = [...TAGLINE].length;
  const typed = Array.from({ length: steps + 1 }, (_, i) => num(i * step)).join(';');
  const meta = `On GitHub since ${d.joinedYear}`;

  return svg(
    theme,
    H,
    `<defs>
<clipPath id="type"><rect x="${tagX}" y="70" width="0" height="26"><animate attributeName="width" calcMode="discrete" values="${typed}" dur="2s" begin=".5s" fill="freeze"/></rect></clipPath>
</defs>
<rect class="card" x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12"/>
${scene.body}
<path class="bg" d="M0 ${H - 12.5}H.5A12 12 0 0 0 12.5 ${H - 0.5}V${H}H0zM${W - 12.5} ${H}V${H - 0.5}A12 12 0 0 0 ${W - 0.5} ${H - 12.5}H${W}V${H}z"/>
<rect class="edge" x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12"/>
${text(DISPLAY_NAME, x, 88, 52, 'sans', 'fg', -0.035)}
<g clip-path="url(#type)">${text(TAGLINE, tagX, 88, tagSize, 'mono', 'muted')}</g>
${text(meta, x, 122, 12, 'mono', 'muted')}
${playIcon(W - x, 51, 37)}
<rect class="line" x="${x}" y="152" width="${W - 2 * x}" height="1"/>
${statsRow(d, x, 186)}`,
    scene.css,
  );
}

// Title plus one column per stat; `y` is the title baseline.
function statsRow(d, pad, y) {
  const tiles = [
    ['star', 'TOTAL STARS', d.stars],
    ['check', 'ISSUES SOLVED', d.solvedIssues],
    ['commit', 'COMMITS', d.commits],
  ];
  const col = (W - 2 * pad) / tiles.length;
  const body = tiles
    .map(([ic, label, value], i) => {
      const x = pad + i * col;
      return `<g style="animation:rise .5s ${(i * 0.08).toFixed(2)}s both">
${sprite(ic, Math.round(x), y + 21, 2, 'class="px muted"')}
${text(label, x + 24, y + 32, 11, 'mono', 'muted', 0.08)}
${text(fmt(value), x, y + 72, 34, 'sans', 'fg', -0.03)}
</g>`;
    })
    .join('\n');
  return `${text('Stats', pad, y, 18, 'sans', 'fg', -0.02)}
${body}`;
}

// ---------------------------------------------------------------- main

async function main() {
  if (!TOKEN) throw new Error('Set GITHUB_TOKEN (or GH_TOKEN) to query the GitHub API.');
  const data = await fetchData();
  await mkdir(ASSETS, { recursive: true });
  const files = {};
  for (const [name, theme] of Object.entries(THEMES)) files[`hero-${name}.svg`] = heroCard(data, theme);
  await Promise.all(Object.entries(files).map(([name, content]) => writeFile(join(ASSETS, name), content)));
  console.log(
    `Generated ${Object.keys(files).length} cards: ${data.stars} stars, ${data.solvedIssues} issues solved, ${data.commits} commits (${data.privateRepos} private repos visible).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
