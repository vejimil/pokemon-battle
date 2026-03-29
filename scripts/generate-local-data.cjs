const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const rawDir = '/mnt/data/pkmn_raw';
const outDir = '/mnt/data/pkb-stage3-localized/src/data';
const files = [
  'pokedex.ts',
  'learnsets.ts',
  'moves.ts',
  'abilities.ts',
  'items.ts',
  'aliases.ts',
  'formats-data.ts',
  'typechart.ts',
  'natures.ts',
  'conditions.ts',
  'rulesets.ts',
  'tags.ts',
];

fs.mkdirSync(outDir, {recursive: true});

for (const file of files) {
  const srcPath = path.join(rawDir, file);
  const code = fs.readFileSync(srcPath, 'utf8');
  const transpiled = ts.transpileModule(code, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ES2020,
      removeComments: false,
    },
    fileName: file,
  }).outputText;
  const banner = `// Generated from smogon/pokemon-showdown ${file}\n`;
  fs.writeFileSync(path.join(outDir, file.replace(/\.ts$/, '.js')), banner + transpiled, 'utf8');
}
