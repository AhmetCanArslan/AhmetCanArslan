#!/usr/bin/env node
// Generates the animated pixel-art SVG cards in assets/ and the top repo list in README.md.
// Usage: GITHUB_TOKEN=... node scripts/generate.mjs

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = join(ROOT, 'assets');
const LOGIN = process.env.GITHUB_REPOSITORY_OWNER || 'AhmetCanArslan';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const DISPLAY_NAME = 'AHMET CAN ARSLAN';
const TAGLINE = 'ANDROID DEVELOPER // GRAD CS STUDENT';
const CLASS_NAME = 'ANDROID KNIGHT';
const TOP_N = 10;
const W = 880;

const C = {
  bg: '#0d0b14',
  panel: '#15121f',
  panelHi: '#1c1829',
  border: '#2e2747',
  dim: '#3a3357',
  text: '#f4f1ff',
  muted: '#9a94b8',
  gold: '#ffc83d',
  magenta: '#ff3d81',
  cyan: '#29e0ff',
  green: '#5dff8f',
  purple: '#a97bff',
  orange: '#ff8a3d',
};
const VIVID = [C.gold, C.magenta, C.cyan, C.green, C.purple, C.orange];
const MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';

// ---------------------------------------------------------------- pixel font

const FONT = {
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#',
  B: '####./#...#/#...#/####./#...#/#...#/####.',
  C: '.####/#..../#..../#..../#..../#..../.####',
  D: '####./#...#/#...#/#...#/#...#/#...#/####.',
  E: '#####/#..../#..../####./#..../#..../#####',
  F: '#####/#..../#..../####./#..../#..../#....',
  G: '.####/#..../#..../#.###/#...#/#...#/.###.',
  H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '#####/..#../..#../..#../..#../..#../#####',
  J: '..###/....#/....#/....#/....#/#...#/.###.',
  K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
  L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
  N: '#...#/##..#/##..#/#.#.#/#..##/#..##/#...#',
  O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
  P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
  R: '####./#...#/#...#/####./#.#../#..#./#...#',
  S: '.####/#..../#..../.###./....#/....#/####.',
  T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
  V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
  X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..',
  Z: '#####/....#/...#./..#../.#.../#..../#####',
  0: '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
  1: '..#../.##../..#../..#../..#../..#../.###.',
  2: '.###./#...#/....#/...#./..#../.#.../#####',
  3: '####./....#/....#/.###./....#/....#/####.',
  4: '...#./..##./.#.#./#..#./#####/...#./...#.',
  5: '#####/#..../####./....#/....#/#...#/.###.',
  6: '.###./#..../#..../####./#...#/#...#/.###.',
  7: '#####/....#/...#./..#../.#.../.#.../.#...',
  8: '.###./#...#/#...#/.###./#...#/#...#/.###.',
  9: '.###./#...#/#...#/.####/....#/....#/.###.',
  ' ': '...../...../...../...../...../...../.....',
  '.': '...../...../...../...../...../.##../.##..',
  ',': '...../...../...../...../.##../..#../.#...',
  '-': '...../...../...../.###./...../...../.....',
  _: '...../...../...../...../...../...../#####',
  '/': '....#/....#/...#./..#../.#.../#..../#....',
  ':': '...../.##../.##../...../.##../.##../.....',
  '#': '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.',
  '+': '...../..#../..#../#####/..#../..#../.....',
  '%': '##..#/##..#/...#./..#../.#.../#..##/#..##',
  '>': '#..../.#.../..#../...#./..#../.#.../#....',
  '<': '....#/...#./..#../.#.../..#../...#./....#',
  '!': '..#../..#../..#../..#../..#../...../..#..',
  '?': '.###./#...#/....#/...#./..#../...../..#..',
  '(': '...#./..#../.#.../.#.../.#.../..#../...#.',
  ')': '.#.../..#../...#./...#./...#./..#../.#...',
  "'": '..#../..#../...../...../...../...../.....',
};

const ICONS = {
  star: '...#.../...#.../#######/.#####./..###../.##.##./.#...#.',
  fork: '##...##/##...##/.#...#./.#####./...#.../..###../..###..',
  person: '..###../..###../..###../......./.#####./#######/#######',
  check: '......./......#/.....##/#...##./##.##../.###.../..#....',
  merge: '##...../##...../.#...../.####../.#...##/##...##/##.....',
  commit: '...#.../...#.../..###../..#.#../..###../...#.../...#...',
};

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ascii = (s) =>
  String(s)
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'I')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

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

