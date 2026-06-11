#!/usr/bin/env node
'use strict';

/**
 * Piscataway Panic — Square Movement Test
 *
 * Usage:
 *   npm install          # first time only
 *   npx playwright install chromium   # first time only
 *   npm test             # run the test
 *
 * Override the game URL:
 *   GAME_URL=http://localhost:8080 npm test
 *
 * Output: test-output/test-report.md  +  test-output/*.png
 */

const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────────
const GAME_URL   = process.env.GAME_URL || 'https://jesusroa1.github.io/PiscatawayPanic/';
const OUTPUT_DIR = path.join(__dirname, '..', 'test-output');
const TOLERANCE  = 1;   // pixels — allow ±1 for rounding

// ── Game physics (must match constants in index.html) ─────────────────────
const LEVEL_W = 1280;
const G_TOP   = 28;
const G_BOT   = 172;         // LH(180) - 8
const MIN_X   = 10;
const MAX_X   = LEVEL_W - 10;  // 1270
const MIN_Y   = G_TOP + 8;     // 36
const MAX_Y   = G_BOT - 8;     // 164

// ── Helpers ───────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function log(msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

/**
 * Compute expected position after a movement command, accounting for
 * the same boundary clamping the game applies.
 */
function applyMove(x, y, cmd) {
  const m = cmd.match(/^go (right|left|up|down) (\d+(?:\.\d+)?) pixels?$/i);
  if (!m) return { x, y, clamped: false, unclamped: { x, y } };

  const dist = parseFloat(m[2]);
  const dx = m[1] === 'right' ? dist : m[1] === 'left'  ? -dist : 0;
  const dy = m[1] === 'down'  ? dist : m[1] === 'up'    ? -dist : 0;

  const rawX = x + dx, rawY = y + dy;
  const nx = clamp(rawX, MIN_X, MAX_X);
  const ny = clamp(rawY, MIN_Y, MAX_Y);

  return {
    x: nx,
    y: ny,
    clamped: (nx !== rawX || ny !== rawY),
    unclamped: { x: Math.round(rawX), y: Math.round(rawY) },
  };
}

/** Read all game state from the debug readout's data-* attributes. */
async function readState(page) {
  return page.evaluate(() => {
    const el = document.getElementById('ai-debug-readout');
    if (!el) return null;
    const int = (attr, fallback = 0) =>
      parseInt(el.getAttribute(attr) || String(fallback), 10);
    return {
      state:       el.getAttribute('data-state')        || '',
      x:           int('data-x'),
      y:           int('data-y'),
      hp:          int('data-hp'),
      maxHp:       int('data-max-hp', 5),
      weapon:      el.getAttribute('data-weapon')       || '',
      heat:        int('data-heat'),
      cakes:       int('data-cakes'),
      score:       int('data-score'),
      lastCommand: el.getAttribute('data-last-command') || '',
      lastResult:  el.getAttribute('data-last-result')  || '',
    };
  });
}

/** Type a command into the AI input and click Send. */
async function sendCommand(page, cmd) {
  await page.locator('#ai-command-input').fill(cmd);
  await page.locator('#ai-command-submit').click();
  // Wait ~15 frames at 60fps for the game loop to process + re-render
  await page.waitForTimeout(300);
}

