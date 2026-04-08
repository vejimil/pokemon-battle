import { addTextObject } from '../helpers/text.js';

// status key (Showdown format) → statuses_ko atlas frame
const STATUS_FRAME = {
  brn: 'burn',
  par: 'paralysis',
  psn: 'poison',
  tox: 'toxic',
  slp: 'sleep',
  frz: 'freeze',
  pkrs: 'pokerus',
};

// gender symbol
const GENDER_SYMBOL = { M: '♂', F: '♀' };
const GENDER_COLOR  = { M: '#40c8f8', F: '#f89890' };

const HP_FILL_WIDTH = 48; // overlay_hp frame width (px)

export class BattleInfo {
  constructor(ui, side) {
    this.ui = ui;
    this.scene = ui.scene;
    this.env = ui.env;
    this.side = side;
    this.isPlayer = side === 'player';

    this.container   = null;
    this.bg          = null;
    this.nameText    = null;
    this.genderText  = null;
    this.levelContainer = null;   // Container holding overlayLv + level number sprites
    this.levelNumImages = [];     // Phaser.Image[] for each digit
    this.statusSprite = null;     // Sprite from statusesAtlas
    this.hpLabel     = null;
    this.hpFill      = null;
    this.expBar      = null;
    this.expBarLabel = null;
    this.typeIcons   = [];

    // Icon sprites
    this.shinyIcon   = null;
    this.teraIcon    = null;
    this.splicedIcon = null;

    // HP animation state
    this.lastHpPercent = -1;
    this.lastHpFrame   = 'high';

    // Last known model values (for change-detection / skip redundant updates)
    this.lastName      = null;
    this.lastStatus    = null;
    this.lastTypes     = null;
    this.lastLevelStr  = null;

    // Positions match PokeRogue originals
    const nameTextX = this.isPlayer ? -115 : -124;
    const nameTextY = this.isPlayer ? -15.2 : -11.2;
    this.pos = {
      nameTextX,
      nameTextY,
      levelX:   this.isPlayer ? -41  : -50,
      levelY:   this.isPlayer ? -10  : -5,
      hpX:      this.isPlayer ? -61  : -71,
      hpY:      this.isPlayer ? -1   : 4.5,
      // Status positioned below name (PokeRogue: setPositionRelative(nameText, 0, 11.5))
      statusX:  nameTextX,
      statusY:  nameTextY + 11.5,
    };
  }

  getTextureName() {
    return this.isPlayer ? this.env.UI_ASSETS.pbinfoPlayer.key : this.env.UI_ASSETS.pbinfoEnemy.key;
  }

  getTypeTextureKeys() {
    return this.isPlayer
      ? [
          this.env.UI_ASSETS.pbinfoPlayerType1.key,
          this.env.UI_ASSETS.pbinfoPlayerType2.key,
          this.env.UI_ASSETS.pbinfoPlayerType3.key,
        ]
      : [
          this.env.UI_ASSETS.pbinfoEnemyType1.key,
          this.env.UI_ASSETS.pbinfoEnemyType2.key,
          this.env.UI_ASSETS.pbinfoEnemyType3.key,
        ];
  }

  getTypeIconOffsets() {
    return this.isPlayer
      ? [
          { x: -139, y: -17 },
          { x: -139, y: -1 },
          { x: -154, y: -17 },
        ]
      : [
          { x: -15, y: -15.5 },
          { x: -15, y: -2.5 },
          { x: 0,   y: -15.5 },
        ];
  }

