import { addTextObject } from '../helpers/text.js';

export class BattleInfo {
  constructor(ui, side, pos = {}) {
    this.ui = ui;
    this.scene = ui.scene;
    this.env = ui.env;
    this.side = side;
    this.isPlayer = side === 'player';
    this.container = null;
    this.bg = null;
    this.nameText = null;
    this.levelText = null;
    this.statusText = null;
    this.hpLabel = null;
    this.hpFill = null;
    this.hpText = null;
    this.expBar = null;
    this.expBarLabel = null;
    this.typeIcons = [];

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
      // Status goes below the name, matching PokeRogue's statusIndicator setPositionRelative(nameText, 0, 11.5)
      statusX:  nameTextX,
      statusY:  nameTextY + 11.5,
      ...pos,
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
    this.bg = scene.add.image(0, 0, this.getTextureName()).setOrigin(1, 0.5).setName(`pbinfo-${this.side}-bg`);

    // Name
    this.nameText = addTextObject(this.ui, pos.nameTextX, pos.nameTextY, '', 'BATTLE_INFO')
      .setOrigin(0, 0).setName(`pbinfo-${this.side}-name`);

    // Level — "Lv" sprite + number text
    this.overlayLv = env.textureExists(scene, env.UI_ASSETS.overlayLv.key)
      ? scene.add.image(pos.levelX - 1, pos.levelY, env.UI_ASSETS.overlayLv.key)
          .setOrigin(1, 0.5).setName(`pbinfo-${this.side}-lv-icon`)
      : null;
    this.levelText = addTextObject(this.ui, pos.levelX, pos.levelY, '', 'BATTLE_INFO_SMALL')
      .setOrigin(0, 0.5).setName(`pbinfo-${this.side}-level`);

    // Status (text fallback — PokeRogue uses a sprite)
    this.statusText = addTextObject(this.ui, pos.statusX, pos.statusY, '', 'BATTLE_INFO_SMALL')
      .setOrigin(0, 0.5).setName(`pbinfo-${this.side}-status`);

    // HP label sprite ("HP" image, positioned just left of the HP bar)
    this.hpLabel = env.textureExists(scene, env.UI_ASSETS.overlayHpLabel.key)
      ? scene.add.image(pos.hpX - 1, pos.hpY - 3, env.UI_ASSETS.overlayHpLabel.key)
          .setOrigin(1, 0).setName(`pbinfo-${this.side}-hp-label`)
      : null;

    // HP fill bar (overlay_hp atlas — 48 × 2 per frame)
    this.hpFill = scene.add.image(pos.hpX, pos.hpY, env.UI_ASSETS.overlayHpAtlas.key, 'high')
      .setOrigin(0, 0).setName(`pbinfo-${this.side}-hp-fill`);

    // HP number text — player only (enemy mini shows no HP numbers in PokeRogue)
    if (this.isPlayer) {
      // Right-aligned at x=-15, y=10, matching PokeRogue's hpNumbersContainer position
      this.hpText = addTextObject(this.ui, -15, 10, '', 'BATTLE_VALUE')
        .setOrigin(1, 0.5).setName('pbinfo-player-hp-text');
    }

    // EXP bar — player only
    if (this.isPlayer) {
      // overlay_exp.png is 85 × 2, origin(0) matches PokeRogue
      this.expBar = scene.add.image(-98, 18, env.UI_ASSETS.overlayExp.key)
        .setOrigin(0, 0).setName('pbinfo-player-exp-bg');
      // "EXP" label sprite
      this.expBarLabel = env.textureExists(scene, env.UI_ASSETS.overlayExpLabel.key)
        ? scene.add.image(-91, 20, env.UI_ASSETS.overlayExpLabel.key)
            .setOrigin(1, 1).setName('pbinfo-player-exp-label')
        : null;
    }

    // Type icons
    this.typeIcons = this.getTypeIconOffsets().map((offset, index) => {
      const icon = scene.add.image(offset.x, offset.y, this.getTypeTextureKeys()[index], 'unknown')
        .setOrigin(0, 0).setVisible(false).setName(`pbinfo-${this.side}-type-${index + 1}`);
      return icon;
    });

    this.container.add([
      this.bg,
      ...(this.hpLabel ? [this.hpLabel] : []),
      this.hpFill,
      ...(this.expBar ? [this.expBar] : []),
      ...(this.expBarLabel ? [this.expBarLabel] : []),
      ...(this.overlayLv ? [this.overlayLv] : []),
      this.nameText,
      this.levelText,
      this.statusText,
      ...(this.hpText ? [this.hpText] : []),
      ...this.typeIcons,
    ]);
  }