/** Capture a full-viewport screenshot and return the filename. */
async function capture(page, filename) {
  const filepath = path.join(OUTPUT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  return filename;  // relative, used in markdown
}

// ── Main ──────────────────────────────────────────────────────────────────
async function run() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const startedAt = new Date();
  log(`Output dir: ${OUTPUT_DIR}`);
  log(`Game URL:   ${GAME_URL}`);

  // ── Launch browser ──────────────────────────────────────────────────
  log('Launching headless Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Surface browser console errors for debugging
  page.on('console', m => {
    if (m.type() === 'error') log(`[browser error] ${m.text()}`);
  });

  const steps   = [];
  let baseShot  = '';
  let initState = null;

  try {
    // ── Load game ─────────────────────────────────────────────────────
    log(`Navigating to ${GAME_URL} ...`);
    await page.goto(GAME_URL, { waitUntil: 'networkidle', timeout: 30_000 });

    await page.waitForSelector('#ai-command-input', { timeout: 15_000 });
    log('AI harness detected on page.');

    // ── Start game ────────────────────────────────────────────────────
    log('Sending "start" command...');
    await sendCommand(page, 'start');

    await page.waitForFunction(
      () => {
        const el = document.getElementById('ai-debug-readout');
        return el && el.getAttribute('data-state') === 'playing';
      },
      { timeout: 8_000 }
    );

    initState = await readState(page);
    log(`Game playing. Initial position: (${initState.x}, ${initState.y}), HP: ${initState.hp}/${initState.maxHp}`);

    baseShot = await capture(page, 'step-0-start.png');

    // ── Square movement sequence ──────────────────────────────────────
    const commands = [
      'go right 100 pixels',
      'go down 100 pixels',
      'go left 100 pixels',
      'go up 100 pixels',
    ];

    let curX = initState.x;
    let curY = initState.y;

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i];
      const exp = applyMove(curX, curY, cmd);

      log(`Step ${i + 1}: "${cmd}" → expected (${exp.x}, ${exp.y})${exp.clamped ? ` [clamped from (${exp.unclamped.x}, ${exp.unclamped.y})]` : ''}`);

      await sendCommand(page, cmd);

      const state    = await readState(page);
      const imgName  = `step-${i + 1}-${cmd.replace(/\s+/g, '-')}.png`;
      await capture(page, imgName);

      const dx     = Math.abs(state.x - exp.x);
      const dy     = Math.abs(state.y - exp.y);
      const passed = dx <= TOLERANCE && dy <= TOLERANCE;

      const result = {
        step: i + 1,
        command: cmd,
        expected: { x: exp.x, y: exp.y },
        actual:   { x: state.x, y: state.y },
        passed,
        dx, dy,
        screenshot: imgName,
        clamped: exp.clamped,
        unclamped: exp.unclamped,
        gameState: state,
      };
      steps.push(result);

      // Advance expected cursor by the clamped position
      curX = exp.x;
      curY = exp.y;

      const badge = passed ? '✅ PASS' : '❌ FAIL';
      log(`  ${badge} actual (${state.x}, ${state.y}) | expected (${exp.x}, ${exp.y}) | Δ(${dx}, ${dy})`);
    }

  } finally {
    await browser.close();
    log('Browser closed.');
  }

  // ── Generate report ───────────────────────────────────────────────────
  const endedAt   = new Date();
  const allPassed = steps.every(s => s.passed);
  const duration  = ((endedAt - startedAt) / 1000).toFixed(1);

  log(`\nBuilding report (${allPassed ? 'ALL PASS' : 'FAILURES DETECTED'})...`);

  const md = buildReport({
    startedAt, duration, allPassed, steps, baseShot, initState,
  });

  const reportPath = path.join(OUTPUT_DIR, 'test-report.md');
  fs.writeFileSync(reportPath, md, 'utf8');

  console.log('');
  console.log(`📄  Report   → ${reportPath}`);
  console.log(`📁  Images   → ${OUTPUT_DIR}`);
  console.log(`\n${allPassed ? '✅  All tests passed.' : '❌  Some tests failed.'}`);

  process.exit(allPassed ? 0 : 1);
}