  setup() {
    const { scene, env } = this;
    const { pos } = this;
    this.container = scene.add.container(0, 0).setName(`pkb-transplant-battle-info-${this.side}`);

    // Background box — origin(1, 0.5) matches PokeRogue
    this.bg = scene.add.image(0, 0, this.getTextureName())
      .setOrigin(1, 0.5).setName(`pbinfo-${this.side}-bg`);

    // Name text
    this.nameText = addTextObject(this.ui, pos.nameTextX, pos.nameTextY, '', 'BATTLE_INFO')
      .setOrigin(0, 0).setName(`pbinfo-${this.side}-name`);

    // Gender text (♂/♀) — positioned right after name text
    this.genderText = addTextObject(this.ui, pos.nameTextX, pos.nameTextY, '', 'BATTLE_INFO')
      .setOrigin(0, 0).setName(`pbinfo-${this.side}-gender`);

    // Level container: overlayLv sprite + number sprites
    this.levelContainer = scene.add.container(pos.levelX, pos.levelY)
      .setName(`pbinfo-${this.side}-level-container`);
    if (env.textureExists(scene, env.UI_ASSETS.overlayLv.key)) {
      const lvImg = scene.add.image(-1, 0, env.UI_ASSETS.overlayLv.key)
        .setOrigin(1, 0.5).setName(`pbinfo-${this.side}-lv-icon`);
      this.levelContainer.add(lvImg);
    }

    // Status sprite (from statusesAtlas)
    const statusKey = env.UI_ASSETS.statusesAtlas?.key;
    this.statusSprite = statusKey && env.textureExists(scene, statusKey)
      ? scene.add.sprite(pos.statusX, pos.statusY, statusKey, 'burn')
          .setOrigin(0, 0).setVisible(false).setName(`pbinfo-${this.side}-status`)
      : null;

    // HP label sprite ("HP" image)
    this.hpLabel = env.textureExists(scene, env.UI_ASSETS.overlayHpLabel.key)
      ? scene.add.image(pos.hpX - 1, pos.hpY - 3, env.UI_ASSETS.overlayHpLabel.key)
          .setOrigin(1, 0).setName(`pbinfo-${this.side}-hp-label`)
      : null;

    // HP fill bar — uses scaleX for animation (origin 0,0 so scales from left)
    this.hpFill = scene.add.image(pos.hpX, pos.hpY, env.UI_ASSETS.overlayHpAtlas.key, 'high')
      .setOrigin(0, 0).setName(`pbinfo-${this.side}-hp-fill`);

    // Shiny icon (small star, top-right of name)
    const shinyKey = env.UI_ASSETS.shinyIconsAtlas?.key;
    this.shinyIcon = shinyKey && env.textureExists(scene, shinyKey)
      ? scene.add.image(0, 0, shinyKey, '0')
          .setOrigin(0, 0).setVisible(false).setScale(0.5).setName(`pbinfo-${this.side}-shiny`)
      : null;

    // Tera icon
    const teraKey = env.UI_ASSETS.iconTera?.key;
    this.teraIcon = teraKey && env.textureExists(scene, teraKey)
      ? scene.add.image(0, 0, teraKey)
          .setOrigin(0, 0).setVisible(false).setScale(0.5).setName(`pbinfo-${this.side}-tera`)
      : null;

    // Spliced icon
    const splicedKey = env.UI_ASSETS.iconSpliced?.key;
    this.splicedIcon = splicedKey && env.textureExists(scene, splicedKey)
      ? scene.add.image(0, 0, splicedKey)
          .setOrigin(0, 0).setVisible(false).setScale(0.5).setName(`pbinfo-${this.side}-spliced`)
      : null;

    // EXP bar — player only; starts hidden and becomes visible when exp > 0
    if (this.isPlayer) {
      this.expBar = scene.add.image(-98, 18, env.UI_ASSETS.overlayExp.key)
        .setOrigin(0, 0).setVisible(false).setName('pbinfo-player-exp-bg');
      this.expBarLabel = env.textureExists(scene, env.UI_ASSETS.overlayExpLabel.key)
        ? scene.add.image(-91, 20, env.UI_ASSETS.overlayExpLabel.key)
            .setOrigin(1, 1).setVisible(false).setName('pbinfo-player-exp-label')
        : null;
    }

    // Type icons
    this.typeIcons = this.getTypeIconOffsets().map((offset, index) => {
      return scene.add.image(offset.x, offset.y, this.getTypeTextureKeys()[index], 'unknown')
        .setOrigin(0, 0).setVisible(false).setName(`pbinfo-${this.side}-type-${index + 1}`);
    });

    this.container.add([
      this.bg,
      ...(this.hpLabel ? [this.hpLabel] : []),
      this.hpFill,
      ...(this.expBar ? [this.expBar] : []),
      ...(this.expBarLabel ? [this.expBarLabel] : []),
      this.levelContainer,
      this.nameText,
      this.genderText,
      ...(this.statusSprite ? [this.statusSprite] : []),
      ...(this.teraIcon ? [this.teraIcon] : []),
      ...(this.splicedIcon ? [this.splicedIcon] : []),
      ...(this.shinyIcon ? [this.shinyIcon] : []),
      ...this.typeIcons,
    ]);
  }

