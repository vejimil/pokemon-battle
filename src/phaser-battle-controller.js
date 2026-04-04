const PHASER_IMPORT_PATH = '../node_modules/phaser/dist/phaser.esm.js';

let phaserModulePromise = null;

function loadPhaserModule() {
  if (!phaserModulePromise) {
    phaserModulePromise = import(PHASER_IMPORT_PATH).then(module => module.default || module).catch(error => {
      throw new Error(`Phaser could not be loaded from ${PHASER_IMPORT_PATH}. Run npm install before starting the bundled local server. Original error: ${error.message}`);
    });
  }
  return phaserModulePromise;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < 920;
}

function ensureSpriteHostStyles(host) {
  Object.assign(host.style, {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    pointerEvents: 'none',
    userSelect: 'none',
    overflow: 'visible',
  });
}

function clearAnimatedSprite(host) {
  if (!host) return;
  if (host.__pkbSpriteTimer) clearInterval(host.__pkbSpriteTimer);
  host.__pkbSpriteTimer = null;
  host.innerHTML = '';
}

async function inspectSpriteUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const frame = img.height || 1;
      const count = Math.max(1, Math.floor((img.width || frame) / frame));
      resolve({img, frame, count, width: img.width, height: img.height});
    };
    img.onerror = () => reject(new Error(`Failed to load sprite ${url}`));
    img.src = url;
  });
}

async function renderAnimatedSpriteToHost(host, spriteModel = {}, size = 'large') {
  if (!host) return;
  const token = (Number(host.dataset.renderToken || '0') + 1).toString();
  host.dataset.renderToken = token;
  clearAnimatedSprite(host);
  ensureSpriteHostStyles(host);
  const url = spriteModel?.url || '';
  if (!url) {
    host.textContent = '—';
    host.style.color = '#d8e7ff';
    host.style.font = '600 20px system-ui';
    return;
  }
  try {
    const info = await inspectSpriteUrl(url);
    if (host.dataset.renderToken !== token) return;
    const canvas = document.createElement('canvas');
    const baseTarget = size === 'large' ? 240 : 54;
    const scale = Math.max(1, Math.min(size === 'large' ? 2.8 : 1.8, baseTarget / info.frame));
    const width = Math.max(32, Math.floor(info.frame * scale));
    const height = Math.max(32, Math.floor(info.height * scale));
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.imageRendering = 'pixelated';
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    let frameIndex = 0;
    const draw = () => {
      if (host.dataset.renderToken !== token) return;
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(info.img, frameIndex * info.frame, 0, info.frame, info.height, 0, 0, width, height);
      frameIndex = (frameIndex + 1) % info.count;
    };
    draw();
    if (info.count > 1) {
      host.__pkbSpriteTimer = setInterval(() => {
        if (!host.isConnected || host.dataset.renderToken !== token) {
          clearAnimatedSprite(host);
          return;
        }
        draw();
      }, 120);
    }
    host.appendChild(canvas);
  } catch (_error) {
    host.textContent = 'Sprite missing';
    host.style.color = '#fda4af';
    host.style.font = '600 16px system-ui';
  }
}

class PhaserBattleScene {
  constructor(controller, Phaser) {
    this.controller = controller;
    this.Phaser = Phaser;
    this.sceneKey = 'pkb-phaser-battle-scene';
  }

  preload() {}

