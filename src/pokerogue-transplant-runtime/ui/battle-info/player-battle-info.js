import { BattleInfo } from './battle-info.js';

const PLAYER_NORMAL_POS = Object.freeze({
  nameTextX: -115,
  nameTextY: -15,
  levelX: -41,
  levelY: -10,
  hpX: -61,
  hpY: -1,
  statusX: -115,
  statusY: -3.5,
});

// Compact mode should visually mirror EnemyBattleInfo element relationships.
const PLAYER_COMPACT_POS = Object.freeze({
  nameTextX: -124,
  nameTextY: -11,
  levelX: -50,
  levelY: -5,
  hpX: -71,
  hpY: 4.5,
  statusX: -124,
  statusY: 0.5,
});

const PLAYER_NORMAL_TYPE_OFFSETS = Object.freeze([
  { x: -139, y: -17 },
  { x: -139, y: -1 },
  { x: -154, y: -17 },
]);

const PLAYER_COMPACT_TYPE_OFFSETS = Object.freeze([
  // Mirror enemy-like compact marker placement to the opposite side
  // of the player info body while preserving current Y alignment.
  { x: -139, y: -15.5 },
  { x: -139, y: -2.5 },
  { x: -154, y: -15.5 },
]);

export class PlayerBattleInfo extends BattleInfo {
  constructor(ui) {
    super(ui, 'player');
    this.hpNumbersContainer = null;
    this.lastHpNum    = -1;
    this.lastMaxHpNum = -1;
    this.lastExpPercent = -1;
    this.mini = false;
  }

  setup() {
    super.setup();

    const { scene } = this;

    // HP numbers container — right-aligned at x=-15, y=10 (PokeRogue hpNumbersContainer)
    this.hpNumbersContainer = scene.add.container(-15, 10)
      .setName('pbinfo-player-hp-numbers');
    this.container.add(this.hpNumbersContainer);

    // Apply geometry mask to expBar (matches PokeRogue's expMaskRect approach).
    // Mask position is initialised lazily in _tweenExpBar once the container
    // layout has been applied and container.x / .y are known.
    if (this.expBar) {
      // scene.make.graphics() creates standalone (not in display list); used only
      // as a geometry mask stencil — identical to PokeRogue's expMaskRect pattern.
      this.expMaskRect = scene.make.graphics({}).setName('pbinfo-player-exp-mask');
      const expMask = this.expMaskRect.createGeometryMask();
      this.expBar.setMask(expMask);
      // Keep expBar visible — the mask (which starts empty) controls what shows.
      this.expBar.setVisible(true);
      if (this.expBarLabel) this.expBarLabel.setVisible(false); // label only shows with exp
    }
  }

  getTypeTextureKeys() {
    if (!this.mini) return super.getTypeTextureKeys();
    return [
      this.env.UI_ASSETS.pbinfoEnemyType1.key,
      this.env.UI_ASSETS.pbinfoEnemyType2.key,
      this.env.UI_ASSETS.pbinfoEnemyType3.key,
    ];
  }

  /**
   * Build HP number sprites: digits rendered right-to-left using numbers atlas.
   * Matches PokeRogue's setHpNumbers().
   */
  setHpNumbers(hp, maxHp) {
    const { scene, env } = this;
    const numbersKey = env.UI_ASSETS.numbersAtlas?.key;
    this.hpNumbersContainer.removeAll(true);

    if (!numbersKey || !env.textureExists(scene, numbersKey)) return false;

    const hpStr    = String(Math.max(0, hp));
    const maxHpStr = String(maxHp);
    let offset = 0;

    // Build right-to-left: maxHp digits, then '/', then hp digits
    for (let i = maxHpStr.length - 1; i >= 0; i--) {
      this.hpNumbersContainer.add(
        scene.add.image(offset++ * -8, 0, numbersKey, maxHpStr[i]).setOrigin(0, 0.5)
      );
    }
    this.hpNumbersContainer.add(
      scene.add.image(offset++ * -8, 0, numbersKey, '/').setOrigin(0, 0.5)
    );
    for (let i = hpStr.length - 1; i >= 0; i--) {
      this.hpNumbersContainer.add(
        scene.add.image(offset++ * -8, 0, numbersKey, hpStr[i]).setOrigin(0, 0.5)
      );
    }
    return true;
  }