  /** Build level number images inside levelContainer. */
  _setLevelNumbers(levelStr, textureKey) {
    const { scene, env } = this;
    const numbersKey = textureKey || env.UI_ASSETS.numbersAtlas?.key;
    // Remove previous digit images
    this.levelNumImages.forEach(img => img.destroy());
    this.levelNumImages = [];
    if (!numbersKey || !env.textureExists(scene, numbersKey)) return;

    // Digit images at x=0,8,16,… (PokeRogue: i * 8, 0, textureKey, digit)
    // Level container has overlayLv at x=-1 origin(1,0.5), so digits start at x=0
    const startX = 0.5; // small nudge matching PokeRogue's levelNumbersContainer x=9.5 relative offset handled at container level
    for (let i = 0; i < levelStr.length; i++) {
      const img = scene.add.image(startX + i * 8, 0, numbersKey, levelStr[i])
        .setOrigin(0, 0.5);
      this.levelNumImages.push(img);
      this.levelContainer.add(img);
    }
    // Shift container left when more than 3 digits (matches PokeRogue setX logic)
    const overflow = Math.max(levelStr.length - 3, 0);
    this.levelContainer.setX(this.pos.levelX - 8 * overflow);
  }

  /** Update HP frame (high/medium/low) based on current scaleX. */
  _updateHpFrame() {
    const pct = this.hpFill.scaleX * 100;
    const frame = pct > 50 ? 'high' : pct > 20 ? 'medium' : 'low';
    if (frame !== this.lastHpFrame) {
      this.hpFill.setFrame(frame);
      this.lastHpFrame = frame;
    }
  }

  /** Reposition the small icons (tera/spliced/shiny) to the right of name+gender. */
  _positionIcons(nameWidth, genderWidth) {
    let iconX = this.pos.nameTextX + nameWidth + genderWidth + 1;
    const iconY = this.pos.nameTextY + 2;

    if (this.teraIcon?.visible) {
      this.teraIcon.setPosition(iconX, iconY);
      iconX += this.teraIcon.displayWidth + 1;
    }
    if (this.splicedIcon?.visible) {
      this.splicedIcon.setPosition(iconX, iconY);
      iconX += this.splicedIcon.displayWidth + 1;
    }
    if (this.shinyIcon?.visible) {
      this.shinyIcon.setPosition(iconX, iconY + 0.5);
    }
  }

