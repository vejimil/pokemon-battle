import { BattleInfo } from './battle-info.js';

export class PlayerBattleInfo extends BattleInfo {
  constructor(ui) {
    super(ui, 'player');
  }
}
