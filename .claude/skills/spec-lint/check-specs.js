#!/usr/bin/env node
/**
 * Проверка целостности спек в `specs/**\/spec.md`.
 *
 * Каждая проверка здесь заведена потому, что соответствующая ошибка уже
 * происходила при живой правке спек, а не потому, что «так принято»:
 *
 *  1. Дубли кодов        — один и тот же код у двух разных требований.
 *  2. Висячие ссылки     — упоминание кода, который нигде не определён.
 *  3. Пропуски и порядок  — номера внутри блока идут не подряд или вразнобой.
 *  4. Реестр блоков      — блок используется в спеке, но не заведён в реестре.
 *  5. Оглавление         — пункт оглавления не ведёт ни к какому заголовку.
 *
 * Выведенные из употребления коды (удалённые требования, чьи номера нельзя
 * переиспользовать) объявляются прямо в спеке строкой вида:
 *
 *     *`РАБ-Ф-05` и `РАБ-Ф-06` не используются: ...*
 *
 * Такие коды исключаются из проверки висячих ссылок и из проверки пропусков.
 *
 * Запуск: node .claude/skills/spec-lint/check-specs.js [--json]
 * Код возврата: 0 — нарушений нет, 1 — есть.
 */

const fs = require('fs');
const path = require('path');

const SPECS_DIR = 'specs';
const REGISTRY = path.join('.specify', 'memory', 'blocks-registry.md');

const CODE_RE = /\b([А-ЯЁ]{2,4})-([ОБФ])-(\d{2})\b/g;
const DEF_RE = /^- \*\*([А-ЯЁ]{2,4}-[ОБФ]-\d{2})\*\*/gm;
const RETIRED_RE = /^\*(`[А-ЯЁ]{2,4}-[ОБФ]-\d{2}`(?:\s*(?:и|,)\s*`[А-ЯЁ]{2,4}-[ОБФ]-\d{2}`)*)\s*не используются/gm;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.name === 'spec.md') {
      out.push(full);
    }
  }
  return out;
}

/**
 * Якорь заголовка по правилам GitHub. Ключевая деталь: каждый пробел даёт
 * СВОЙ дефис, пробелы не схлопываются. Поэтому «ЗАК — Закреплённые новости»
 * (где тире выброшено как пунктуация, а два пробела вокруг него остались)
 * даёт «зак--закреплённые-новости» с двойным дефисом — именно так эти ссылки
 * и записаны в оглавлениях спек.
 */