  update(info = {}) {
    const { scene, env } = this;
    const { clamp, textureExists, UI_ASSETS, setHorizontalCrop } = env;

    // --- Name ---
    const displayName = info.displayName || '—';
    this.nameText.setText(displayName);

    // --- Gender ---
    const gender = info.gender || '';
    const genderSymbol = GENDER_SYMBOL[gender] || '';
    this.genderText.setText(genderSymbol);
    if (genderSymbol) {
      this.genderText.setColor(GENDER_COLOR[gender] || '#f8fbff');
      const nameWidth = this.nameText.displayWidth;
      this.genderText.setPosition(this.pos.nameTextX + nameWidth, this.pos.nameTextY);
    }

    // --- Status sprite ---
    const statusKey = info.statusEffect || '';
    const frame = STATUS_FRAME[statusKey];
    if (this.statusSprite) {
      if (frame && textureExists(scene, UI_ASSETS.statusesAtlas?.key, frame)) {
        this.statusSprite.setFrame(frame).setVisible(true);
      } else {
        this.statusSprite.setVisible(false);
      }
    }

    // --- Tera icon ---
    const teraType = info.teraType || '';
    if (this.teraIcon) {
      this.teraIcon.setVisible(Boolean(teraType));
    }

    // --- Spliced icon ---
    if (this.splicedIcon) {
      this.splicedIcon.setVisible(Boolean(info.isFusion));
    }

    // --- Shiny icon ---
    if (this.shinyIcon) {
      const shiny = Boolean(info.shiny);
      const variant = String(info.shinyVariant ?? 0);
      if (shiny && textureExists(scene, UI_ASSETS.shinyIconsAtlas?.key, variant)) {
        this.shinyIcon.setFrame(variant).setVisible(true);
      } else {
        this.shinyIcon.setVisible(false);
      }
    }

    // Reposition icons after name/gender width is known
    const nameWidth = this.nameText.displayWidth;
    const genderWidth = genderSymbol ? this.genderText.displayWidth : 0;
    this._positionIcons(nameWidth, genderWidth);

    // --- Level number sprites (only rebuild when level changes) ---
    const levelStr = String(info.levelLabel || '');
    if (levelStr && levelStr !== this.lastLevelStr) {
      this._setLevelNumbers(levelStr, UI_ASSETS.numbersAtlas?.key);
      this.lastLevelStr = levelStr;
    }

    // --- HP bar tween ---
    const newHpPercent = clamp(Number(info.hpPercent ?? 0), 0, 100);
    if (this.lastHpPercent !== newHpPercent) {
      // Kill existing tweens on hpFill to avoid conflicts
      scene.tweens?.killTweensOf?.(this.hpFill);

      const duration = this.lastHpPercent < 0
        ? 0 // first update: instant
        : clamp(Math.abs(this.lastHpPercent - newHpPercent) * 25, 100, 3000);

      scene.tweens?.add?.({
        targets: this.hpFill,
        scaleX: newHpPercent / 100,
        ease: 'Sine.easeOut',
        duration,
        onUpdate: () => this._updateHpFrame(),
        onComplete: () => this._updateHpFrame(),
      });

      if (!scene.tweens) {
        // Fallback: instant
        this.hpFill.setScale(newHpPercent / 100, 1);
        this._updateHpFrame();
      }

      this.lastHpPercent = newHpPercent;
    }

    // EXP bar is managed by PlayerBattleInfo._tweenExpBar() — skip here

    // --- Type icons ---
    const typeKeys = this.getTypeTextureKeys();
    this.typeIcons.forEach((icon, index) => {
      const typeId = String(info.types?.[index] || '').toLowerCase();
      const textureKey = typeKeys[index] || typeKeys[0];
      if (typeId && textureExists(scene, textureKey, typeId)) {
        icon.setTexture(textureKey, typeId).setVisible(true);
      } else {
        icon.setVisible(false);
      }
    });
  }
}

export class BattleTray {
  constructor(ui, side) {
    this.ui = ui;
    this.scene = ui.scene;
    this.env = ui.env;
    this.side = side;
    this.container = null;
    this.overlay = null;
    this.balls = [];
  }

