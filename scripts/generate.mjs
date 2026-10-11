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
  dino: [
    '............########..',
    '...........##########.',
    '...........##.#######.',
    '...........##########.',
    '...........##########.',
    '...........##########.',
    '...........#####......',
    '...........########...',
    '#.........#####.......',
    '#........######.......',
    '##......##########....',
    '###....#########.#....',
    '#####.##########......',
    '################......',
    '################......',
    '.##############.......',
    '..#############.......',
    '...###########........',
    '....#########.........',
  ],
  legsA: ['.....###.##...........', '.....##...##..........', '.....#................', '.....##...............'],
  legsB: ['.....##..###..........', '......##..#...........', '..........#...........', '..........##..........'],
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

// Bitmap rows -> one path of merged horizontal runs.
function bitmapPath(rows, x, y, s) {
  let d = '';
  rows.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      if (row[c] !== '#') {
        c++;
        continue;
      }
      let len = 1;
      while (row[c + len] === '#') len++;
      d += `M${x + c * s} ${y + r * s}h${len * s}v${s}h${-len * s}z`;
      c += len;
    }
  });
  return d;
}

const sprite = (name, x, y, s, attrs = '') => `<path d="${bitmapPath(SPRITES[name], x, y, s)}" ${attrs}/>`;

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
.card{fill:${t.bg};stroke:${t.line}}
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
// loop, and the dino's jumps are timed to the two obstacles in that loop.
function dinoScene(H) {
  const LOOP = 4; // seconds per card width
  const GROUND = H - 30;
  const DINO_X = 64;
  const JUMPS = [0.3, 0.75]; // loop fractions at which an obstacle reaches the dino
  const dinoMid = DINO_X + 22;
  const obstacleAt = (phase, width) => Math.round(dinoMid + phase * W - width / 2);

  const rand = rng(1337);
  let ground = '';
  for (let x = 0; x < W; ) {
    const len = Math.min(20 + Math.floor(rand() * 60) * 2, W - x);
    ground += `M${x} ${GROUND}h${len}v2h${-len}z`;
    x += len + (rand() < 0.3 ? 6 : 0);
  }
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rand() * (W / 2 - 4)) * 2;
    const y = GROUND + 6 + Math.floor(rand() * 5) * 2;
    const len = rand() < 0.5 ? 2 : 6;
    ground += `M${x} ${y}h${len}v2h${-len}z`;
  }
  const big = obstacleAt(JUMPS[0], 22);
  const pair = obstacleAt(JUMPS[1], 32);
  const strip = `<path d="${ground}"/>
${sprite('cactus', big, GROUND - 30, 2)}
${sprite('cactusSmall', pair, GROUND - 20, 2)}${sprite('cactusSmall', pair + 18, GROUND - 20, 2)}`;
  const clouds = `${sprite('cloud', 150, 22, 2)}${sprite('cloud', 520, 172, 2)}${sprite('cloud', 770, 30, 2)}`;

  const pct = (f) => `${num(f * 100)}%`;
  const air = 0.3 / LOOP; // half a jump, as a loop fraction
  const jump = JUMPS.map(
    (p) =>
      `${pct(p - air)}{transform:translateY(0);animation-timing-function:cubic-bezier(.33,.67,.67,1)}` +
      `${pct(p)}{transform:translateY(-50px);animation-timing-function:cubic-bezier(.33,0,.67,.33)}` +
      `${pct(p + air)}{transform:translateY(0)}`,
  ).join('');

  return {
    css: `@keyframes scroll{to{transform:translateX(-${W}px)}}
@keyframes jump{0%,100%{transform:translateY(0)}${jump}}
.ground{animation:scroll ${LOOP}s linear infinite}
.clouds{animation:scroll ${LOOP * 12}s linear infinite}
.dino{animation:jump ${LOOP}s linear infinite}
.legs{animation:blink .2s steps(1) infinite}`,
    body: `<g class="px scene" clip-path="url(#card)">
<g class="clouds line"><g id="clouds">${clouds}</g><use href="#clouds" x="${W}"/></g>
<g class="ground"><g id="strip">${strip}</g><use href="#strip" x="${W}"/></g>
<g class="dino">
${sprite('dino', DINO_X, GROUND - 42, 2)}
${sprite('legsA', DINO_X, GROUND - 4, 2, 'class="legs"')}
${sprite('legsB', DINO_X, GROUND - 4, 2, 'class="legs" style="animation-delay:-.1s"')}
</g>
</g>`,
  };
}

function heroCard(d, theme) {
  const H = 280;
  const x = 48;
  const scene = dinoScene(H);

  const tagSize = 15;
  const step = textWidth('0', tagSize, 'mono');
  const steps = [...TAGLINE].length;
  const typed = Array.from({ length: steps + 1 }, (_, i) => num(i * step)).join(';');
  const meta = `On GitHub since ${d.joinedYear}`;

  return svg(
    theme,
    H,
    `<defs>
<clipPath id="card"><rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="12"/></clipPath>
<clipPath id="type"><rect x="${x}" y="104" width="0" height="26"><animate attributeName="width" calcMode="discrete" values="${typed}" dur="2s" begin=".5s" fill="freeze"/></rect></clipPath>
</defs>
<rect class="card" x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12"/>
${scene.body}
${text(DISPLAY_NAME, x, 88, 52, 'sans', 'fg', -0.035)}
<g clip-path="url(#type)">${text(TAGLINE, x, 122, tagSize, 'mono', 'muted')}</g>
${text(meta, x, 148, 12, 'mono', 'muted')}`,
    scene.css,
  );
}

function statsCard(d, theme) {
  const tiles = [
    ['star', 'TOTAL STARS', d.stars],
    ['check', 'ISSUES SOLVED', d.solvedIssues],
    ['commit', 'COMMITS', d.commits],
  ];
  const H = 156;
  const pad = 48;
  const col = (W - 2 * pad) / tiles.length;
  const body = tiles
    .map(([ic, label, value], i) => {
      const x = pad + i * col;
      return `<g style="animation:rise .5s ${(i * 0.08).toFixed(2)}s both">
${sprite(ic, Math.round(x), 73, 2, 'class="px muted"')}
${text(label, x + 24, 84, 11, 'mono', 'muted', 0.08)}
${text(fmt(value), x, 124, 34, 'sans', 'fg', -0.03)}
</g>`;
    })
    .join('\n');
  return svg(
    theme,
    H,
    `<rect class="card" x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="12"/>
${text('Stats', pad, 44, 18, 'sans', 'fg', -0.02)}
${body}`,
  );
}

// ---------------------------------------------------------------- main

async function main() {
  if (!TOKEN) throw new Error('Set GITHUB_TOKEN (or GH_TOKEN) to query the GitHub API.');
  const data = await fetchData();
  await mkdir(ASSETS, { recursive: true });
  const files = {};
  for (const [name, theme] of Object.entries(THEMES)) {
    files[`hero-${name}.svg`] = heroCard(data, theme);
    files[`stats-${name}.svg`] = statsCard(data, theme);
  }
  await Promise.all(Object.entries(files).map(([name, content]) => writeFile(join(ASSETS, name), content)));
  console.log(
    `Generated ${Object.keys(files).length} cards: ${data.stars} stars, ${data.solvedIssues} issues solved, ${data.commits} commits (${data.privateRepos} private repos visible).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
