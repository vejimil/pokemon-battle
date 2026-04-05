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
    this.hpTrack = null;
    this.hpFill = null;
    this.hpText = null;
    this.expBar = null;
    this.expFill = null;
    this.typeIcons = [];
    this.pos = {
      nameTextX: this.isPlayer ? -115 : -124,
      nameTextY: this.isPlayer ? -15.2 : -11.0,
      levelX: this.isPlayer ? -41 : -50,
      levelY: this.isPlayer ? -10 : -5,
      hpX: this.isPlayer ? -61 : -71,
      hpY: this.isPlayer ? -1 : 4.5,
      statusX: this.isPlayer ? -12 : -22,
      statusY: this.isPlayer ? 9 : 10,
      hpTextX: this.isPlayer ? -60 : -70,
      hpTextY: this.isPlayer ? 8 : 12,
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
          { x: 0, y: -15.5 },
        ];
  }

  setup() {
    const { scene, env } = this;
    this.container = scene.add.container(0, 0).setName(`pkb-transplant-battle-info-${this.side}`);
    this.bg = scene.add.image(0, 0, this.getTextureName()).setOrigin(1, 0.5).setName(`pbinfo-${this.side}-bg`);
    this.nameText = addTextObject(this.ui, this.pos.nameTextX, this.pos.nameTextY, '', 'BATTLE_INFO').setOrigin(0, 0).setName(`pbinfo-${this.side}-name`);
    this.levelText = addTextObject(this.ui, this.pos.levelX, this.pos.levelY, '', 'BATTLE_INFO_SMALL').setOrigin(0, 0.5).setName(`pbinfo-${this.side}-level`);
    this.statusText = addTextObject(this.ui, this.pos.statusX, this.pos.statusY, '', 'BATTLE_INFO_SMALL').setOrigin(1, 0.5).setName(`pbinfo-${this.side}-status`);
    this.hpTrack = scene.add.rectangle(this.pos.hpX, this.pos.hpY, 48, 2, 0x111827, 1).setOrigin(0, 0).setName(`pbinfo-${this.side}-hp-track`);
    this.hpFill = scene.add.image(this.pos.hpX, this.pos.hpY, env.UI_ASSETS.overlayHpAtlas.key, 'high').setOrigin(0, 0).setName(`pbinfo-${this.side}-hp-fill`);
    this.hpText = addTextObject(this.ui, this.pos.hpTextX, this.pos.hpTextY, '', 'BATTLE_VALUE').setOrigin(0, 0.5).setName(`pbinfo-${this.side}-hp-text`);

    if (this.isPlayer) {
      this.expBar = scene.add.image(-98, 18, env.UI_ASSETS.overlayExp.key).setOrigin(0, 0.5).setName('pbinfo-player-exp-bg');
      this.expFill = scene.add.rectangle(-98, 18, 0, 2, 0x60a5fa, 1).setOrigin(0, 0.5).setName('pbinfo-player-exp-fill');
    }

    this.typeIcons = this.getTypeIconOffsets().map((offset, index) => {
      const icon = scene.add.image(offset.x, offset.y, this.getTypeTextureKeys()[index], 'unknown').setOrigin(0, 0).setVisible(false).setName(`pbinfo-${this.side}-type-${index + 1}`);
      return icon;
    });

    this.container.add([
      this.bg,
      this.hpTrack,
      this.hpFill,
      ...(this.expBar ? [this.expBar, this.expFill] : []),
      this.nameText,
      this.levelText,
      this.statusText,
      this.hpText,
      ...this.typeIcons,
    ]);
  }

  update(info = {}) {
    const { clamp, textureExists, UI_ASSETS, setHorizontalCrop } = this.env;
    const hpPercent = clamp(Number(info.hpPercent || 0), 0, 100);
    const hpFrame = hpPercent > 50 ? 'high' : hpPercent > 20 ? 'medium' : 'low';
    this.nameText.setText(info.displayName || '—');
    this.levelText.setText(info.levelLabel || '');
    this.statusText.setText(info.statusLabel || '');
    this.hpText.setText(info.hpLabel || '');
    if (this.hpFill.setTexture && textureExists(this.scene, UI_ASSETS.overlayHpAtlas.key, hpFrame)) {
      this.hpFill.setTexture(UI_ASSETS.overlayHpAtlas.key, hpFrame);
    }
    setHorizontalCrop(this.hpFill, 48 * (hpPercent / 100));
    if (this.expFill) {
      this.expFill.width = Math.max(0, 85 * (clamp(Number(info.expPercent || 0), 0, 100) / 100));
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
