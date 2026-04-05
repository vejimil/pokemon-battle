import { UiHandler } from './shared/ui-handler.js';

class BattleInfo extends UiHandler {
  constructor(root, side) {
    super(root, `battle-info-${side}`);
    this.side = side;
    this.isPlayer = side === 'player';
    this.bg = null;
    this.name = null;
    this.level = null;
    this.status = null;
    this.hpTrack = null;
    this.hpFill = null;
    this.hpText = null;
    this.expBar = null;
    this.expFill = null;
    this.typeIcons = [];
  }

  setup() {
    const { scene, env } = this;
    const { UI_ASSETS } = env;
    this.container = scene.add.container(0, 0).setName(`pkb-battle-info-${this.side}`);
    const textureKey = this.isPlayer ? UI_ASSETS.pbinfoPlayer.key : UI_ASSETS.pbinfoEnemy.key;
    this.bg = scene.add.image(0, 0, textureKey).setOrigin(1, 0.5);
    this.name = env.createBaseText(scene, this.isPlayer ? -115 : -124, this.isPlayer ? -15 : -11, '', 8, '#f8fbff').setOrigin(0, 0);
    this.level = scene.add.text(this.isPlayer ? -41 : -50, this.isPlayer ? -10 : -5, '', {
      fontFamily: 'emerald, pkmnems, monospace',
      fontSize: '6px',
      color: '#dbeafe',
      resolution: 3,
    }).setOrigin(0, 0.5);
    this.status = scene.add.text(-12, this.isPlayer ? 9 : 10, '', {
      fontFamily: 'emerald, pkmnems, monospace',
      fontSize: '6px',
      color: '#fbbf24',
      resolution: 3,
    }).setOrigin(1, 0.5);
    this.hpTrack = scene.add.rectangle(this.isPlayer ? -61 : -71, this.isPlayer ? -1 : 4.5, 48, 2, 0x111827, 1).setOrigin(0, 0);
    this.hpFill = scene.add.image(this.hpTrack.x, this.hpTrack.y, UI_ASSETS.overlayHpAtlas.key, 'high').setOrigin(0, 0);
    this.hpText = scene.add.text(this.isPlayer ? -60 : -70, this.isPlayer ? 8 : 12, '', {
      fontFamily: 'emerald, pkmnems, monospace',
      fontSize: '6px',
      color: '#eff6ff',
      resolution: 3,
    }).setOrigin(0, 0.5);
    if (this.isPlayer) {
      this.expBar = scene.add.image(-98, 18, UI_ASSETS.overlayExp.key).setOrigin(0, 0.5);
      this.expFill = scene.add.rectangle(-98, 18, 0, 2, 0x60a5fa, 1).setOrigin(0, 0.5);
    }
    const typeConfigs = this.isPlayer
      ? [
          { key: UI_ASSETS.pbinfoPlayerType1.key, x: -139, y: -17 },
          { key: UI_ASSETS.pbinfoPlayerType2.key, x: -139, y: -1 },
          { key: UI_ASSETS.pbinfoPlayerType3.key, x: -154, y: -17 },
        ]
      : [
          { key: UI_ASSETS.pbinfoEnemyType1.key, x: -15, y: -15.5 },
          { key: UI_ASSETS.pbinfoEnemyType2.key, x: -15, y: -2.5 },
          { key: UI_ASSETS.pbinfoEnemyType3.key, x: 0, y: -15.5 },
        ];
    this.typeIcons = typeConfigs.map(config => {
      const icon = scene.add.image(config.x, config.y, config.key, 'unknown').setOrigin(0, 0);
      icon.setVisible(false);
      return icon;
    });
    this.container.add([this.bg, this.hpTrack, this.hpFill, ...(this.expBar ? [this.expBar, this.expFill] : []), this.name, this.level, this.status, this.hpText, ...this.typeIcons]);
  }

