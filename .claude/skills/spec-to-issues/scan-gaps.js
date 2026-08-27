#!/usr/bin/env node
/**
 * Собирает раздел «Расхождения с кодом» из спек и показывает, что из него уже
 * заведено как задача, а что нет.
 *
 * Расхождение — это строка таблицы вида «требование | что сейчас | почему это
 * проблема». Спека сама называет их кандидатами в задачи, так что это готовое
 * сырьё: не нужно перечитывать спеку целиком, чтобы понять, что осталось
 * сделать.
 *
 * Скрипт НЕ решает, сколько получится задач. Одно расхождение не равно одной
 * задаче: несколько строк часто чинятся одной правкой, а одна строка может
 * разойтись на серверную и клиентскую половины. Группировка — работа человека
 * или агента, скрипт лишь раскладывает материал.
 *
 * Запуск:
 *   node .claude/skills/spec-to-issues/scan-gaps.js [путь/к/spec.md] [--json] [--check]
 *
 * Без пути — просматривает все спеки. `--check` дополнительно спрашивает у
 * GitHub, упоминаются ли коды требований в существующих issues (нужен gh).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SPECS_DIR = 'specs';
const CODE_RE = /[А-ЯЁ]{2,4}-[ОБФ]-\d{2}/g;

const REPOS = {
  backend: 'MACTEPwar/streamer.API',
  frontend: 'MACTEPwar/stream.Front',
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.name === 'spec.md') out.push(full);
  }
  return out;
}

/** Слой требования (О/Б/Ф) → кто это делает. */
function roleOf(codes) {
  const layers = new Set(codes.map((c) => c.split('-')[1]));
  const back = layers.has('Б');
  const front = layers.has('Ф');
  if (back && front) return 'backend+frontend';
  if (back) return 'backend';
  if (front) return 'frontend';
  // Только общие требования: слой не задан, решается по смыслу расхождения.
  return 'по смыслу';
}

function parseGaps(file) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+Расхождения с кодом/.test(l));
  if (start === -1) return [];

  const gaps = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s/.test(line)) break; // следующий раздел
    if (!line.startsWith('|')) continue;
    if (/^\|\s*-{2,}/.test(line) || /Требование\s*\|/.test(line)) continue; // шапка и разделитель

    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;

    const codes = [...(cells[0].match(CODE_RE) || [])];
    if (codes.length === 0) continue;

    // В сводной таблице ОБЩ вторая колонка — имя спеки, а не «что сейчас».
    const isSummary = cells.length >= 3 && /^\[?[А-ЯЁ]{3}\]?/.test(cells[1]) && cells[1].length < 40;
    gaps.push({
      file,
      codes,
      role: roleOf(codes),
      now: isSummary ? cells[2] : cells[1],
      why: isSummary ? '' : cells[2] || '',
    });
  }
  return gaps;
}

/** Ищет коды требований в телах существующих issues — чтобы не заводить дубль. */
function coveredCodes() {
  const covered = new Map();
  for (const [role, repo] of Object.entries(REPOS)) {
    let raw;
    try {
      raw = execFileSync(
        'gh',
        ['issue', 'list', '--repo', repo, '--state', 'all', '--limit', '200', '--json', 'number,title,body'],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
      );
    } catch {
      continue; // gh недоступен или нет доступа — просто не проверяем
    }
    for (const issue of JSON.parse(raw)) {
      const hay = `${issue.title}\n${issue.body || ''}`;
      for (const c of hay.match(CODE_RE) || []) {
        if (!covered.has(c)) covered.set(c, []);
        covered.get(c).push(`${repo.split('/')[1]}#${issue.number}`);
      }
    }
    void role;
  }
  return covered;
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const check = args.includes('--check');
  const target = args.find((a) => !a.startsWith('--'));

  const files = target ? [target] : walk(SPECS_DIR);
  const gaps = files.flatMap(parseGaps);
  const covered = check ? coveredCodes() : new Map();

  for (const g of gaps) {
    g.covered = [...new Set(g.codes.flatMap((c) => covered.get(c) || []))];
  }

  if (asJson) {
    console.log(JSON.stringify(gaps, null, 2));
    return;
  }

  if (gaps.length === 0) {
    console.log('Расхождений не найдено.');
    return;
  }

  let lastFile = '';
  for (const g of gaps) {
    if (g.file !== lastFile) {
      console.log(`\n=== ${g.file} ===`);
      lastFile = g.file;
    }
    const mark = check ? (g.covered.length ? `уже: ${g.covered.join(', ')}` : 'НЕ ЗАВЕДЕНО') : '';
    console.log(`\n  ${g.codes.join(', ')}   [${g.role}]${mark ? '   ' + mark : ''}`);
    console.log(`    сейчас: ${g.now}`);
    if (g.why) console.log(`    почему: ${g.why}`);
  }

  const open = gaps.filter((g) => !g.covered.length);
  console.log(`\n\nВсего расхождений: ${gaps.length}` + (check ? `, без задачи: ${open.length}` : ''));
  if (check && open.length) {
    console.log('Одно расхождение ≠ одна задача: сгруппируй по тому, что чинится вместе.');
  }
}

main();