const pixWidth = (text, s) => Math.max(0, String(text).length * 6 * s - s);

function pix(text, x, y, s, fill, attrs = '') {
  let d = '';
  [...ascii(text).toUpperCase()].forEach((ch, i) => {
    const glyph = FONT[ch] ?? FONT['?'];
    d += bitmapPath(glyph.split('/'), x + i * 6 * s, y, s);
  });
  return `<path d="${d}" fill="${fill}" ${attrs}/>`;
}

const pixRight = (text, xRight, y, s, fill, attrs) => pix(text, xRight - pixWidth(text, s), y, s, fill, attrs);

const icon = (name, x, y, s, fill, attrs = '') =>
  `<path d="${bitmapPath(ICONS[name].split('/'), x, y, s)}" fill="${fill}" ${attrs}/>`;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const svg = (h, body, css = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" shape-rendering="crispEdges">
<style>
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes twinkle{0%,100%{opacity:.15}50%{opacity:1}}
@keyframes pop{0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
@keyframes slide{0%{opacity:0;transform:translateX(-24px)}100%{opacity:1;transform:translateX(0)}}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes march{to{stroke-dashoffset:-32}}
@keyframes sweep{0%{transform:translateX(-200px)}35%,100%{transform:translateX(${W + 200}px)}}
@keyframes cell{0%{opacity:0}100%{opacity:1}}
.blink{animation:blink 1s steps(1) infinite}
${css}
</style>
${body}
</svg>
`;

// Sharp panel with accent corner notches.
function panel(x, y, w, h, accent) {
  const n = 6;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.panel}" stroke="${C.border}" stroke-width="2"/>
<path d="M${x - 1} ${y - 1}h${n * 2}v2h${-n * 2 + 2}v${n * 2 - 2}h-2zM${x + w + 1} ${y + h + 1}h${-n * 2}v-2h${n * 2 - 2}v${-n * 2 + 2}h2z" fill="${accent}"/>`;
}

const sectionTitle = (title, accent) =>
  `${pix('>', 16, 14, 2, accent)}${pix(title, 34, 14, 2, C.text)}
<rect class="blink" x="${40 + pixWidth(title, 2)}" y="14" width="10" height="14" fill="${accent}"/>
<rect x="${62 + pixWidth(title, 2)}" y="20" width="${W - 78 - pixWidth(title, 2)}" height="2" fill="${C.border}"/>`;

const fmt = (n) => n.toLocaleString('en-US');

function relTime(iso, now) {
  const days = Math.floor((now - new Date(iso)) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

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
      id createdAt followers{totalCount}
      pullRequests(states:MERGED){totalCount}
      repositories(first:100,ownerAffiliations:OWNER,privacy:PUBLIC,orderBy:{field:STARGAZERS,direction:DESC}){nodes{
        name url description stargazerCount forkCount isFork
        primaryLanguage{name color}
        languages(first:20,orderBy:{field:SIZE,direction:DESC}){edges{size node{name color}}}
        issues(states:CLOSED){totalCount}
        defaultBranchRef{target{... on Commit{messageHeadline committedDate}}}
      }}
    }}`,
    { login: LOGIN },
  );

  const now = new Date();
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
  const langBytes = new Map();
  for (const repo of repos) {
    for (const { size, node } of repo.languages.edges) {
      const entry = langBytes.get(node.name) ?? { name: node.name, color: node.color ?? C.muted, size: 0 };
      entry.size += size;
      langBytes.set(node.name, entry);
    }
  }
  const totalBytes = [...langBytes.values()].reduce((s, l) => s + l.size, 0) || 1;
  const languages = [...langBytes.values()]
    .sort((a, b) => b.size - a.size)
    .map((l) => ({ ...l, pct: (l.size / totalBytes) * 100 }));

  return {
    now,
    joinedYear: firstYear,
    level: Math.floor((now - new Date(user.createdAt)) / (365.25 * 86400000)),
    stars: repos.reduce((s, r) => s + r.stargazerCount, 0),
    forks: repos.reduce((s, r) => s + r.forkCount, 0),
    followers: user.followers.totalCount,
    solvedIssues: repos.reduce((s, r) => s + r.issues.totalCount, 0),
    mergedPRs: user.pullRequests.totalCount,
    commits,
    privateRepos,
    languages,
    // The profile repo itself is not a project, keep it off the leaderboard.
    topRepos: repos.filter((r) => r.name !== LOGIN).slice(0, TOP_N),
  };
}

// ---------------------------------------------------------------- cards

function heroCard(d) {
  const H = 260;
  const rand = rng(1337);
  let stars = '';
  for (let i = 0; i < 70; i++) {
    const size = rand() < 0.25 ? 4 : 2;
    const x = Math.floor(rand() * (W / 2)) * 2;
    const y = Math.floor(rand() * 90) * 2;
    const fill = rand() < 0.5 ? C.text : VIVID[Math.floor(rand() * VIVID.length)];
    stars += `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${fill}" style="animation:twinkle ${(
      1.6 +
      rand() * 3
    ).toFixed(1)}s ${(rand() * 3).toFixed(1)}s infinite"/>`;
  }

  // Pixel skyline echoing the castle behind the knight.
  const skyline = (seed, fill, base, spireChance) => {
    const r = rng(seed);
    let dPath = '';
    for (let x = 0; x < W; x += 8) {
      let h = base + Math.floor(r() * 4) * 6;
      if (r() < spireChance) h += 30 + Math.floor(r() * 4) * 8;
      dPath += `M${x} ${H - h}h8v${h}h-8z`;
    }
    return `<path d="${dPath}" fill="${fill}"/>`;
  };

  const nameX = 48;
  const nameS = 7;
  const nameW = pixWidth(DISPLAY_NAME, nameS);
  const tagW = pixWidth(TAGLINE, 2);
  const steps = TAGLINE.length;
  const typed = Array.from({ length: steps + 1 }, (_, i) => i * 12).join(';');
  const cursor = Array.from({ length: steps + 1 }, (_, i) => nameX + i * 12).join(';');

  const milestone = Math.max(500, Math.ceil((d.stars + 1) / 500) * 500);
  const xpCells = 30;
  const xpFilled = Math.round(((d.stars - (milestone - 500)) / 500) * xpCells);
  let xp = '';
  for (let i = 0; i < xpCells; i++) {
    const on = i < xpFilled;
    xp += `<rect x="${nameX + 40 + i * 12}" y="196" width="10" height="14" fill="${on ? C.gold : C.dim}"${
      on ? ` style="animation:cell .2s ${(1.2 + i * 0.05).toFixed(2)}s both"` : ''
    }/>`;
  }
  const lvl = `LVL ${String(d.level).padStart(2, '0')}`;

  return svg(
    H,
    `<defs>
<linearGradient id="name" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${nameW}" y2="0" spreadMethod="repeat">
<stop offset="0" stop-color="${C.gold}"/><stop offset=".25" stop-color="${C.magenta}"/><stop offset=".5" stop-color="${C.purple}"/><stop offset=".75" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.gold}"/>
<animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="${nameW} 0" dur="6s" repeatCount="indefinite"/>
</linearGradient>
<clipPath id="type"><rect x="${nameX}" y="110" width="0" height="20"><animate attributeName="width" calcMode="discrete" values="${typed}" dur="2.4s" begin=".6s" fill="freeze"/></rect></clipPath>
</defs>
<rect width="${W}" height="${H}" fill="${C.bg}"/>
${stars}
${skyline(7, '#15111f', 14, 0.12)}
${skyline(21, '#1d172b', 6, 0.05)}
${pix(DISPLAY_NAME, nameX + nameS, 40 + nameS, nameS, '#3b1030')}
${pix(DISPLAY_NAME, nameX, 40, nameS, 'url(#name)')}
<g clip-path="url(#type)">${pix(TAGLINE, nameX, 112, 2, C.cyan)}</g>
<rect class="blink" x="${nameX}" y="112" width="10" height="14" fill="${C.cyan}"><animate attributeName="x" calcMode="discrete" values="${cursor}" dur="2.4s" begin=".6s" fill="freeze"/></rect>
<g style="animation:pop .5s 1s both">
<rect x="${nameX}" y="150" width="${pixWidth(lvl, 2) + 20}" height="26" fill="${C.gold}"/>
${pix(lvl, nameX + 10, 156, 2, C.bg)}
${pix(`CLASS: ${CLASS_NAME}`, nameX + pixWidth(lvl, 2) + 36, 156, 2, C.text)}
</g>
${pix('XP', nameX, 196, 2, C.gold)}
${xp}
${pix(`${fmt(d.stars)}/${fmt(milestone)} STARS`, nameX + 40 + xpCells * 12 + 10, 196, 2, C.muted)}
${pix(`ON GITHUB SINCE ${d.joinedYear}`, nameX, 226, 1, C.muted)}
<rect width="${W}" height="${H}" fill="none" stroke="${C.border}" stroke-width="4"/>`,
  );
}