  setup() {
    const { scene, env } = this;
    const isPlayer = this.side === 'player';
    this.container = scene.add.container(0, 0).setName(`pkb-transplant-battle-tray-${this.side}`);
    const overlayKey = isPlayer ? env.UI_ASSETS.trayOverlayPlayer.key : env.UI_ASSETS.trayOverlayEnemy.key;
    this.overlay = env.textureExists(scene, overlayKey)
      ? scene.add.image(0, 0, overlayKey).setOrigin(isPlayer ? 1 : 0, 0)
      : scene.add.rectangle(0, 0, 104, 4, 0x0f172a, 0.64).setOrigin(isPlayer ? 1 : 0, 0);
    const startX = isPlayer ? -83 : 76;
    const step = isPlayer ? 10 : -10;
    this.balls = Array.from({ length: 6 }, (_, index) => {
      const ball = env.textureExists(scene, env.UI_ASSETS.trayAtlas.key, 'ball')
        ? scene.add.image(startX + step * index, -8, env.UI_ASSETS.trayAtlas.key, 'ball').setOrigin(0, 0)
        : scene.add.circle(startX + step * index, -8, 2, 0xe2e8f0, 0.85).setOrigin(0, 0);
      return ball;
    });
    this.container.add([this.overlay, ...this.balls]);
    // PokeRogue: PokeballTray starts hidden; only shown via showPbTray() during party switch
    this.container.setVisible(false);
  }

  update(tray = []) {
    const { UI_ASSETS, textureExists } = this.env;
    this.balls.forEach((ball, index) => {
      const entry = tray[index] || { state: 'empty' };
      const frame = entry.state === 'active' ? 'ball' : entry.state;
      if (textureExists(this.scene, UI_ASSETS.trayAtlas.key, frame) && ball.setTexture) {
        ball.setTexture(UI_ASSETS.trayAtlas.key, frame);
        ball.setVisible(true);
        ball.setAlpha(entry.state === 'active' ? 1 : 0.96);
        if (entry.state === 'active' && ball.setTintFill) ball.setTintFill(0x9bd6ff);
        else if (ball.clearTint) ball.clearTint();
      } else if (ball.setFillStyle) {
        const fill = entry.state === 'active' ? 0x7dd3fc : entry.state === 'faint' ? 0xf87171 : entry.state === 'status' ? 0xfbbf24 : entry.state === 'ball' ? 0xe2e8f0 : 0x475569;
        ball.setFillStyle(fill, entry.state === 'empty' ? 0.22 : 0.86);
      }
    });
  }
}

export class AbilityBar {
  constructor(ui) {
    this.ui = ui;
    this.scene = ui.scene;
    this.env = ui.env;
    this.container = null;
    this.left = null;
    this.right = null;
    this.text = null;
  }

  setup() {
    const { scene, env } = this;
    this.container = scene.add.container(0, 0).setVisible(false).setName('pkb-transplant-ability-bar');
    // Both images use origin(0, 0) matching PokeRogue; container is positioned to correct screen edge
    this.left = scene.add.image(0, 0, env.UI_ASSETS.abilityBarLeft.key).setOrigin(0, 0);
    this.right = scene.add.image(0, 0, env.UI_ASSETS.abilityBarRight.key).setOrigin(0, 0);
    // Text at x=15 (textPadding), y=3 matching PokeRogue's layout
    this.text = addTextObject(this.ui, 15, 3, '', 'BATTLE_INFO_SMALL', {
      wordWrap: { width: 100, useAdvancedWrap: true },
    }).setOrigin(0, 0);
    this.container.add([this.left, this.right, this.text]);
  }

  update(model) {
    if (!model?.visible || !model.text) {
      this.container.setVisible(false);
      return;
    }
    this.text.setText(model.text);
    const isEnemy = model.side === 'enemy';
    // PokeRogue: enemy bar right side (x=202=320-118), player bar left side (x=0)
    // y=64 = fieldUI y=180 + baseY(-116)
    const logicalX = isEnemy ? 202 : 0;
    const logicalY = 64;
    this.left.setVisible(!isEnemy);
    this.right.setVisible(isEnemy);
    this.container.setPosition(logicalX, logicalY);
    this.container.setVisible(true);
  }
}
