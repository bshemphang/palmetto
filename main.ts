// main.ts: Palmetto entry builder for make.fun (Node 22, standard library only).
// Copies game/ and screenshots/ into the output directory and writes
// output/dossier.json by calling buildDossier from vendor/makefun-game.ts.
// Run from the repo root: MAKEFUN_OUTPUT_DIR=out node main.ts
// The output directory itself is never removed: in the grader it is a
// bind-mounted volume, so deleting it fails and the run exits 1. Only the
// three entries this program owns are cleared inside it, one by one.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

mkdirSync(outDir, { recursive: true });

for (const owned of ['game', 'screenshots', 'dossier.json']) {
  rmSync(join(outDir, owned), { recursive: true, force: true });
}

const gameSrc = join(repoRoot, 'game');
const shotsSrc = join(repoRoot, 'screenshots');
if (!existsSync(gameSrc)) throw new Error('game/ is missing from the repository');
if (!existsSync(shotsSrc)) throw new Error('screenshots/ is missing from the repository');

cpSync(gameSrc, join(outDir, 'game'), { recursive: true });
cpSync(shotsSrc, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('Palmetto dossier written to ' + join(outDir, 'dossier.json'));
console.log('Dossier bytes: ' + dossier.length + ' (cap 163840 for text, 4 MiB total)');
