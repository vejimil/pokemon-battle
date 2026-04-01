// Final bounded legacy-cleanup audit residue for the Pokémon Battle Game project.
//
// This file is intentionally tiny and non-executable. The old custom browser
// battle runtime that previously lived here was verified as unused by the live
// supported app path during the legacy-finalization pass, then removed instead
// of being kept as dormant code. The supported architecture truth is now:
// - singles: local Showdown engine required
// - doubles: blocked until an engine-backed path exists
// - Dynamax: intentionally disabled
// - no normal user-facing legacy battle fallback

export const LEGACY_CUSTOM_RUNTIME_AUDIT_REPORT = Object.freeze({
  stage: 'legacy-finalization',
  livePathDependsOnLegacyModule: false,
  livePathImportPathsChecked: [
    'src/app.js',
    'src/engine/showdown-local-bridge.js',
    'src/engine/showdown-serialization.js',
    'src/engine/showdown-singles-engine.js',
    'server/server.cjs',
    'server/showdown-engine.cjs',
    'index.html',
    'package.json',
  ],
  verifiedFindings: [
    'No live supported file imports src/legacy-custom-runtime-audit.js.',
    'No user-facing runtime descriptor exposes legacy singles as a normal option.',
    'Singles battle start remains gated behind the bundled local Showdown engine.',
    'Doubles remain blocked until a real engine-backed path exists.',
    'Dynamax remains intentionally disabled and is not part of the supported path.',
  ],
  removedDeadResidue: [
    'renderChoicePanel',
    'renderPendingChoices',
    'isChoiceComplete',
    'isPlayerReady',
    'startCustomRuntimeBattle',
    'resolveLegacyTurn',
    'buildBattleMon',
    'buildResolvedMove',
    'performMove',
    'resolveTargets',
    'applyStatusMove',
    'computeDamage',
    'endOfTurn',
    'determineWinner',
  ],
  reviewedButNotRehomed: [
    'isSpeciesLockedItem',
    'canRemoveHeldItem',
    'tryRemoveHeldItem',
    'trySetHeldItem',
    'clearSwitchVolatile',
    'getForcedMoveChoice',
    'setBattleWeather',
    'setBattleTerrain',
    'applyEntryHazards',
    'applySideConditionMove',
  ],
  notRehomedReason: 'These helpers were legacy battle-resolution helpers with no verified live-path caller after the final dependency audit. Re-homing them would have preserved dead architecture instead of supporting the engine-first runtime.',
  intentionallyKept: [
    'LEGACY_CUSTOM_RUNTIME_AUDIT_REPORT',
  ],
  intentionallyKeptReason: 'A compact audit report is kept so future work can see that the old module was intentionally removed after dependency verification, rather than accidentally lost.',
});

export function getLegacyCustomRuntimeAuditReport() {
  return LEGACY_CUSTOM_RUNTIME_AUDIT_REPORT;
}
