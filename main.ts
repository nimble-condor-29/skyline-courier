// Skyline Courier — hand-in program (Node 22, standard library only).
// Copies game/ and screenshots/ from beside this file into the output
// directory and writes /output/dossier.json with the vendored make.fun
// library, using the same caps the gate enforces.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Gate caps from the competition rules: dossier text at most 160 KiB,
// at most 4 screenshots of at most 256 KiB each, game/ at most 993 files
// and 48 MiB in all, and no path under game/ longer than 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
console.log('Skyline Courier dossier written to ' + join(out, 'dossier.json'));
