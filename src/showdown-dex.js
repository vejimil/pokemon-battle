const DEX_VERSION = '0.10.6';
const DEX_URLS = [
  `https://cdn.jsdelivr.net/npm/@pkmn/dex@${DEX_VERSION}/+esm`,
  `https://esm.sh/@pkmn/dex@${DEX_VERSION}`,
];

function resolveDexExport(mod) {
  if (!mod) return null;
  if (mod.Dex?.species?.get && mod.Dex?.moves?.get) return mod.Dex;
  if (mod.default?.Dex?.species?.get && mod.default?.Dex?.moves?.get) return mod.default.Dex;
  if (mod.default?.species?.get && mod.default?.moves?.get) return mod.default;
  return null;
}

export async function loadShowdownDex() {
  const failures = [];

  for (const url of DEX_URLS) {
    try {
      const mod = await import(url);
      const Dex = resolveDexExport(mod);
      if (!Dex) {
        failures.push(`${url} → module loaded but no Dex export was found`);
        continue;
      }
      return {Dex, source: url, version: DEX_VERSION};
    } catch (error) {
      failures.push(`${url} → ${error?.message || String(error)}`);
    }
  }

  throw new Error(failures.join(' | '));
}