  /**
   * Compute the world-space origin of the expBar (container pos + local offset).
   * Called lazily so that layout() has already positioned the container.
   */
  _getExpMaskOrigin() {
    // expBar is at local (-98, 18) with origin (0,0) inside this.container.
    return {
      x: this.container.x + (-98),
      y: this.container.y + 18,
    };
  }

  /** Draw the geometry mask to reveal `width` pixels of the exp bar (left to right). */
  _applyExpMask(width) {
    if (!this.expMaskRect) return;
    const EXP_BAR_H = 2;
    const { x, y } = this._getExpMaskOrigin();
    this.expMaskRect.clear();
    if (width >= 1) {
      this.expMaskRect.fillStyle(0xffffff).fillRect(x, y, width, EXP_BAR_H);
    }
    // When width < 1 the mask is empty → bar is invisible (no mask = nothing shown).
  }

  /**
   * Animate the exp bar from current position to newExpPercent.
   * Uses a geometry mask (like PokeRogue's expMaskRect) so visibility is
   * controlled by the mask rather than setVisible/setCrop.
   */
  _tweenExpBar(newExpPercent) {
    const { scene } = this;
    if (!this.expBar) return;

    const EXP_MAX_WIDTH = 85;
    const fromPct = this.lastExpPercent < 0 ? newExpPercent : this.lastExpPercent;
    const fromWidth = EXP_MAX_WIDTH * fromPct / 100;
    const toWidth   = EXP_MAX_WIDTH * newExpPercent / 100;

    if (fromWidth === toWidth) return;

    const duration = this.lastExpPercent < 0 ? 0 : Math.abs(toWidth - fromWidth) * 20;

    // Show/hide exp label
    if (this.expBarLabel) this.expBarLabel.setVisible(toWidth >= 1);

    if (this.expMaskRect) {
      // Geometry-mask path: tween the mask width.
      if (!scene.tweens || duration === 0) {
        this._applyExpMask(toWidth);
      } else {
        const proxy = { w: fromWidth };
        scene.tweens.add({
          targets: proxy,
          w: toWidth,
          ease: 'Sine.easeIn',
          duration,
          onUpdate: () => this._applyExpMask(proxy.w),
          onComplete: () => this._applyExpMask(toWidth),
        });
      }
    } else {
      // Fallback: crop-based approach
      const { env } = this;
      if (toWidth < 1) {
        this.expBar.setVisible(false);
        env.setHorizontalCrop(this.expBar, 0);
        return;
      }
      this.expBar.setVisible(true);
      if (!scene.tweens || duration === 0) {
        env.setHorizontalCrop(this.expBar, toWidth);
      } else {
        const proxy = { w: fromWidth };
        scene.tweens.add({
          targets: proxy,
          w: toWidth,
          ease: 'Sine.easeIn',
          duration,
          onUpdate: () => env.setHorizontalCrop(this.expBar, proxy.w),
          onComplete: () => env.setHorizontalCrop(this.expBar, toWidth),
        });
      }
    }
  }

  /**
   * Update HP number sprites in real-time as the HP bar tweens.
   * Overrides the no-op stub in BattleInfo.
   */
  _onHpNumbersUpdate(scaleX, maxHp) {
    const currentHp = Math.max(0, Math.round(scaleX * maxHp));
    const rendered = this.setHpNumbers(currentHp, maxHp);
    // Keep cached values only when glyphs were actually rendered.
    if (rendered) {
      this.lastHpNum = currentHp;
      this.lastMaxHpNum = maxHp;
    }
  }