function statsCard(d) {
  const tiles = [
    ['star', 'TOTAL STARS', d.stars, C.gold],
    ['check', 'ISSUES SOLVED', d.solvedIssues, C.green],
    ['commit', 'COMMITS', d.commits, C.cyan],
    ['merge', 'MERGED PRS', d.mergedPRs, C.purple],
    ['fork', 'FORKS', d.forks, C.orange],
    ['person', 'FOLLOWERS', d.followers, C.magenta],
  ];
  const tw = 272;
  const th = 84;
  const body = tiles
    .map(([ic, label, value, color], i) => {
      const x = 16 + (i % 3) * (tw + 16);
      const y = 44 + Math.floor(i / 3) * (th + 14);
      return `<g style="animation:pop .45s ${(i * 0.1).toFixed(1)}s both">
${panel(x, y, tw, th, color)}
<rect x="${x + 1}" y="${y + 1}" width="6" height="${th - 2}" fill="${color}" style="animation:pulse 2.4s ${(i * 0.3).toFixed(1)}s infinite"/>
<g style="animation:bob 2s ${(i * 0.25).toFixed(2)}s steps(2) infinite">${icon(ic, x + 26, y + 22, 6, color)}</g>
${pix(fmt(value), x + 88, y + 18, 4, C.text)}
${pix(label, x + 88, y + 56, 2, color)}
</g>`;
    })
    .join('\n');
  return svg(44 + 2 * th + 14 + 16, `<rect width="${W}" height="100%" fill="${C.bg}"/>${sectionTitle('PLAYER STATS', C.gold)}${body}`);
}