  update(info = {}) {
    const { clamp, textureExists, UI_ASSETS, setHorizontalCrop } = this.env;
    const hpPercent = clamp(Number(info.hpPercent || 0), 0, 100);
    const hpFrame   = hpPercent > 50 ? 'high' : hpPercent > 20 ? 'medium' : 'low';

    this.nameText.setText(info.displayName || '—');
    this.levelText.setText(info.levelLabel || '');
    this.statusText.setText(info.statusLabel || '');
    this.statusText.setVisible(Boolean(info.statusLabel));

    if (this.hpFill.setTexture && textureExists(this.scene, UI_ASSETS.overlayHpAtlas.key, hpFrame)) {
      this.hpFill.setTexture(UI_ASSETS.overlayHpAtlas.key, hpFrame);
    }
    // overlay_hp frame width is 48px
    setHorizontalCrop(this.hpFill, 48 * (hpPercent / 100));

    if (this.hpText) {
      this.hpText.setText(info.hpLabel || '');
    }

    if (this.expBar) {
      const expPercent = clamp(Number(info.expPercent || 0), 0, 100);
      // overlay_exp is 85px wide
      setHorizontalCrop(this.expBar, 85 * (expPercent / 100));
    }

    const typeKeys = this.getTypeTextureKeys();
    this.typeIcons.forEach((icon, index) => {
      const typeId = String(info.types?.[index] || '').toLowerCase();
      const textureKey = typeKeys[index] || typeKeys[0];
      if (typeId && textureExists(this.scene, textureKey, typeId)) {
        icon.setTexture(textureKey, typeId);
        icon.setVisible(true);
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
    this.left = scene.add.image(0, 0, env.UI_ASSETS.abilityBarLeft.key).setOrigin(0, 0.5);
    this.right = scene.add.image(0, 0, env.UI_ASSETS.abilityBarRight.key).setOrigin(1, 0.5);
    this.text = addTextObject(this.ui, 0, 0, '', 'BATTLE_INFO_SMALL', {
      wordWrap: { width: 104, useAdvancedWrap: true },
    }).setOrigin(0.5, 0.5);
    this.container.add([this.left, this.right, this.text]);
  }

  update(model) {
    const { clamp } = this.env;
    if (!model?.visible || !model.text) {
      this.container.setVisible(false);
      return;
    }
    this.text.setText(model.text);
    this.text.setWordWrapWidth(100, true);
    const width = clamp(this.text.width + 14, 72, 118);
    const side = model.side === 'enemy' ? 'enemy' : 'player';
    const showLeft = side === 'enemy';
    const logicalX = showLeft ? 202 : 118;
    const logicalY = showLeft ? 62 : 136;
    this.left.setVisible(showLeft);
    this.right.setVisible(!showLeft);
    if (showLeft) {
      this.left.setPosition(0, 0);
      this.left.setCrop(0, 0, width, this.left.height);
      this.text.setPosition(width / 2, 0);
    } else {
      this.right.setPosition(0, 0);
      this.right.setCrop(this.right.width - width, 0, width, this.right.height);
      this.text.setPosition(-width / 2, 0);
    }
    this.container.setPosition(logicalX, logicalY);
    this.container.setVisible(true);
  }
}
