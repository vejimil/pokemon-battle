function toId(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function isLoudFormChangeSpecies(speciesName = '') {
  const speciesId = toId(speciesName);
  if (!speciesId) return false;
  return (
    speciesId.includes('mega')
    || speciesId.includes('primal')
    || speciesId.includes('ultra')
    || speciesId.includes('gigantamax')
    || speciesId.includes('gmax')
    || speciesId.includes('eternamax')
  );
}

/**
 * Resolve FormChangePhase vs QuietFormChangePhase-style presentation branch.
 * This does not mutate battle state; it only classifies the event context.
 */
export function resolveFormChangePresentation(ev = {}, {
  playerSide = 'p1',
  side = 'p1',
  isActive = true,
  isVisible = true,
  uiMode = '',
} = {}) {
  const mechanism = String(ev?.mechanism || '').trim();
  const mechanismId = toId(mechanism);
  const triggerId = toId(ev?.trigger || '');
  const toSpecies = String(ev?.toSpecies || ev?.to || '').trim();
  const loudBySpecies = isLoudFormChangeSpecies(toSpecies);
  const loudByMechanism = mechanismId === 'mega' || mechanismId === '-mega';
  const isLoud = loudBySpecies || loudByMechanism;

  // PokeRogue data-level quiet flag is not emitted by Showdown,
  // so we infer quietness by mechanism/trigger class.
  const quietByTrigger = triggerId === 'ability' || triggerId === 'weather';
  const quiet = !isLoud || quietByTrigger;
  const isPlayerSide = side === playerSide;
  const modal = isPlayerSide && !quiet && uiMode === 'party' && triggerId === 'item';
  const kind = isPlayerSide && !quiet ? 'form' : 'quiet';
  const shouldAnimate = !ev?.silent && (modal || (Boolean(isActive) && Boolean(isVisible)));

  return {
    kind,
    quiet,
    modal,
    shouldAnimate,
    isPlayerSide,
    isActive: Boolean(isActive),
    isVisible: Boolean(isVisible),
  };
}