function languagesCard(d) {
  const top = d.languages.slice(0, 6);
  const rest = d.languages.slice(6);
  if (rest.length) {
    top.push({ name: 'Other', color: C.muted, pct: rest.reduce((s, l) => s + l.pct, 0) });
  }
  const cells = 36;
  const rowH = 30;
  const rows = top
    .map((lang, r) => {
      const y = 50 + r * rowH;
      const filled = Math.max(1, Math.round((lang.pct / 100) * cells));
      let bar = '';
      for (let i = 0; i < cells; i++) {
        const on = i < filled;
        bar += `<rect x="${250 + i * 14}" y="${y}" width="12" height="14" fill="${on ? lang.color : C.panelHi}"${
          on ? ` style="animation:cell .15s ${(0.2 + r * 0.12 + i * 0.03).toFixed(2)}s both"` : ''
        }/>`;
      }
      return `<rect x="16" y="${y}" width="14" height="14" fill="${lang.color}" style="animation:pulse 2s ${(r * 0.2).toFixed(1)}s infinite"/>
${pix(lang.name, 40, y, 2, C.text)}
${bar}
${pixRight(`${lang.pct.toFixed(1)}%`, W - 16, y, 2, lang.color)}`;
    })
    .join('\n');
  return svg(
    50 + top.length * rowH + 8,
    `<rect width="${W}" height="100%" fill="${C.bg}"/>${sectionTitle('LANGUAGES', C.cyan)}${rows}`,
  );
}

const reposTitleCard = () =>
  svg(40, `<rect width="${W}" height="100%" fill="${C.bg}"/>${sectionTitle(`TOP ${TOP_N} REPOS BY STARS`, C.magenta)}`);

