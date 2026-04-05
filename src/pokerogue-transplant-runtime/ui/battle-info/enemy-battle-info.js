import { BattleInfo } from './battle-info.js';

export class EnemyBattleInfo extends BattleInfo {
  constructor(ui) {
    super(ui, 'enemy');
  }
}