// ── Report builder ────────────────────────────────────────────────────────
function buildReport({ startedAt, duration, allPassed, steps, baseShot, initState }) {
  const lines = [];
  const L = (...ls) => lines.push(...ls);

  // Header
  L(
    `# Piscataway Panic — Movement Test Report`,
    ``,
    `| | |`,
    `|---|---|`,
    `| **Date** | ${startedAt.toLocaleString()} |`,
    `| **Duration** | ${duration}s |`,
    `| **Game URL** | \`${GAME_URL}\` |`,
    `| **Overall** | ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'} |`,
    ``,
    `---`,
  );

  // Baseline
  L(
    ``,
    `## Baseline — Game State at Start`,
    ``,
  );
  if (initState) {
    L(
      `| Field | Value |`,
      `|-------|-------|`,
      `| State  | \`${initState.state}\` |`,
      `| X      | ${initState.x} |`,
      `| Y      | ${initState.y} |`,
      `| HP     | ${initState.hp}/${initState.maxHp} |`,
      `| Weapon | ${initState.weapon} |`,
      ``,
    );
  }
  if (baseShot) {
    L(`![Baseline screenshot](${baseShot})`, ``);
  }
  L(`---`);

  // Summary table
  L(
    ``,
    `## Step Results`,
    ``,
    `| Step | Command | Expected (x, y) | Actual (x, y) | Δx | Δy | Result |`,
    `|:----:|---------|:---------------:|:-------------:|:--:|:--:|:------:|`,
  );
  for (const s of steps) {
    const clamped = s.clamped ? ` ⚠️` : '';
    const status  = s.passed  ? `✅ Pass` : `❌ Fail`;
    L(`| ${s.step} | \`${s.command}\` | (${s.expected.x}, ${s.expected.y})${clamped} | (${s.actual.x}, ${s.actual.y}) | ${s.dx} | ${s.dy} | ${status} |`);
  }
  L(
    ``,
    `> ⚠️ = coordinate was boundary-clamped by the game engine (expected behaviour).`,
    ``,
    `---`,
  );

  // Per-step screenshots
  L(``, `## Step-by-Step Detail`, ``);
  for (const s of steps) {
    const badge = s.passed ? '✅ Pass' : '❌ Fail';
    L(`### Step ${s.step} — \`${s.command}\` — ${badge}`, ``);

    if (s.clamped) {
      L(
        `> **Boundary clamping applied.** Raw target was (${s.unclamped.x}, ${s.unclamped.y}),`,
        `> clamped to (${s.expected.x}, ${s.expected.y}) by game bounds`,
        `> (x: ${MIN_X}–${MAX_X}, y: ${MIN_Y}–${MAX_Y}).`,
        ``,
      );
    }

    L(
      `| Field | Value |`,
      `|-------|-------|`,
      `| Expected position | (${s.expected.x}, ${s.expected.y}) |`,
      `| Actual position   | (${s.actual.x}, ${s.actual.y}) |`,
      `| Delta             | Δx=${s.dx} Δy=${s.dy} |`,
      `| Result            | ${badge} |`,
      `| HP                | ${s.gameState.hp}/${s.gameState.maxHp} |`,
      `| Heat              | ${s.gameState.heat}/100 |`,
      `| Score             | ${s.gameState.score} |`,
      ``,
      `![Step ${s.step} screenshot](${s.screenshot})`,
      ``,
    );
  }

  L(`---`, ``);

  // Summary
  L(`## Summary`, ``);

  if (allPassed) {
    const s = steps[steps.length - 1];
    const returnDx = Math.abs(s.actual.x - (initState ? initState.x : 55));
    const returnDy = Math.abs(s.actual.y - (initState ? initState.y : 90));
    L(
      `All 4 movement tests passed. ` +
      `The square movement sequence (\`right → down → left → up\`, 100 pixels each step) ` +
      `executed correctly via the AI command input harness.`,
      ``,
      `**Boundary clamping note:** The "go down 100 pixels" step was clamped to y=${MAX_Y} ` +
      `(game's maximum Y boundary). This is expected engine behaviour, not a defect.`,
      ``,
      `**Return accuracy:** After completing the full sequence, the character was at ` +
      `(${s.actual.x}, ${s.actual.y}). ` +
      (returnDx <= 2 && returnDy <= 2
        ? `This is within 2px of the starting position — movement is consistent.`
        : `This differs from the start by (${returnDx}, ${returnDy}) pixels — ` +
          `partly due to boundary clamping on the downward leg.`),
    );
  } else {
    const failed = steps.filter(s => !s.passed);
    L(`${failed.length} of ${steps.length} movement test(s) failed:`, ``);
    for (const s of failed) {
      L(
        `- **Step ${s.step}** (\`${s.command}\`): ` +
        `expected (${s.expected.x}, ${s.expected.y}), ` +
        `got (${s.actual.x}, ${s.actual.y}) — ` +
        `off by (${s.actual.x - s.expected.x}, ${s.actual.y - s.expected.y}).`,
      );
    }
    L(
      ``,
      `Possible causes: game physics constants changed, boundary clamping mismatch, ` +
      `or the AI command input was not processed before the screenshot was taken. ` +
      `Check \`index.html\` constants (\`LEVEL_W\`, \`G_TOP\`, \`G_BOT\`) and ` +
      `the \`applyMove()\` function in this test script.`,
    );
  }

  L(``);
  return lines.join('\n');
}

// ── Entry point ───────────────────────────────────────────────────────────
run().catch(err => {
  console.error('\n❌  Test runner crashed:', err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
