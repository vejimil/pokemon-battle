function toId(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeStatBlock(stats, defaults) {
  return {
    hp: Number(stats?.hp ?? defaults.hp),
    atk: Number(stats?.atk ?? defaults.atk),
    def: Number(stats?.def ?? defaults.def),
    spa: Number(stats?.spa ?? defaults.spa),
    spd: Number(stats?.spd ?? defaults.spd),
    spe: Number(stats?.spe ?? defaults.spe),
  };
}

function packStats(stats, defaultValue) {
  const values = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].map(stat => {
    const raw = Number(stats?.[stat]);
    if (!Number.isFinite(raw)) return defaultValue;
    return raw;
  });
  const normalized = values.map(value => value === defaultValue ? '' : String(value));
  if (normalized.every(value => !value)) return '';
  return normalized.join(',');
}

function escapePacked(value) {
  return String(value || '').replace(/[|\\]/g, '').replace(/]/g, '').replace(/,/g, '');
}

export function makeShowdownNickname(mon, player, slot) {
  const explicit = String(mon?.nickname || '').trim();
  if (explicit) return explicit;
  const species = String(mon?.displaySpecies || mon?.formSpecies || mon?.species || 'Pokémon').trim();
  return `P${player + 1}-${slot + 1} ${species}`;
}

export function builderMonToShowdownSet(mon, player, slot) {
  const species = String(mon?.formSpecies || mon?.displaySpecies || mon?.species || '').trim();
  const nickname = makeShowdownNickname(mon, player, slot);
  const moves = (mon?.moves || []).map(move => String(move || '').trim()).filter(Boolean);
  return {
    name: nickname,
    species,
    item: String(mon?.item || '').trim(),
    ability: String(mon?.ability || '').trim(),
    moves,
    nature: String(mon?.nature || 'Serious').trim(),
    gender: String(mon?.gender || '').trim(),
    evs: normalizeStatBlock(mon?.evs, {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}),
    ivs: normalizeStatBlock(mon?.ivs, {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}),
    shiny: Boolean(mon?.shiny),
    level: Number(mon?.level || 100),
    happiness: 255,
    teraType: String(mon?.teraType || '').trim(),
  };
}

export function packShowdownTeam(team) {
  return (team || []).map(set => {
    const nickname = escapePacked(set?.name || '');
    const species = escapePacked(set?.species || '');
    const speciesField = toId(species) === toId(nickname) ? '' : species;
    const item = escapePacked(set?.item || '');
    const ability = escapePacked(set?.ability || '');
    const moves = (set?.moves || []).map(move => toId(move)).filter(Boolean).join(',');
    const nature = escapePacked(set?.nature || '');
    const evs = packStats(set?.evs, 0);
    const gender = escapePacked(set?.gender || '');
    const ivs = packStats(set?.ivs, 31);
    const shiny = set?.shiny ? 'S' : '';
    const level = Number(set?.level || 100) === 100 ? '' : String(Number(set?.level || 100));
    const teraType = escapePacked(set?.teraType || '');
    const extras = ['', '', '', '', '', teraType].join(',');
    return [
      nickname,
      speciesField,
      item,
      ability,
      moves,
      nature,
      evs,
      gender,
      ivs,
      shiny,
      level,
      extras,
    ].join('|');
  }).join(']');
}

export function buildShowdownTeamFromBuilderTeam(team, player) {
  return (team || []).map((mon, slot) => builderMonToShowdownSet(mon, player, slot));
}

export function buildShowdownChoice(choice) {
  if (!choice) return '';
  if (choice.kind === 'switch' && Number.isInteger(choice.switchTo)) {
    return `switch ${choice.switchTo + 1}`;
  }
  if (choice.kind !== 'move') return '';
  const moveIndex = choice.moveIndex === -1 ? 1 : (Number(choice.moveIndex) + 1);
  let command = `move ${moveIndex}`;
  if (choice.mega) command += ' mega';
  if (choice.ultra) command += ' ultra';
  if (choice.z) command += ' zmove';
  if (choice.dynamax) command += ' dynamax';
  if (choice.tera) command += ' terastallize';
  return command;
}
