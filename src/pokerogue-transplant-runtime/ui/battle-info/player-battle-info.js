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

    const { scene, env } = this;

    // HP numbers container — right-aligned at x=-15, y=10 (PokeRogue hpNumbersContainer)
    this.hpNumbersContainer = scene.add.container(-15, 10)
      .setName('pbinfo-player-hp-numbers');
    this.container.add(this.hpNumbersContainer);

    // Crop expBar to 0 on init so it's invisible before the first update()
    if (this.expBar) env.setHorizontalCrop(this.expBar, 0);
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
   * Animate the exp bar from current position to newExpPercent.
   * Matches PokeRogue's updatePokemonExp() pattern.
   */
  _tweenExpBar(newExpPercent) {
    const { scene, env } = this;
    if (!this.expBar) return;

    const EXP_MAX_WIDTH = 85;
    const fromPct = this.lastExpPercent < 0 ? newExpPercent : this.lastExpPercent;
    const fromWidth = EXP_MAX_WIDTH * fromPct / 100;
    const toWidth   = EXP_MAX_WIDTH * newExpPercent / 100;

    if (fromWidth === toWidth) return;

    const duration = this.lastExpPercent < 0 ? 0 : Math.abs(toWidth - fromWidth) * 20;

    // Proxy object so we can tween the crop width
    const proxy = { w: fromWidth };
    if (scene.tweens) {
      scene.tweens.add({
        targets: proxy,
        w: toWidth,
        ease: 'Sine.easeIn',
        duration,
        onUpdate: () => env.setHorizontalCrop(this.expBar, proxy.w),
        onComplete: () => env.setHorizontalCrop(this.expBar, toWidth),
      });
    } else {
      env.setHorizontalCrop(this.expBar, toWidth);
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

    // Toggle HP numbers and exp bar visibility
    [this.hpNumbersContainer, this.expBar, this.expBarLabel]
      .filter(Boolean)
      .forEach(el => el.setVisible(!mini));
  }
}
