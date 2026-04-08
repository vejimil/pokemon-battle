import { BattleInfo } from './battle-info.js';

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

  /**
   * Build HP number sprites: digits rendered right-to-left using numbers atlas.
   * Matches PokeRogue's setHpNumbers().
   */
  setHpNumbers(hp, maxHp) {
    const { scene, env } = this;
    const numbersKey = env.UI_ASSETS.numbersAtlas?.key;
    this.hpNumbersContainer.removeAll(true);

    if (!numbersKey || !env.textureExists(scene, numbersKey)) return;

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

  update(info = {}) {
    // Skip the parent's instant exp update — we handle it here with animation
    super.update(info);

    const { env } = this;

    // HP numbers
    const hp    = Number(info.hp    ?? 0);
    const maxHp = Number(info.maxHp ?? 0);
    if (maxHp > 0 && (hp !== this.lastHpNum || maxHp !== this.lastMaxHpNum)) {
      this.setHpNumbers(hp, maxHp);
      this.lastHpNum    = hp;
      this.lastMaxHpNum = maxHp;
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
  setMini(mini) {
    if (this.mini === mini) return;
    this.mini = mini;

    if (this.bg) {
      const miniKey = this.env.UI_ASSETS.pbinfoPlayerMini?.key;
      this.bg.setTexture(mini && miniKey
        ? miniKey
        : this.env.UI_ASSETS.pbinfoPlayer.key
      );
    }

    // Shift container Y (PokeRogue: this.y -= 12 * (mini ? 1 : -1))
    this.container.y += -12 * (mini ? 1 : -1);

    // Toggle HP numbers and exp bar / label visibility
    if (this.hpNumbersContainer) this.hpNumbersContainer.setVisible(!mini);
    // expBar visibility: in mini mode hide it; otherwise let the geometry mask control display
    if (this.expBar) this.expBar.setVisible(!mini);
    if (this.expBarLabel) this.expBarLabel.setVisible(!mini && this.lastExpPercent > 0);
  }
}
