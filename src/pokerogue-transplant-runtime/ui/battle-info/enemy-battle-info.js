import { BattleInfo } from './battle-info.js';

export class EnemyBattleInfo extends BattleInfo {
  constructor(ui) {
    super(ui, 'enemy');
    this.boss = false;
    this.bossSegments = 0;
    this.hpBarSegmentDividers = [];
    this.ownedIcon = null;
    this.lastIsBoss = null;
  }

  setup() {
    super.setup();

    const { scene, env } = this;

    // Owned icon (shown when player has caught this species)
    const ownedKey = env.UI_ASSETS.iconOwned?.key;
    this.ownedIcon = ownedKey && env.textureExists(scene, ownedKey)
      ? scene.add.image(
          this.pos.statusX,
          this.pos.statusY,
          ownedKey
        ).setOrigin(0, 0).setVisible(false).setName('pbinfo-enemy-owned')
      : null;

    if (this.ownedIcon) this.container.add(this.ownedIcon);
  }

  /**
   * Switch between mini and boss HP bar textures and adjust element positions.
   * Matches PokeRogue's updateBossSegments().
   */
  updateBossMode(isBoss, bossSegments) {
    if (isBoss === this.boss) {
      // Just update segments if boss state didn't change
      this.bossSegments = bossSegments || 0;
      this._rebuildSegmentDividers();
      return;
    }

    this.boss = isBoss;
    this.bossSegments = bossSegments || 0;

    const { scene, env } = this;
    const UI = env.UI_ASSETS;

    // Shift elements (PokeRogue: x += 48 * (boss ? -1 : 1))
    const shift = 48 * (isBoss ? -1 : 1);
    [
      this.nameText,
      this.genderText,
      this.teraIcon,
      this.splicedIcon,
      this.shinyIcon,
      this.ownedIcon,
      this.statusSprite,
    ].forEach(el => { if (el) el.x += shift; });

    // HP bar shifts differently (PokeRogue: 38 * (boss ? -1 : 1))
    const hpShift = 38 * (isBoss ? -1 : 1);
    if (this.hpFill) {
      this.hpFill.x += hpShift;
      this.hpFill.y += 2 * (isBoss ? -1 : 1);
    }
    if (this.hpLabel) {
      this.hpLabel.x += hpShift;
      this.hpLabel.y += 1 * (isBoss ? -1 : 1);
    }

    // Swap bg and HP overlay textures
    if (this.bg) {
      const bgKey = isBoss
        ? (UI.pbinfoEnemyBoss?.key || UI.pbinfoEnemy.key)
        : UI.pbinfoEnemy.key;
      this.bg.setTexture(bgKey);
    }
    if (this.hpFill) {
      const hpKey = isBoss
        ? (UI.overlayHpBossAtlas?.key || UI.overlayHpAtlas.key)
        : UI.overlayHpAtlas.key;
      const hpLabelKey = isBoss
        ? (UI.overlayHpLabelBoss?.key || UI.overlayHpLabel.key)
        : UI.overlayHpLabel.key;
      if (env.textureExists(scene, hpKey, 'high')) {
        this.hpFill.setTexture(hpKey, 'high');
        this.lastHpFrame = 'high';
      }
      if (this.hpLabel && env.textureExists(scene, hpLabelKey)) {
        this.hpLabel.setTexture(hpLabelKey);
      }
    }

    this._rebuildSegmentDividers();
  }

  /**
   * Draw segment divider lines on the HP bar.
   * Matches PokeRogue's updateBossSegmentDividers().
   */
  _rebuildSegmentDividers() {
    const { scene } = this;
    // Remove old dividers
    this.hpBarSegmentDividers.forEach(d => d.destroy());
    this.hpBarSegmentDividers = [];

    if (!this.boss || this.bossSegments <= 1 || !this.hpFill) return;

    const barWidth  = this.hpFill.width || 96; // boss bar is wider
    const barHeight = this.hpFill.height || 2;

    for (let s = 1; s < this.bossSegments; s++) {
      const dividerX = (s / this.bossSegments) * barWidth;
      const divider = scene.add.rectangle(
        this.hpFill.x + dividerX,
        this.hpFill.y + 1,
        1,
        barHeight - 1,
        0xffffff
      ).setOrigin(0.5, 0).setName(`hpBar_divider_${s}`);
      this.container.add(divider);
      this.hpBarSegmentDividers.push(divider);
    }
  }

  update(info = {}) {
    super.update(info);

    // Boss mode
    const isBoss     = Boolean(info.isBoss);
    const bossSegs   = Number(info.bossSegments) || 0;
    if (isBoss !== this.lastIsBoss) {
      this.updateBossMode(isBoss, bossSegs);
      this.lastIsBoss = isBoss;
    }

    // Owned icon
    if (this.ownedIcon) {
      this.ownedIcon.setVisible(Boolean(info.owned));
    }
  }
}