  create() {
    const { Phaser } = this;
    this.currentModel = null;
    this.lastAbilityFlyoutKey = '';
    this.scale.on('resize', this.layout, this);

    this.background = this.add.graphics();
    this.overlay = this.add.graphics();

    this.topBanner = this.add.text(0, 0, '', {
      fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
      fontSize: '26px',
      color: '#edf6ff',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this.turnChip = this.add.text(0, 0, '', {
      fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
      fontSize: '20px',
      color: '#c7dcff',
      backgroundColor: 'rgba(11, 22, 45, 0.85)',
      padding: { left: 10, right: 10, top: 6, bottom: 6 },
    }).setOrigin(0.5, 0.5);

    this.fieldStatusText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#bfdbfe',
      align: 'center',
      wordWrap: { width: 980, useAdvancedWrap: true },
    }).setOrigin(0.5, 0.5);

    this.enemySprite = this.createSpriteMount('enemy');
    this.playerSprite = this.createSpriteMount('player');

    this.enemyInfo = this.createInfoBox('enemy');
    this.playerInfo = this.createInfoBox('player');
    this.enemyTray = this.createPokeballTray();
    this.playerTray = this.createPokeballTray();

    this.abilityBar = this.createAbilityBar();
    this.messageWindow = this.createWindow('message');
    this.messagePrimary = this.add.text(18, 18, '', {
      fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
      fontSize: '22px',
      color: '#f8fbff',
      wordWrap: { width: 64, useAdvancedWrap: true },
      lineSpacing: 4,
    }).setOrigin(0, 0);
    this.messageSecondary = this.add.text(18, 18, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      color: '#cbd5e1',
      wordWrap: { width: 64, useAdvancedWrap: true },
    }).setOrigin(0, 0);
    this.messageWindow.content.add([this.messagePrimary, this.messageSecondary]);

    this.stateWindow = this.createWindow('state');
    this.stateTitle = this.add.text(0, 0, '', {
      fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
      fontSize: '18px',
      color: '#c8d7ff',
    }).setOrigin(0, 0);
    this.stateWindow.container.add(this.stateTitle);