function repoCard(repo, rank, now) {
  const H = 100;
  const accent = [C.gold, C.cyan, C.magenta][rank - 1] ?? C.purple;
  const lang = repo.primaryLanguage;
  const commit = repo.defaultBranchRef?.target;
  const starText = fmt(repo.stargazerCount);
  const forkText = fmt(repo.forkCount);
  const langLabel = lang ? lang.name : 'n/a';
  const commitX = 104 + 22 + langLabel.length * 7 + 18;
  return svg(
    H,
    `<defs><linearGradient id="shine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".07"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="clip"><rect x="4" y="4" width="${W - 8}" height="${H - 12}"/></clipPath></defs>
<rect width="${W}" height="${H}" fill="${C.bg}"/>
<g style="animation:slide .5s ${(rank * 0.06).toFixed(2)}s both">
${panel(4, 4, W - 8, H - 12, accent)}
<rect x="5" y="5" width="6" height="${H - 14}" fill="${accent}" style="animation:pulse 2.4s ${(rank * 0.2).toFixed(1)}s infinite"/>
<g clip-path="url(#clip)"><rect x="0" y="4" width="160" height="${H - 12}" fill="url(#shine)" style="animation:sweep 7s ${(rank * 0.35).toFixed(2)}s linear infinite"/></g>
${pix(String(rank).padStart(2, '0'), 28, 28, 5, accent)}
${pix(repo.name, 104, 18, 3, C.text)}
<text x="104" y="60" font-family="${MONO}" font-size="13" fill="${C.muted}">${esc(truncate(repo.description ?? 'No description', 74))}</text>
<rect x="104" y="71" width="12" height="12" fill="${lang?.color ?? C.dim}"/>
<text x="124" y="81" font-family="${MONO}" font-size="12" fill="${C.text}">${esc(langLabel)}</text>
${
  commit
    ? `${icon('commit', commitX, 70, 2, C.green)}
<text x="${commitX + 20}" y="81" font-family="${MONO}" font-size="12" fill="${C.muted}"><tspan fill="${C.green}">${esc(
        relTime(commit.committedDate, now),
      )}</tspan> · ${esc(truncate(commit.messageHeadline, 52))}</text>`
    : ''
}
<g style="animation:twinkle 1.8s ${(rank * 0.15).toFixed(2)}s infinite">${icon('star', W - 24 - pixWidth(starText, 3) - 31, 20, 3, C.gold)}</g>
${pixRight(starText, W - 24, 20, 3, C.gold)}
${icon('fork', W - 24 - pixWidth(forkText, 2) - 22, 58, 2, C.muted)}
${pixRight(forkText, W - 24, 58, 2, C.muted)}
</g>`,
  );
}

// ---------------------------------------------------------------- main

async function updateReadme(repos) {
  const path = join(ROOT, 'README.md');
  const readme = await readFile(path, 'utf8');
  const list = repos
    .map(
      (repo, i) =>
        `<a href="${repo.url}"><img src="assets/repo-${String(i + 1).padStart(2, '0')}.svg" width="100%" alt="#${i + 1} ${esc(
          repo.name,
        )} - ${repo.stargazerCount} stars"></a>`,
    )
    .join('\n');
  const next = readme.replace(
    /(<!-- TOP_REPOS:START -->)[\s\S]*?(<!-- TOP_REPOS:END -->)/,
    (_, start, end) => `${start}\n${list}\n${end}`,
  );
  if (next !== readme) await writeFile(path, next);
}

async function main() {
  if (!TOKEN) throw new Error('Set GITHUB_TOKEN (or GH_TOKEN) to query the GitHub API.');
  const data = await fetchData();
  await mkdir(ASSETS, { recursive: true });
  const files = {
    'hero.svg': heroCard(data),
    'stats.svg': statsCard(data),
    'languages.svg': languagesCard(data),
    'repos-title.svg': reposTitleCard(),
  };
  data.topRepos.forEach((repo, i) => {
    files[`repo-${String(i + 1).padStart(2, '0')}.svg`] = repoCard(repo, i + 1, data.now);
  });
  await Promise.all(Object.entries(files).map(([name, content]) => writeFile(join(ASSETS, name), content)));
  await updateReadme(data.topRepos);
  console.log(
    `Generated ${Object.keys(files).length} cards: ${data.stars} stars, ${data.solvedIssues} issues solved, ${data.commits} commits (${data.privateRepos} private repos visible).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