  update(info = {}) {
    // Skip the parent's instant exp update — we handle it here with animation
    super.update(info);

    const { env } = this;
    const compact = Boolean(info.compact);
    this.setMini(compact, { preservePosition: true });

    if (compact) return;

    // HP numbers
    let hp = Number(info.hp);
    let maxHp = Number(info.maxHp);
    if (!(maxHp > 0)) {
      const label = String(info.hpLabel || '').trim();
      const match = /^(\d+)\s*\/\s*(\d+)$/.exec(label);
      if (match) {
        hp = Number(match[1]);
        maxHp = Number(match[2]);
      }
    }
    if (maxHp > 0 && (hp !== this.lastHpNum || maxHp !== this.lastMaxHpNum)) {
      const rendered = this.setHpNumbers(hp, maxHp);
      if (rendered) {
        this.lastHpNum    = hp;
        this.lastMaxHpNum = maxHp;
      }
    }

    // EXP bar tween
    const newExpPercent = env.clamp(Number(info.expPercent ?? 0), 0, 100);
    if (newExpPercent !== this.lastExpPercent) {
      this._tweenExpBar(newExpPercent);
      this.lastExpPercent = newExpPercent;
    }
  }

  /**
   * Toggle mini mode (used when battle starts / switches happen).
   * Matches PokeRogue's setMini().
   */
  setMini(mini, options = {}) {
    if (this.mini === mini) return;
    this.mini = mini;
    const preservePosition = Boolean(options?.preservePosition);

    if (this.bg) {
      const miniKey = this.env.UI_ASSETS.pbinfoPlayerMini?.key || this.env.UI_ASSETS.pbinfoEnemy?.key;
      this.bg.setTexture(mini && miniKey
        ? miniKey
        : this.env.UI_ASSETS.pbinfoPlayer.key
      );
      this.bg.setY(mini ? -1 : 0);
    }

    // Legacy behavior shifts the container Y in mini mode, but doubles uses
    // explicit layout coordinates from ui.js; keep position stable there.
    if (!preservePosition) {
      this.container.y += -12 * (mini ? 1 : -1);
    }

    const nextPos = mini ? PLAYER_COMPACT_POS : PLAYER_NORMAL_POS;
    this.pos.nameTextX = nextPos.nameTextX;
    this.pos.nameTextY = nextPos.nameTextY;
    this.pos.levelX = nextPos.levelX;
    this.pos.levelY = nextPos.levelY;
    this.pos.hpX = nextPos.hpX;
    this.pos.hpY = nextPos.hpY;
    this.pos.statusX = nextPos.statusX;
    this.pos.statusY = nextPos.statusY;

    if (this.nameText) this.nameText.setPosition(this.pos.nameTextX, this.pos.nameTextY);
    if (this.genderText) this.genderText.setPosition(this.pos.nameTextX, this.pos.nameTextY);
    if (this.statusSprite) this.statusSprite.setPosition(this.pos.statusX, this.pos.statusY);
    if (this.hpFill) this.hpFill.setPosition(this.pos.hpX, this.pos.hpY);
    if (this.hpLabel) this.hpLabel.setPosition(this.pos.hpX - 1, this.pos.hpY - 3);
    if (this.levelContainer) {
      const levelLen = String(this.lastLevelStr || '').length;
      const overflow = Math.max(levelLen - 3, 0);
      this.levelContainer.setPosition(this.pos.levelX - (8 * overflow), this.pos.levelY);
    }

    const typeOffsets = mini ? PLAYER_COMPACT_TYPE_OFFSETS : PLAYER_NORMAL_TYPE_OFFSETS;
    this.typeIcons.forEach((icon, index) => {
      const offset = typeOffsets[index] || typeOffsets[0];
      if (!icon) return;
      icon.setPosition(offset.x, offset.y);
      // Player compact mode reuses enemy marker textures/placement, so flip
      // horizontally to keep marker body orientation consistent on player side.
      icon.setFlipX(mini);
    });

    // Re-anchor tera/splice/shiny icons to the updated name baseline.
    this._positionIcons(this.nameText?.displayWidth || 0, this.genderText?.displayWidth || 0);

    // Toggle HP numbers and exp bar / label visibility
    if (this.hpNumbersContainer) this.hpNumbersContainer.setVisible(!mini);
    // expBar visibility: in mini mode hide it; otherwise let the geometry mask control display
    if (this.expBar) this.expBar.setVisible(!mini);
    if (this.expBarLabel) this.expBarLabel.setVisible(!mini && this.lastExpPercent > 0);
  }
}