    this.stateButtons = [];
    this.layout();
    this.controller?.notifySceneReady?.(this);
  }

  createSpriteMount(name) {
    const host = document.createElement('div');
    host.className = `pkb-phaser-sprite pkb-phaser-sprite-${name}`;
    ensureSpriteHostStyles(host);
    const dom = this.add.dom(0, 0, host);
    dom.setOrigin(0.5, 0.5);
    return { host, dom };
  }

  createInfoBox(side) {
    const panel = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 320, 116, 0x10213d, 0.92).setOrigin(0, 0).setStrokeStyle(2, 0xd3e3ff, 0.18);
    const name = this.add.text(14, 12, '', {
      fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
      fontSize: '22px',
      color: '#f8fbff',
    }).setOrigin(0, 0);
    const level = this.add.text(0, 12, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#bfdbfe',
    }).setOrigin(1, 0);
    const types = this.add.text(14, 42, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#cbd5e1',
    }).setOrigin(0, 0);
    const status = this.add.text(side === 'enemy' ? 304 : 304, 42, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#fbbf24',
    }).setOrigin(1, 0);
    const hpTrack = this.add.rectangle(14, 71, 292, 14, 0x0b1223, 1).setOrigin(0, 0).setStrokeStyle(1, 0xffffff, 0.08);
    const hpFill = this.add.rectangle(16, 73, 288, 10, 0x7ce38b, 1).setOrigin(0, 0);
    const hpText = this.add.text(14, 91, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#e6eefc',
    }).setOrigin(0, 0);
    const extra = this.add.text(304, 91, '', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#c7d2fe',
      align: 'right',
      wordWrap: { width: 180, useAdvancedWrap: true },
    }).setOrigin(1, 0);
    level.setX(304);
    panel.add([bg, name, level, types, status, hpTrack, hpFill, hpText, extra]);
    return { panel, bg, name, level, types, status, hpTrack, hpFill, hpText, extra };
  }

  createPokeballTray() {
    const container = this.add.container(0, 0);
    const balls = Array.from({ length: 6 }, () => {
      const circle = this.add.circle(0, 0, 8, 0xe2e8f0, 0.55).setStrokeStyle(2, 0x0f172a, 0.9);
      container.add(circle);
      return circle;
    });
    return { container, balls };
  }

  createAbilityBar() {
    const container = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 360, 42, 0x0d1b34, 0.96).setOrigin(0, 0).setStrokeStyle(2, 0xf8fafc, 0.12);
    const text = this.add.text(18, 11, '', {
      fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
      fontSize: '18px',
      color: '#f8fbff',
      wordWrap: { width: 324, useAdvancedWrap: true },
    }).setOrigin(0, 0);
    container.add([bg, text]);
    container.setVisible(false);
    return { container, bg, text };
  }

  createWindow(kind) {
    const container = this.add.container(0, 0);
    const bg = this.add.rectangle(0, 0, 100, 100, 0x0e1a33, 0.95).setOrigin(0, 0).setStrokeStyle(3, 0xdbeafe, 0.14);
    const content = this.add.container(0, 0);
    container.add([bg, content]);
    container.name = kind;
    return { container, bg, content };
  }

  layout() {
    const width = this.scale.width;
    const height = this.scale.height;
    const margin = isMobileViewport() ? 18 : 24;
    const topHeight = clamp(height * 0.57, 340, 520);
    const bottomHeight = height - topHeight - margin * 3;
    const stageWidth = width - margin * 2;
    const stateWidth = clamp(stageWidth * 0.38, 320, 480);
    const messageWidth = stageWidth - stateWidth - 14;
    const bottomTop = topHeight + margin * 2;

    this.background.clear();
    this.background.fillGradientStyle(0x07101f, 0x07101f, 0x14213d, 0x0b1324, 1);
    this.background.fillRect(0, 0, width, height);
    this.background.fillStyle(0x1f3b5b, 0.28);
    this.background.fillEllipse(width * 0.5, topHeight * 0.78, stageWidth * 0.68, topHeight * 0.28);
    this.background.fillStyle(0x0f1e35, 0.52);
    this.background.fillEllipse(width * 0.72, topHeight * 0.37, stageWidth * 0.22, topHeight * 0.08);
    this.background.fillEllipse(width * 0.28, topHeight * 0.62, stageWidth * 0.18, topHeight * 0.07);

    this.overlay.clear();
    this.overlay.lineStyle(2, 0xffffff, 0.06);
    this.overlay.strokeRoundedRect(margin, margin + 56, stageWidth, topHeight - 24, 18);

    this.topBanner.setPosition(width / 2, margin + 12);
    this.turnChip.setPosition(margin + 58, margin + 12);
    this.fieldStatusText.setPosition(width / 2, margin + 42);
    this.fieldStatusText.setWordWrapWidth(stageWidth - 80, true);

    this.enemyTray.container.setPosition(width - margin - 152, margin + 82);
    this.playerTray.container.setPosition(margin + 18, topHeight - 6);

    this.enemyInfo.panel.setPosition(width - margin - 320, margin + 108);
    this.playerInfo.panel.setPosition(margin, topHeight - 116 + 10);

    this.enemySprite.dom.setPosition(width * 0.72, topHeight * 0.35);
    this.playerSprite.dom.setPosition(width * 0.27, topHeight * 0.76);

    Object.assign(this.enemySprite.host.style, { width: '260px', height: '260px' });
    Object.assign(this.playerSprite.host.style, { width: '280px', height: '280px' });

    this.messageWindow.bg.setSize(messageWidth, bottomHeight);
    this.messageWindow.container.setPosition(margin, bottomTop);
    if (this.messageWindow.content) this.messageWindow.content.setPosition(0, 0);
    if (this.messagePrimary) this.messagePrimary.setWordWrapWidth(Math.max(64, messageWidth - 36), true);
    if (this.messageSecondary) this.messageSecondary.setWordWrapWidth(Math.max(64, messageWidth - 36), true);

    this.stateWindow.bg.setSize(stateWidth, bottomHeight);
    this.stateWindow.container.setPosition(margin + messageWidth + 14, bottomTop);
    if (this.stateWindow.content) this.stateWindow.content.setPosition(0, 0);

    this.stateTitle.setPosition(18, 14);

    if (this.currentModel) this.renderModel(this.currentModel);
  }

  updateInfoBox(target, info = {}, { showExp = false } = {}) {
    const hpPercent = clamp(Number(info.hpPercent || 0), 0, 100);
    const hpColor = hpPercent > 50 ? 0x86efac : hpPercent > 20 ? 0xfbbf24 : 0xf87171;
    target.name.setText(info.displayName || '—');
    target.level.setText(info.levelLabel || '');
    target.types.setText((info.types || []).join(' · ') || '');
    target.status.setText(info.statusLabel || '');
    target.hpFill.width = Math.max(0, 2.88 * hpPercent);
    target.hpFill.fillColor = hpColor;
    target.hpText.setText(info.hpLabel || '');
    const extras = [];
    if (info.fainted) extras.push('Fainted');
    if (showExp && Number.isFinite(info.expPercent)) extras.push(`EXP ${Math.round(info.expPercent)}%`);
    if (info.badges?.length) extras.push(info.badges.join(' · '));
    target.extra.setText(extras.join('\n'));
  }

  updatePokeballTray(target, tray = []) {
    target.balls.forEach((ball, index) => {
      const entry = tray[index] || { state: 'empty' };
      const fill = entry.state === 'active' ? 0x7dd3fc : entry.state === 'faint' ? 0xf87171 : entry.state === 'status' ? 0xfbbf24 : entry.state === 'ball' ? 0xe2e8f0 : 0x475569;
      ball.setFillStyle(fill, entry.state === 'empty' ? 0.22 : 0.86);
      ball.setPosition(index * 20, 0);
    });
  }

  setAbilityBar(model) {
    if (!model?.visible || !model.text) {
      this.abilityBar.container.setVisible(false);
      return;
    }
    this.abilityBar.text.setText(model.text);
    this.abilityBar.bg.setSize(clamp(this.abilityBar.text.width + 34, 220, 520), 42);
    this.abilityBar.container.setPosition(model.side === 'enemy' ? this.scale.width - this.abilityBar.bg.width - 24 : 24, model.side === 'enemy' ? 82 : this.scale.height * 0.48);
    this.abilityBar.container.setVisible(true);
  }

  clearStateButtons() {
    this.stateButtons.forEach(button => button.destroy());
    this.stateButtons = [];
  }

  clearStateContent() {
    this.clearStateButtons();
    if (this.stateWindow?.content) this.stateWindow.content.removeAll(true);
  }

  createButton({ x, y, width, height, label, sublabel = '', tone = 'default', disabled = false, onClick = null }) {
    const { Phaser } = this;
    const container = this.add.container(x, y);
    const fill = disabled ? 0x1f2937 : tone === 'accent' ? 0x24416b : tone === 'primary' ? 0x17325b : 0x101f38;
    const border = disabled ? 0x64748b : tone === 'accent' ? 0x93c5fd : tone === 'primary' ? 0xbfdbfe : 0xffffff;
    const bg = this.add.rectangle(0, 0, width, height, fill, disabled ? 0.45 : 0.95).setOrigin(0, 0).setStrokeStyle(2, border, disabled ? 0.16 : 0.22);
    const main = this.add.text(width / 2, sublabel ? 10 : height / 2 - 11, label, {
      fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
      fontSize: sublabel ? '18px' : '20px',
      color: disabled ? '#94a3b8' : '#f8fbff',
      align: 'center',
      wordWrap: { width: width - 22, useAdvancedWrap: true },
    }).setOrigin(0.5, sublabel ? 0 : 0.5);
    const children = [bg, main];
    if (sublabel) {
      const secondary = this.add.text(width / 2, height - 20, sublabel, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: disabled ? '#64748b' : '#cbd5e1',
        align: 'center',
        wordWrap: { width: width - 18, useAdvancedWrap: true },
      }).setOrigin(0.5, 1);
      children.push(secondary);
    }
    container.add(children);
    if (!disabled && onClick) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerup', () => onClick());
      bg.on('pointerover', () => bg.setFillStyle(fill + 0x111111, 1));
      bg.on('pointerout', () => bg.setFillStyle(fill, 0.95));
    }
    this.stateWindow.content.add(container);
    this.stateButtons.push(container);
    return container;
  }

  renderMessageWindow(message = {}) {
    if (!this.messageWindow?.bg || !this.messagePrimary || !this.messageSecondary) return;
    const width = Math.max(64, this.messageWindow.bg.width - 36);
    this.messagePrimary.setWordWrapWidth(width, true);
    this.messagePrimary.setText(message.primary || '—');
    this.messageSecondary.setWordWrapWidth(width, true);
    if (message.secondary) {
      this.messageSecondary.setText(message.secondary);
      this.messageSecondary.setVisible(true);
      this.messageSecondary.setPosition(18, Math.min(this.messageWindow.bg.height - 40, this.messagePrimary.y + this.messagePrimary.height + 12));
    } else {
      this.messageSecondary.setText('');
      this.messageSecondary.setVisible(false);
    }
  }

  renderStateWindow(ui = {}) {
    this.clearStateContent();
    this.stateTitle.setText(ui.title || 'Battle');
    const width = this.stateWindow.bg.width;
    const height = this.stateWindow.bg.height;

    if (ui.mode === 'message') {
      const note = this.add.text(18, 48, ui.placeholder || 'Waiting for the next engine request.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#cbd5e1',
        wordWrap: { width: width - 36, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      this.stateWindow.content.add(note);
      return;
    }

    if (ui.mode === 'command') {
      const padding = 18;
      const gap = 10;
      const buttonWidth = (width - padding * 2 - gap) / 2;
      const buttonHeight = 74;
      (ui.commands || []).slice(0, 4).forEach((command, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        this.createButton({
          x: padding + col * (buttonWidth + gap),
          y: 48 + row * (buttonHeight + gap),
          width: buttonWidth,
          height: buttonHeight,
          label: command.label,
          sublabel: command.sublabel || '',
          disabled: command.disabled,
          tone: command.active ? 'accent' : 'default',
          onClick: () => this.controller.handleAction(command.action),
        });
      });
      if (ui.teraToggle) {
        this.createButton({
          x: width - 114,
          y: height - 66,
          width: 96,
          height: 44,
          label: ui.teraToggle.label,
          disabled: ui.teraToggle.disabled,
          tone: ui.teraToggle.active ? 'accent' : 'primary',
          onClick: () => this.controller.handleAction(ui.teraToggle.action),
        });
      }
      return;
    }

    if (ui.mode === 'fight') {
      const padding = 18;
      const gap = 10;
      const buttonWidth = (width - padding * 2 - gap) / 2;
      const buttonHeight = 72;
      (ui.moves || []).slice(0, 4).forEach((move, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        this.createButton({
          x: padding + col * (buttonWidth + gap),
          y: 48 + row * (buttonHeight + gap),
          width: buttonWidth,
          height: buttonHeight,
          label: move.label,
          sublabel: move.sublabel || '',
          disabled: move.disabled,
          tone: move.active ? 'accent' : 'default',
          onClick: () => this.controller.handleAction(move.action),
        });
      });
      let chipX = 18;
      const chipY = 48 + buttonHeight * 2 + gap * 2 + 12;
      (ui.toggles || []).forEach(toggle => {
        this.createButton({
          x: chipX,
          y: chipY,
          width: 90,
          height: 40,
          label: toggle.label,
          disabled: toggle.disabled,
          tone: toggle.active ? 'accent' : 'primary',
          onClick: () => this.controller.handleAction(toggle.action),
        });
        chipX += 98;
      });
      const footerY = height - 54;
      (ui.footerActions || []).forEach((button, index) => {
        this.createButton({
          x: 18 + index * 108,
          y: footerY,
          width: 98,
          height: 38,
          label: button.label,
          disabled: button.disabled,
          tone: button.active ? 'accent' : 'default',
          onClick: () => this.controller.handleAction(button.action),
        });
      });
      if (ui.detailText) {
        const detail = this.add.text(18, chipY + 50, ui.detailText, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          color: '#cbd5e1',
          wordWrap: { width: width - 36, useAdvancedWrap: true },
        }).setOrigin(0, 0);
        this.stateWindow.content.add(detail);
      }
      return;
    }

    if (ui.mode === 'party') {
      const note = this.add.text(18, 48, ui.subtitle || '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#bfdbfe',
        wordWrap: { width: width - 36, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      this.stateWindow.content.add(note);
      (ui.partyOptions || []).forEach((option, index) => {
        this.createButton({
          x: 18,
          y: 84 + index * 66,
          width: width - 36,
          height: 56,
          label: option.label,
          sublabel: option.sublabel || '',
          disabled: option.disabled,
          tone: option.active ? 'accent' : 'default',
          onClick: () => this.controller.handleAction(option.action),
        });
      });
      (ui.footerActions || []).forEach((button, index) => {
        this.createButton({
          x: 18 + index * 108,
          y: height - 54,
          width: 98,
          height: 38,
          label: button.label,
          disabled: button.disabled,
          tone: 'default',
          onClick: () => this.controller.handleAction(button.action),
        });
      });
      return;
    }

    const placeholder = this.add.text(18, 48, ui.placeholder || 'Target selection is reserved for future doubles support.', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#cbd5e1',
      wordWrap: { width: width - 36, useAdvancedWrap: true },
    }).setOrigin(0, 0);
    this.stateWindow.content.add(placeholder);
    (ui.footerActions || []).forEach((button, index) => {
      this.createButton({
        x: 18 + index * 108,
        y: height - 54,
        width: 98,
        height: 38,
        label: button.label,
        disabled: button.disabled,
        tone: 'default',
        onClick: () => this.controller.handleAction(button.action),
      });
    });
  }

  renderModel(model) {
    this.currentModel = model;
    if (!model) return;
    if (!this.turnChip || !this.topBanner || !this.fieldStatusText || !this.enemyInfo || !this.playerInfo || !this.enemyTray || !this.playerTray || !this.messageWindow || !this.stateWindow || !this.abilityBar || !this.enemySprite || !this.playerSprite) return;
    this.turnChip.setText(model.turnChip || `Turn ${model.turn || 0}`);
    this.topBanner.setText(model.bannerText || 'Battle');
    this.fieldStatusText.setText(model.fieldStatus || '');
    this.updateInfoBox(this.enemyInfo, model.enemyInfo || {}, { showExp: false });
    this.updateInfoBox(this.playerInfo, model.playerInfo || {}, { showExp: true });
    this.updatePokeballTray(this.enemyTray, model.enemyTray || []);
    this.updatePokeballTray(this.playerTray, model.playerTray || []);
    this.renderMessageWindow(model.message || {});
    this.renderStateWindow(model.stateWindow || {});
    this.setAbilityBar(model.abilityBar || null);
    renderAnimatedSpriteToHost(this.enemySprite.host, model.enemySprite || {}, 'large');
    renderAnimatedSpriteToHost(this.playerSprite.host, model.playerSprite || {}, 'large');
  }
}

export class PhaserBattleController {
  constructor({ mount, statusEl } = {}) {
    this.mount = mount || null;
    this.statusEl = statusEl || null;
    this.game = null;
    this.scene = null;
    this.callbacks = {};
    this.model = null;
    this.ready = false;
    this.sceneReady = false;
    this.sceneReadyPromise = null;
    this.resolveSceneReady = null;
  }

  setStatus(text = '', tone = 'info') {
    if (!this.statusEl) return;
    this.statusEl.textContent = text;
    this.statusEl.dataset.tone = tone;
    this.statusEl.hidden = !text;
  }

  notifySceneReady(scene) {
    if (scene) this.scene = scene;
    this.sceneReady = true;
    if (typeof this.resolveSceneReady === 'function') {
      this.resolveSceneReady();
      this.resolveSceneReady = null;
    }
    this.setStatus('', 'ready');
  }

  async ensureReady() {
    if (this.sceneReady && this.ready) return;
    if (!this.mount) throw new Error('Phaser battle mount element is missing.');
    if (!this.sceneReadyPromise) {
      this.sceneReadyPromise = new Promise(resolve => {
        this.resolveSceneReady = resolve;
      });
    }
    if (!this.ready) {
      this.setStatus('Loading Phaser battle renderer…', 'loading');
      const Phaser = await loadPhaserModule();
      const scene = new PhaserBattleScene(this, Phaser);
      this.scene = scene;
      this.game = new Phaser.Game({
        type: Phaser.AUTO,
        width: 1280,
        height: 720,
        parent: this.mount,
        transparent: true,
        backgroundColor: '#07101f',
        dom: { createContainer: true },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [scene],
      });
      this.ready = true;
      this.mount.hidden = false;
    }
    await this.sceneReadyPromise;
  }

  async show(model, callbacks = {}) {
    this.callbacks = callbacks;
    this.model = model;
    await this.ensureReady();
    this.mount.hidden = false;
    this.scene?.renderModel(model);
  }

  hide() {
    if (this.mount) this.mount.hidden = true;
  }

  destroy() {
    this.scene = null;
    this.callbacks = {};
    this.model = null;
    this.ready = false;
    this.sceneReady = false;
    this.sceneReadyPromise = null;
    this.resolveSceneReady = null;
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
    if (this.mount) this.mount.innerHTML = '';
  }

  handleAction(action) {
    if (!action || typeof this.callbacks?.onAction !== 'function') return;
    this.callbacks.onAction(action);
  }
}

export function createPhaserBattleController(options = {}) {
  return new PhaserBattleController(options);
}