  update(info = {}) {
    const { clamp, textureExists, UI_ASSETS, setHorizontalCrop } = this.env;
    const hpPercent = clamp(Number(info.hpPercent || 0), 0, 100);
    const hpFrame = hpPercent > 50 ? 'high' : hpPercent > 20 ? 'medium' : 'low';
    this.name.setText(info.displayName || '—');
    this.level.setText(info.levelLabel || '');
    this.status.setText(info.statusLabel || '');
    this.hpText.setText(info.hpLabel || '');
    if (this.hpFill.setTexture && textureExists(this.scene, UI_ASSETS.overlayHpAtlas.key, hpFrame)) {
      this.hpFill.setTexture(UI_ASSETS.overlayHpAtlas.key, hpFrame);
    }
    setHorizontalCrop(this.hpFill, 48 * (hpPercent / 100));
    if (this.expFill) {
      this.expFill.width = Math.max(0, 85 * (clamp(Number(info.expPercent || 0), 0, 100) / 100));
    }
    const typeTextureKeys = this.isPlayer
      ? [UI_ASSETS.pbinfoPlayerType1.key, UI_ASSETS.pbinfoPlayerType2.key, UI_ASSETS.pbinfoPlayerType3.key]
      : [UI_ASSETS.pbinfoEnemyType1.key, UI_ASSETS.pbinfoEnemyType2.key, UI_ASSETS.pbinfoEnemyType3.key];
    this.typeIcons.forEach((icon, index) => {
      const typeId = String(info.types?.[index] || '').toLowerCase();
      const textureKey = typeTextureKeys[index] || typeTextureKeys[0];
      if (textureExists(this.scene, textureKey, typeId)) {
        icon.setTexture(textureKey, typeId);
        icon.setVisible(true);
      } else {
        icon.setVisible(false);
      }
    });
  }
}

class EnemyBattleInfo extends BattleInfo {
  constructor(root) {
    super(root, 'enemy');
  }
}

class PlayerBattleInfo extends BattleInfo {
  constructor(root) {
    super(root, 'player');
  }
}

class BattleTray {
  constructor(root, side) {
    this.root = root;
    this.scene = root.scene;
    this.env = root.env;
    this.side = side;
    this.container = null;
    this.overlay = null;
    this.balls = [];
  }

  setup() {
    const { scene, env } = this;
    const { UI_ASSETS, textureExists } = env;
    this.container = scene.add.container(0, 0).setName(`pkb-battle-tray-${this.side}`);
    const isPlayer = this.side === 'player';
    const overlayKey = isPlayer ? UI_ASSETS.trayOverlayPlayer.key : UI_ASSETS.trayOverlayEnemy.key;
    this.overlay = textureExists(scene, overlayKey)
      ? scene.add.image(0, 0, overlayKey).setOrigin(isPlayer ? 1 : 0, 0)
      : scene.add.rectangle(0, 0, 104, 4, 0x0f172a, 0.64).setOrigin(isPlayer ? 1 : 0, 0);
    const startX = isPlayer ? -83 : 76;
    const step = isPlayer ? 10 : -10;
    this.balls = Array.from({ length: 6 }, (_, index) => {
      const ball = textureExists(scene, UI_ASSETS.trayAtlas.key, 'ball')
        ? scene.add.image(startX + step * index, -8, UI_ASSETS.trayAtlas.key, 'ball').setOrigin(0, 0)
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

class AbilityBar {
  constructor(root) {
    this.root = root;
    this.scene = root.scene;
    this.env = root.env;
    this.container = null;
    this.left = null;
    this.right = null;
    this.text = null;
  }

  setup() {
    const { scene, env } = this;
    const { UI_ASSETS } = env;
    this.container = scene.add.container(0, 0).setVisible(false).setName('pkb-battle-ability-bar');
    this.left = scene.add.image(0, 0, UI_ASSETS.abilityBarLeft.key).setOrigin(0, 0.5);
    this.right = scene.add.image(0, 0, UI_ASSETS.abilityBarRight.key).setOrigin(1, 0.5);
    this.text = scene.add.text(0, 0, '', {
      fontFamily: 'emerald, pkmnems, monospace',
      fontSize: '7px',
      color: '#f8fbff',
      resolution: 3,
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
    const leftVisible = side === 'enemy';
    const logicalX = side === 'enemy' ? 202 : 118;
    const logicalY = side === 'enemy' ? 62 : 136;
    this.left.setVisible(leftVisible);
    this.right.setVisible(!leftVisible);
    if (leftVisible) {
      this.left.setPosition(0, 0);
      this.left.setCrop(0, 0, width, this.left.height);
      this.text.setPosition(width / 2, 0);
      this.container.setPosition(logicalX, logicalY);
    } else {
      this.right.setPosition(0, 0);
      this.right.setCrop(this.right.width - width, 0, width, this.right.height);
      this.text.setPosition(-width / 2, 0);
      this.container.setPosition(logicalX, logicalY);
    }
    this.container.setVisible(true);
  }
}

export { BattleInfo, EnemyBattleInfo, PlayerBattleInfo, BattleTray, AbilityBar };