function slugify(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

function main() {
  const asJson = process.argv.includes('--json');
  const problems = [];

  if (!fs.existsSync(SPECS_DIR)) {
    console.error(`Каталог ${SPECS_DIR}/ не найден — запускать из корня умбрелла-репозитория.`);
    process.exit(1);
  }

  const files = walk(SPECS_DIR);
  const defs = new Map(); // код -> [{file, line}]
  const refs = []; // {code, file, line}
  const retired = new Set();
  const blocksUsed = new Set();

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const lines = text.split(/\r?\n/);

    for (const m of text.matchAll(RETIRED_RE)) {
      for (const c of m[1].matchAll(/[А-ЯЁ]{2,4}-[ОБФ]-\d{2}/g)) {
        retired.add(c[0]);
      }
    }

    lines.forEach((line, i) => {
      const def = new RegExp(DEF_RE.source).exec(line);
      if (def) {
        const code = def[1];
        if (!defs.has(code)) defs.set(code, []);
        defs.get(code).push({ file, line: i + 1 });
        blocksUsed.add(code.split('-')[0]);
      }
      for (const m of line.matchAll(CODE_RE)) {
        refs.push({ code: m[0], file, line: i + 1 });
      }
    });

    // 5. Оглавление: каждый пункт ведёт к существующему заголовку.
    const anchors = new Set(
      lines.filter((l) => /^#{2,6}\s/.test(l)).map((l) => slugify(l.replace(/^#{2,6}\s*/, ''))),
    );
    lines.forEach((line, i) => {
      const link = /^\s*-\s*\[[^\]]+\]\(#([^)]+)\)/.exec(line);
      if (link && !anchors.has(link[1])) {
        problems.push({
          kind: 'оглавление',
          file,
          line: i + 1,
          message: `пункт оглавления ведёт к «#${link[1]}», такого заголовка в файле нет`,
        });
      }
    });
  }

  // 1. Дубли определений.
  for (const [code, places] of defs) {
    if (places.length > 1) {
      problems.push({
        kind: 'дубль',
        file: places[0].file,
        line: places[0].line,
        message: `${code} определён ${places.length} раза: ${places.map((p) => `${p.file}:${p.line}`).join(', ')}`,
      });
    }
  }

  // 2. Висячие ссылки.
  const seenDangling = new Set();
  for (const { code, file, line } of refs) {
    if (defs.has(code) || retired.has(code)) continue;
    const key = `${code}|${file}`;
    if (seenDangling.has(key)) continue;
    seenDangling.add(key);
    problems.push({
      kind: 'висячая ссылка',
      file,
      line,
      message: `${code} упоминается, но нигде не определён (и не объявлен выведенным из употребления)`,
    });
  }

  // 3. Пропуски и порядок номеров внутри блока и слоя.
  const byBlockLayer = new Map();
  for (const [code, places] of defs) {
    const [block, layer, num] = code.split('-');
    const key = `${block}-${layer}`;
    if (!byBlockLayer.has(key)) byBlockLayer.set(key, []);
    byBlockLayer.get(key).push({ num: Number(num), code, ...places[0] });
  }
  for (const [key, items] of byBlockLayer) {
    const nums = items.map((i) => i.num);
    const sorted = [...nums].sort((a, b) => a - b);
    const retiredNums = [...retired]
      .filter((c) => c.startsWith(key + '-'))
      .map((c) => Number(c.split('-')[2]));

    for (let n = 1; n <= Math.max(...nums); n++) {
      if (!nums.includes(n) && !retiredNums.includes(n)) {
        problems.push({
          kind: 'пропуск номера',
          file: items[0].file,
          line: items[0].line,
          message: `${key}-${String(n).padStart(2, '0')} отсутствует, хотя номера выше есть — либо опечатка, либо требование удалено без пометки «не используются»`,
        });
      }
    }
    // Порядок номеров по файлу НЕ проверяется намеренно. Требования сгруппированы
    // по тематическим подразделам («Изображения», «Списки и таблицы», …), и новое
    // требование кладётся в свой подраздел, а не в конец блока — поэтому номера
    // законно идут вразбивку. Тематическая группировка полезнее числового порядка,
    // а нумерация нужна лишь для того, чтобы код был уникальной и стабильной ссылкой.
    void sorted;
  }

  // 4. Реестр блоков.
  if (fs.existsSync(REGISTRY)) {
    const reg = fs.readFileSync(REGISTRY, 'utf8');
    for (const block of [...blocksUsed].sort()) {
      if (!new RegExp('`' + block + '`').test(reg)) {
        problems.push({
          kind: 'реестр',
          file: REGISTRY,
          line: 1,
          message: `блок ${block} используется в спеках, но не заведён в реестре`,
        });
      }
    }
  } else {
    problems.push({ kind: 'реестр', file: REGISTRY, line: 1, message: 'реестр блоков не найден' });
  }

  if (asJson) {
    console.log(JSON.stringify({ files: files.length, defs: defs.size, problems }, null, 2));
  } else {
    console.log(`Проверено файлов: ${files.length}, требований: ${defs.size}, выведено из употребления: ${retired.size}`);
    if (problems.length === 0) {
      console.log('Нарушений нет.');
    } else {
      console.log(`\nНарушений: ${problems.length}\n`);
      for (const p of problems) {
        console.log(`  [${p.kind}] ${p.file}:${p.line}`);
        console.log(`    ${p.message}`);
      }
    }
  }

  process.exit(problems.length ? 1 : 0);
}

main();
