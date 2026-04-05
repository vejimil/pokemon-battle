export * from './modes.js';
export * from './battle-info.js';
export * from './handlers.js';
export * from './ui-root.js';
export * from './dependency-map.js';

import { PokerogueUiRoot } from './ui-root.js';

export function createPkbPokerogueTransplantLayer(scene, controller, env) {
  return new PokerogueUiRoot(scene, controller, env);
}
