const PHASER_IMPORT_PATH = '../node_modules/phaser/dist/phaser.esm.js';

const UI_ASSETS = Object.freeze({
  bgAtlas: { key: 'pkb-ui-bg', json: './assets/pokerogue/ui/bg.json', path: './assets/pokerogue/ui/' },
  promptAtlas: { key: 'pkb-ui-prompt', json: './assets/pokerogue/ui/prompt.json', path: './assets/pokerogue/ui/' },
  typesAtlas: { key: 'pkb-ui-types', json: './assets/pokerogue/ui/misc/types.json', path: './assets/pokerogue/ui/misc/' },
  typesKoAtlas: { key: 'pkb-ui-types-ko', json: './assets/pokerogue/ui/misc/types_ko.json', path: './assets/pokerogue/ui/misc/' },
  categoriesAtlas: { key: 'pkb-ui-categories', json: './assets/pokerogue/ui/misc/categories.json', path: './assets/pokerogue/ui/misc/' },
  teraAtlas: { key: 'pkb-ui-button-tera', image: './assets/pokerogue/ui/button_tera.png', json: './assets/pokerogue/ui/button_tera.json' },
  trayAtlas: { key: 'pkb-ui-pb-tray-ball', image: './assets/pokerogue/ui/pb_tray_ball.png', json: './assets/pokerogue/ui/pb_tray_ball.json' },
  cursor: { key: 'pkb-ui-cursor', url: './assets/pokerogue/ui/cursor.png' },
  cursorTera: { key: 'pkb-ui-cursor-tera', url: './assets/pokerogue/ui/cursor_tera.png' },
  pbinfoPlayer: { key: 'pkb-ui-pbinfo-player', url: './assets/pokerogue/ui/pbinfo_player.png' },
  pbinfoEnemy: { key: 'pkb-ui-pbinfo-enemy', url: './assets/pokerogue/ui/pbinfo_enemy_mini.png' },
  trayOverlayEnemy: { key: 'pkb-ui-tray-overlay-enemy', url: './assets/pokerogue/ui/pb_tray_overlay_enemy.png' },
  trayOverlayPlayer: { key: 'pkb-ui-tray-overlay-player', url: './assets/pokerogue/ui/pb_tray_overlay_player.png' },
});

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
      resolve({ img, frame, count, width: img.width, height: img.height });
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
    const baseTarget = size === 'large' ? 260 : 58;
    const scale = Math.max(1, Math.min(size === 'large' ? 3.2 : 1.9, baseTarget / info.frame));
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

function preloadUiAssets(scene) {
  const { load, textures } = scene;
  if (!textures.exists(UI_ASSETS.bgAtlas.key)) load.multiatlas(UI_ASSETS.bgAtlas.key, UI_ASSETS.bgAtlas.json, UI_ASSETS.bgAtlas.path);
  if (!textures.exists(UI_ASSETS.promptAtlas.key)) load.multiatlas(UI_ASSETS.promptAtlas.key, UI_ASSETS.promptAtlas.json, UI_ASSETS.promptAtlas.path);
  if (!textures.exists(UI_ASSETS.typesAtlas.key)) load.multiatlas(UI_ASSETS.typesAtlas.key, UI_ASSETS.typesAtlas.json, UI_ASSETS.typesAtlas.path);
  if (!textures.exists(UI_ASSETS.typesKoAtlas.key)) load.multiatlas(UI_ASSETS.typesKoAtlas.key, UI_ASSETS.typesKoAtlas.json, UI_ASSETS.typesKoAtlas.path);
  if (!textures.exists(UI_ASSETS.categoriesAtlas.key)) load.multiatlas(UI_ASSETS.categoriesAtlas.key, UI_ASSETS.categoriesAtlas.json, UI_ASSETS.categoriesAtlas.path);
  if (!textures.exists(UI_ASSETS.teraAtlas.key)) load.atlas(UI_ASSETS.teraAtlas.key, UI_ASSETS.teraAtlas.image, UI_ASSETS.teraAtlas.json);
  if (!textures.exists(UI_ASSETS.trayAtlas.key)) load.multiatlas(UI_ASSETS.trayAtlas.key, UI_ASSETS.trayAtlas.json, './assets/pokerogue/ui/');
  if (!textures.exists(UI_ASSETS.cursor.key)) load.image(UI_ASSETS.cursor.key, UI_ASSETS.cursor.url);
  if (!textures.exists(UI_ASSETS.cursorTera.key)) load.image(UI_ASSETS.cursorTera.key, UI_ASSETS.cursorTera.url);
  if (!textures.exists(UI_ASSETS.pbinfoPlayer.key)) load.image(UI_ASSETS.pbinfoPlayer.key, UI_ASSETS.pbinfoPlayer.url);
  if (!textures.exists(UI_ASSETS.pbinfoEnemy.key)) load.image(UI_ASSETS.pbinfoEnemy.key, UI_ASSETS.pbinfoEnemy.url);
  if (!textures.exists(UI_ASSETS.trayOverlayEnemy.key)) load.image(UI_ASSETS.trayOverlayEnemy.key, UI_ASSETS.trayOverlayEnemy.url);
  if (!textures.exists(UI_ASSETS.trayOverlayPlayer.key)) load.image(UI_ASSETS.trayOverlayPlayer.key, UI_ASSETS.trayOverlayPlayer.url);
}

function textureExists(scene, key, frame = null) {
  if (!scene?.textures?.exists?.(key)) return false;
  if (frame == null) return true;
  try {
    return scene.textures.get(key).has(frame);
  } catch (_error) {
    return false;
  }
}

function setInteractiveTarget(target, onClick = null, onHover = null) {
  if (!target || (!onClick && !onHover)) return;
  target.setInteractive({ useHandCursor: Boolean(onClick) });
  if (onClick) target.on('pointerup', () => onClick());
  if (onHover) {
    target.on('pointerover', () => onHover());
    target.on('pointermove', () => onHover());
  }
}

function clearContainer(container) {
  if (!container) return;
  container.removeAll(true);
}

function createPhaserBattleSceneClass(Phaser) {
  return class PhaserBattleScene extends Phaser.Scene {
    constructor(controller) {
      super({ key: 'pkb-phaser-battle-scene' });
      this.controller = controller;
      this.Phaser = Phaser;
      this.sceneKey = 'pkb-phaser-battle-scene';
      this.isBootstrapped = false;
      this.handleResize = () => this.layoutSafely();
      this.handleShutdown = () => {
        try {
          this.scale?.off?.('resize', this.handleResize, this);
        } catch (_error) {
          // no-op
        }
      };
    }

    preload() {
      preloadUiAssets(this);
    }

    create() {
      try {
        this.currentModel = null;
        this.uiLanguage = 'ko';

        this.background = this.add.graphics();
        this.overlay = this.add.graphics();

        this.turnChip = this.add.text(0, 0, '', {
          fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
          fontSize: '20px',
          color: '#eaf2ff',
          backgroundColor: 'rgba(7, 18, 36, 0.9)',
          padding: { left: 10, right: 10, top: 6, bottom: 6 },
        }).setOrigin(0, 0.5);

        this.bannerText = this.add.text(0, 0, '', {
          fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
          fontSize: '24px',
          color: '#f8fbff',
          align: 'center',
        }).setOrigin(0.5, 0.5);

        this.fieldStatusText = this.add.text(0, 0, '', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          color: '#cfe2ff',
          align: 'center',
          wordWrap: { width: 1000, useAdvancedWrap: true },
        }).setOrigin(0.5, 0.5);

        this.perspectiveTabs = this.createPerspectiveTabs();
        this.enemySprite = this.createSpriteMount('enemy');
        this.playerSprite = this.createSpriteMount('player');
        this.enemyInfo = this.createBattleInfoBox('enemy');
        this.playerInfo = this.createBattleInfoBox('player');
        this.enemyTray = this.createTray('enemy');
        this.playerTray = this.createTray('player');
        this.abilityBar = this.createAbilityBar();

        this.messagePanel = this.createMessagePanel();
        this.commandPanel = this.createCommandPanel();
        this.fightPanel = this.createFightPanel();
        this.partyPanel = this.createPartyPanel();
        this.notePanel = this.createNotePanel();

        if (textureExists(this, UI_ASSETS.promptAtlas.key, '1') && !this.anims.exists('pkb-ui-prompt-arrow')) {
          this.anims.create({
            key: 'pkb-ui-prompt-arrow',
            frames: ['1', '2', '3', '4'].filter(frame => textureExists(this, UI_ASSETS.promptAtlas.key, frame)).map(frame => ({ key: UI_ASSETS.promptAtlas.key, frame })),
            frameRate: 6,
            repeat: -1,
          });
        }

        this.scale?.on?.('resize', this.handleResize, this);
        this.events?.once?.('shutdown', this.handleShutdown, this);
        this.isBootstrapped = true;
        this.layoutSafely();
        this.controller?.notifySceneReady?.(this);
      } catch (error) {
        this.controller?.notifySceneError?.(error);
        throw error;
      }
    }

    layoutSafely() {
      try {
        this.layout();
      } catch (error) {
        this.controller?.notifySceneError?.(error);
        throw error;
      }
    }

    createSpriteMount(name) {
      const host = document.createElement('div');
      host.className = `pkb-phaser-sprite pkb-phaser-sprite-${name}`;
      ensureSpriteHostStyles(host);
      const dom = this.add.dom(0, 0, host);
      dom.setOrigin(0.5, 0.5);
      return { host, dom };
    }

    createPerspectiveTabs() {
      const container = this.add.container(0, 0);
      const tabs = [0, 1].map(index => {
        const bg = this.add.rectangle(0, 0, 150, 34, 0x0b162d, 0.92).setOrigin(0, 0).setStrokeStyle(2, 0xdbeafe, 0.16);
        const label = this.add.text(75, 17, `P${index + 1}`, {
          fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
          fontSize: '18px',
          color: '#dbeafe',
          align: 'center',
        }).setOrigin(0.5, 0.5);
        const button = this.add.container(index * 158, 0, [bg, label]);
        setInteractiveTarget(bg, () => this.controller.handleAction({ type: 'perspective', player: index }));
        container.add(button);
        return { button, bg, label };
      });
      return { container, tabs };
    }

    createBattleInfoBox(side) {
      const container = this.add.container(0, 0);
      const textureKey = side === 'player' ? UI_ASSETS.pbinfoPlayer.key : UI_ASSETS.pbinfoEnemy.key;
      let width = 394;
      let height = side === 'player' ? 126 : 96;
      let bg = null;
      if (textureExists(this, textureKey)) {
        bg = this.add.image(0, 0, textureKey).setOrigin(0, 0);
        bg.setScale(side === 'player' ? 3.02 : 3.03);
        width = bg.displayWidth;
        height = bg.displayHeight;
      } else {
        bg = this.add.rectangle(0, 0, width, height, 0x10213d, 0.94).setOrigin(0, 0).setStrokeStyle(2, 0xffffff, 0.12);
      }
      const name = this.add.text(18, 12, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '21px',
        color: '#f8fbff',
      }).setOrigin(0, 0);
      const level = this.add.text(width - 18, 12, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '15px',
        color: '#dbeafe',
      }).setOrigin(1, 0);
      const status = this.add.text(width - 18, side === 'player' ? 77 : 51, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#fbbf24',
      }).setOrigin(1, 0.5);
      const badges = this.add.text(width - 18, height - 14, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#dbeafe',
        align: 'right',
      }).setOrigin(1, 1);
      const hpTrack = this.add.rectangle(side === 'player' ? 164 : 172, side === 'player' ? 52 : 43, side === 'player' ? 176 : 162, 10, 0x122033, 0.96).setOrigin(0, 0).setStrokeStyle(1, 0xffffff, 0.08);
      const hpFill = this.add.rectangle(hpTrack.x + 2, hpTrack.y + 2, hpTrack.width - 4, hpTrack.height - 4, 0x86efac, 1).setOrigin(0, 0);
      const hpText = this.add.text(side === 'player' ? 162 : 170, side === 'player' ? 69 : 57, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: side === 'player' ? '13px' : '12px',
        color: '#eff6ff',
      }).setOrigin(0, 0.5);
      const typeIcons = Array.from({ length: 3 }, (_, index) => {
        const icon = this.add.image(18 + index * 38, side === 'player' ? 82 : 58, UI_ASSETS.typesAtlas.key, 'unknown').setOrigin(0, 0.5);
        icon.setVisible(false);
        return icon;
      });
      container.add([bg, hpTrack, hpFill, name, level, status, badges, hpText, ...typeIcons]);
      return { container, bg, name, level, status, badges, hpTrack, hpFill, hpText, typeIcons, width, height, side };
    }

    createTray(side) {
      const container = this.add.container(0, 0);
      const overlayKey = side === 'player' ? UI_ASSETS.trayOverlayPlayer.key : UI_ASSETS.trayOverlayEnemy.key;
      const overlay = textureExists(this, overlayKey) ? this.add.image(0, 0, overlayKey).setOrigin(0, 0).setScale(2.7) : this.add.rectangle(0, 0, 282, 10, 0x0f172a, 0.64).setOrigin(0, 0);
      const balls = Array.from({ length: 6 }, (_, index) => {
        const ball = textureExists(this, UI_ASSETS.trayAtlas.key, 'ball')
          ? this.add.image(0, 0, UI_ASSETS.trayAtlas.key, 'ball').setOrigin(0, 0.5).setScale(2.1)
          : this.add.circle(0, 0, 8, 0xe2e8f0, 0.85).setStrokeStyle(2, 0x0f172a, 0.9);
        ball.x = 10 + index * 28;
        ball.y = overlay.displayHeight * 0.5;
        return ball;
      });
      container.add([overlay, ...balls]);
      return { container, overlay, balls, side };
    }

    createAbilityBar() {
      const container = this.add.container(0, 0);
      const bg = this.add.rectangle(0, 0, 360, 42, 0x081425, 0.96).setOrigin(0, 0).setStrokeStyle(2, 0xffffff, 0.12);
      const text = this.add.text(14, 10, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '18px',
        color: '#f8fbff',
      }).setOrigin(0, 0);
      container.add([bg, text]);
      container.setVisible(false);
      return { container, bg, text };
    }

    createMessagePanel() {
      const container = this.add.container(0, 0);
      const bg = this.add.rectangle(0, 0, 100, 100, 0x081425, 0.98).setOrigin(0, 0).setStrokeStyle(2, 0xf8fafc, 0.12);
      const primary = this.add.text(18, 16, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '22px',
        color: '#f8fbff',
        lineSpacing: 4,
        wordWrap: { width: 100, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const secondary = this.add.text(18, 18, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
        color: '#cbd5e1',
        lineSpacing: 2,
        wordWrap: { width: 100, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const prompt = textureExists(this, UI_ASSETS.promptAtlas.key, '1')
        ? this.add.sprite(0, 0, UI_ASSETS.promptAtlas.key, '1').setOrigin(0, 0)
        : this.add.text(0, 0, '▾', { fontFamily: 'system-ui, sans-serif', fontSize: '18px', color: '#f8fbff' }).setOrigin(0, 0);
      prompt.setVisible(false);
      container.add([bg, primary, secondary, prompt]);
      return { container, bg, primary, secondary, prompt };
    }

    createCommandPanel() {
      const container = this.add.container(0, 0);
      const bg = this.add.rectangle(0, 0, 340, 164, 0x0b162d, 0.98).setOrigin(0, 0).setStrokeStyle(2, 0xf8fafc, 0.12);
      const title = this.add.text(16, 12, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '18px',
        color: '#dbeafe',
      }).setOrigin(0, 0);
      const cursor = textureExists(this, UI_ASSETS.cursor.key)
        ? this.add.image(0, 0, UI_ASSETS.cursor.key).setOrigin(0, 0).setScale(2.2)
        : this.add.text(0, 0, '▶', { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#f8fbff' }).setOrigin(0, 0);
      const teraButton = textureExists(this, UI_ASSETS.teraAtlas.key, 'unknown')
        ? this.add.sprite(0, 0, UI_ASSETS.teraAtlas.key, 'unknown').setOrigin(0, 0).setScale(2.4)
        : this.add.text(0, 0, 'Tera', { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#f8fbff' }).setOrigin(0, 0);
      teraButton.setVisible(false);
      const entries = Array.from({ length: 4 }, () => {
        const label = this.add.text(0, 0, '', {
          fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
          fontSize: '22px',
          color: '#f8fbff',
        }).setOrigin(0, 0);
        const zone = this.add.rectangle(0, 0, 132, 42, 0xffffff, 0.001).setOrigin(0, 0);
        return { label, zone };
      });
      container.add([bg, title, cursor, teraButton, ...entries.flatMap(entry => [entry.zone, entry.label])]);
      return { container, bg, title, cursor, teraButton, entries };
    }

    createFightPanel() {
      const container = this.add.container(0, 0);
      const movesBg = this.add.rectangle(0, 0, 420, 156, 0x0b162d, 0.98).setOrigin(0, 0).setStrokeStyle(2, 0xf8fafc, 0.12);
      const detailBg = this.add.rectangle(436, 0, 320, 156, 0x0b162d, 0.98).setOrigin(0, 0).setStrokeStyle(2, 0xf8fafc, 0.12);
      const title = this.add.text(14, 10, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '18px',
        color: '#dbeafe',
      }).setOrigin(0, 0);
      const cursor = textureExists(this, UI_ASSETS.cursor.key)
        ? this.add.image(0, 0, UI_ASSETS.cursor.key).setOrigin(0, 0).setScale(2.2)
        : this.add.text(0, 0, '▶', { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#f8fbff' }).setOrigin(0, 0);
      const moves = Array.from({ length: 4 }, () => {
        const label = this.add.text(0, 0, '', {
          fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
          fontSize: '20px',
          color: '#f8fbff',
          wordWrap: { width: 158, useAdvancedWrap: true },
        }).setOrigin(0, 0);
        const zone = this.add.rectangle(0, 0, 182, 46, 0xffffff, 0.001).setOrigin(0, 0);
        return { label, zone };
      });
      const detailName = this.add.text(454, 14, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '18px',
        color: '#f8fbff',
        wordWrap: { width: 180, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const typeIcon = textureExists(this, UI_ASSETS.typesAtlas.key, 'unknown')
        ? this.add.image(454, 56, UI_ASSETS.typesAtlas.key, 'unknown').setOrigin(0, 0)
        : this.add.text(454, 56, '', { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#cbd5e1' }).setOrigin(0, 0);
      const categoryIcon = textureExists(this, UI_ASSETS.categoriesAtlas.key, 'status')
        ? this.add.image(610, 58, UI_ASSETS.categoriesAtlas.key, 'status').setOrigin(0, 0)
        : this.add.text(610, 56, '', { fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#cbd5e1' }).setOrigin(0, 0);
      const ppText = this.add.text(454, 82, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#dbeafe',
      }).setOrigin(0, 0);
      const powerText = this.add.text(454, 100, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#dbeafe',
      }).setOrigin(0, 0);
      const accuracyText = this.add.text(454, 118, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#dbeafe',
      }).setOrigin(0, 0);
      const description = this.add.text(454, 138, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#cbd5e1',
        wordWrap: { width: 286, useAdvancedWrap: true },
      }).setOrigin(0, 1);
      const toggles = Array.from({ length: 5 }, () => {
        const bg = this.add.rectangle(0, 0, 76, 28, 0x132742, 0.98).setOrigin(0, 0).setStrokeStyle(2, 0xdbeafe, 0.16);
        const label = this.add.text(38, 14, '', {
          fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
          fontSize: '15px',
          color: '#f8fbff',
          align: 'center',
        }).setOrigin(0.5, 0.5);
        const icon = textureExists(this, UI_ASSETS.teraAtlas.key, 'unknown')
          ? this.add.sprite(0, 0, UI_ASSETS.teraAtlas.key, 'unknown').setOrigin(0, 0).setScale(1.5)
          : null;
        const button = this.add.container(0, 0, icon ? [bg, icon, label] : [bg, label]);
        button.setVisible(false);
        setInteractiveTarget(bg);
        return { button, bg, label, icon };
      });
      const footerActions = Array.from({ length: 2 }, () => {
        const bg = this.add.rectangle(0, 0, 98, 30, 0x132742, 0.98).setOrigin(0, 0).setStrokeStyle(2, 0xdbeafe, 0.16);
        const label = this.add.text(49, 15, '', {
          fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
          fontSize: '14px',
          color: '#f8fbff',
          align: 'center',
        }).setOrigin(0.5, 0.5);
        return { bg, label };
      });
      container.add([movesBg, detailBg, title, cursor, ...moves.flatMap(entry => [entry.zone, entry.label]), detailName, typeIcon, categoryIcon, ppText, powerText, accuracyText, description, ...toggles.flatMap(entry => entry.icon ? [entry.button] : [entry.button]), ...footerActions.flatMap(entry => [entry.bg, entry.label])]);
      return { container, movesBg, detailBg, title, cursor, moves, detailName, typeIcon, categoryIcon, ppText, powerText, accuracyText, description, toggles, footerActions };
    }

    createPartyPanel() {
      const container = this.add.container(0, 0);
      const bg = this.add.rectangle(0, 0, 470, 276, 0x091423, 0.985).setOrigin(0, 0).setStrokeStyle(2, 0xf8fafc, 0.14);
      const title = this.add.text(16, 12, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '18px',
        color: '#dbeafe',
      }).setOrigin(0, 0);
      const subtitle = this.add.text(16, 38, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#bfdbfe',
        wordWrap: { width: 438, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const cursor = textureExists(this, UI_ASSETS.cursor.key)
        ? this.add.image(0, 0, UI_ASSETS.cursor.key).setOrigin(0, 0).setScale(2.1)
        : this.add.text(0, 0, '▶', { fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#f8fbff' }).setOrigin(0, 0);
      const entries = Array.from({ length: 6 }, () => {
        const rowBg = this.add.rectangle(0, 0, 438, 34, 0x132742, 0.76).setOrigin(0, 0).setStrokeStyle(1, 0xdbeafe, 0.1);
        const label = this.add.text(14, 8, '', {
          fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
          fontSize: '16px',
          color: '#f8fbff',
        }).setOrigin(0, 0);
        const sublabel = this.add.text(14, 20, '', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          color: '#cbd5e1',
        }).setOrigin(0, 0);
        const row = this.add.container(0, 0, [rowBg, label, sublabel]);
        return { row, rowBg, label, sublabel };
      });
      const footer = this.add.text(16, 244, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '14px',
        color: '#dbeafe',
      }).setOrigin(0, 0);
      const footerZone = this.add.rectangle(16, 242, 98, 24, 0xffffff, 0.001).setOrigin(0, 0);
      container.add([bg, title, subtitle, cursor, ...entries.map(entry => entry.row), footer, footerZone]);
      return { container, bg, title, subtitle, cursor, entries, footer, footerZone };
    }

    createNotePanel() {
      const container = this.add.container(0, 0);
      const bg = this.add.rectangle(0, 0, 340, 116, 0x0b162d, 0.98).setOrigin(0, 0).setStrokeStyle(2, 0xf8fafc, 0.12);
      const title = this.add.text(16, 12, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '18px',
        color: '#dbeafe',
      }).setOrigin(0, 0);
      const body = this.add.text(16, 42, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        color: '#cbd5e1',
        wordWrap: { width: 308, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const footer = this.add.text(16, 92, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '14px',
        color: '#dbeafe',
      }).setOrigin(0, 0);
      const footerZone = this.add.rectangle(16, 90, 88, 22, 0xffffff, 0.001).setOrigin(0, 0);
      container.add([bg, title, body, footer, footerZone]);
      return { container, bg, title, body, footer, footerZone };
    }

    layout() {
      if (!this.isBootstrapped) return;
      const width = this.scale.width;
      const height = this.scale.height;
      const margin = isMobileViewport() ? 18 : 24;
      const topHeight = clamp(height * 0.61, 360, 510);
      const bottomHeight = clamp(height - topHeight - margin * 3, 180, 240);
      const stageWidth = width - margin * 2;
      const bottomTop = height - bottomHeight - margin;

      this.background.clear();
      this.background.fillGradientStyle(0x06111f, 0x06111f, 0x13233f, 0x0b162d, 1);
      this.background.fillRect(0, 0, width, height);
      this.background.fillStyle(0x1f3b5b, 0.26);
      this.background.fillEllipse(width * 0.52, topHeight * 0.81, stageWidth * 0.68, topHeight * 0.28);
      this.background.fillStyle(0x14304f, 0.38);
      this.background.fillEllipse(width * 0.73, topHeight * 0.38, stageWidth * 0.24, topHeight * 0.1);
      this.background.fillEllipse(width * 0.29, topHeight * 0.6, stageWidth * 0.19, topHeight * 0.08);

      this.overlay.clear();
      this.overlay.lineStyle(2, 0xffffff, 0.06);
      this.overlay.strokeRoundedRect(margin, margin + 54, stageWidth, topHeight - 12, 18);

      this.turnChip.setPosition(margin + 8, margin + 14);
      this.bannerText.setPosition(width / 2, margin + 18);
      this.fieldStatusText.setPosition(width / 2, margin + 48);
      this.fieldStatusText.setWordWrapWidth(stageWidth - 120, true);

      this.perspectiveTabs.container.setPosition(width / 2 - 154, margin + 66);

      this.enemyInfo.container.setPosition(width - margin - this.enemyInfo.width, margin + 116);
      this.playerInfo.container.setPosition(margin + 8, topHeight - this.playerInfo.height + 34);
      this.enemyTray.container.setPosition(width - margin - 288, margin + 96);
      this.playerTray.container.setPosition(margin + 18, topHeight - 22);

      this.enemySprite.dom.setPosition(width * 0.73, topHeight * 0.4);
      this.playerSprite.dom.setPosition(width * 0.28, topHeight * 0.77);
      Object.assign(this.enemySprite.host.style, { width: '278px', height: '278px' });
      Object.assign(this.playerSprite.host.style, { width: '294px', height: '294px' });

      this.messagePanel.container.setPosition(margin, bottomTop);
      this.messagePanel.bg.setSize(stageWidth, bottomHeight);
      this.messagePanel.primary.setWordWrapWidth(Math.max(100, stageWidth - 388), true);
      this.messagePanel.secondary.setWordWrapWidth(Math.max(100, stageWidth - 388), true);

      this.commandPanel.container.setPosition(width - margin - this.commandPanel.bg.width - 10, bottomTop + bottomHeight - this.commandPanel.bg.height - 10);
      this.fightPanel.container.setPosition(margin + 8, bottomTop + 12);
      this.partyPanel.container.setPosition(width - margin - this.partyPanel.bg.width - 12, bottomTop - 22);
      this.notePanel.container.setPosition(width - margin - this.notePanel.bg.width - 12, bottomTop + bottomHeight - this.notePanel.bg.height - 12);

      if (this.currentModel) this.renderModel(this.currentModel);
    }

    updatePerspectiveTabs(model) {
      const tabs = model?.perspectiveOptions || [];
      this.perspectiveTabs.tabs.forEach((tab, index) => {
        const option = tabs[index] || { label: `P${index + 1}`, active: false };
        tab.label.setText(option.label || `P${index + 1}`);
        tab.bg.setFillStyle(option.active ? 0x1b3354 : 0x0b162d, 0.96);
        tab.bg.setStrokeStyle(2, option.active ? 0x93c5fd : 0xdbeafe, option.active ? 0.35 : 0.16);
      });
    }

    updateInfoBox(target, info = {}) {
      const hpPercent = clamp(Number(info.hpPercent || 0), 0, 100);
      const hpColor = hpPercent > 50 ? 0x86efac : hpPercent > 20 ? 0xfbbf24 : 0xf87171;
      target.name.setText(info.displayName || '—');
      target.level.setText(info.levelLabel || '');
      target.status.setText(info.statusLabel || '');
      target.badges.setText(info.badges?.join(' · ') || '');
      target.hpFill.width = Math.max(0, (target.hpTrack.width - 4) * (hpPercent / 100));
      target.hpFill.fillColor = hpColor;
      target.hpText.setText(info.hpLabel || '');
      const typesKey = this.uiLanguage === 'ko' && textureExists(this, UI_ASSETS.typesKoAtlas.key, 'unknown') ? UI_ASSETS.typesKoAtlas.key : UI_ASSETS.typesAtlas.key;
      target.typeIcons.forEach((icon, index) => {
        const typeId = String(info.types?.[index] || '').toLowerCase();
        if (textureExists(this, typesKey, typeId)) {
          icon.setTexture(typesKey, typeId);
          icon.setVisible(true);
        } else {
          icon.setVisible(false);
        }
      });
    }

    updateTray(target, tray = []) {
      target.balls.forEach((ball, index) => {
        const entry = tray[index] || { state: 'empty' };
        const frame = entry.state === 'active' ? 'ball' : entry.state;
        if (textureExists(this, UI_ASSETS.trayAtlas.key, frame)) {
          ball.setTexture(UI_ASSETS.trayAtlas.key, frame);
          ball.setVisible(true);
          ball.setAlpha(entry.state === 'active' ? 1 : 0.96);
          ball.setTintFill(entry.state === 'active' ? 0x9bd6ff : 0xffffff);
        } else if (ball.setFillStyle) {
          const fill = entry.state === 'active' ? 0x7dd3fc : entry.state === 'faint' ? 0xf87171 : entry.state === 'status' ? 0xfbbf24 : entry.state === 'ball' ? 0xe2e8f0 : 0x475569;
          ball.setFillStyle(fill, entry.state === 'empty' ? 0.22 : 0.86);
        }
      });
    }

    setAbilityBar(model) {
      if (!model?.visible || !model.text) {
        this.abilityBar.container.setVisible(false);
        return;
      }
      this.abilityBar.text.setText(model.text);
      this.abilityBar.bg.setSize(clamp(this.abilityBar.text.width + 28, 220, 520), 40);
      const x = model.side === 'enemy' ? this.scale.width - this.abilityBar.bg.width - 24 : 24;
      const y = model.side === 'enemy' ? 118 : this.scale.height * 0.5;
      this.abilityBar.container.setPosition(x, y);
      this.abilityBar.container.setVisible(true);
    }

    renderMessageWindow(message = {}) {
      const width = Math.max(100, this.messagePanel.bg.width - 388);
      this.messagePanel.primary.setWordWrapWidth(width, true);
      this.messagePanel.secondary.setWordWrapWidth(width, true);
      this.messagePanel.primary.setText(message.primary || '—');
      if (message.secondary) {
        this.messagePanel.secondary.setText(message.secondary);
        this.messagePanel.secondary.setVisible(true);
        this.messagePanel.secondary.setPosition(18, Math.min(this.messagePanel.bg.height - 42, 18 + this.messagePanel.primary.height + 12));
      } else {
        this.messagePanel.secondary.setText('');
        this.messagePanel.secondary.setVisible(false);
      }
      const promptVisible = Boolean(message.secondary || message.primary);
      this.messagePanel.prompt.setVisible(promptVisible);
      if (promptVisible) {
        this.messagePanel.prompt.setPosition(width + 28, this.messagePanel.bg.height - 26);
        if (this.messagePanel.prompt.play) {
          try {
            this.messagePanel.prompt.play('pkb-ui-prompt-arrow');
          } catch (_error) {
            // no-op
          }
        }
      }
    }

    renderCommandPanel(ui = {}) {
      this.commandPanel.container.setVisible(true);
      this.commandPanel.title.setText(ui.title || 'Battle');
      const positions = [
        { x: 32, y: 52 },
        { x: 186, y: 52 },
        { x: 32, y: 102 },
        { x: 186, y: 102 },
      ];
      let cursorPos = positions[0];
      (ui.commands || []).slice(0, 4).forEach((command, index) => {
        const entry = this.commandPanel.entries[index];
        const pos = positions[index];
        entry.label.setPosition(pos.x, pos.y);
        entry.label.setText(command.label || '');
        entry.label.setAlpha(command.disabled ? 0.42 : 1);
        entry.label.setColor(command.disabled ? '#64748b' : '#f8fbff');
        entry.zone.setPosition(pos.x - 12, pos.y - 4);
        entry.zone.width = 126;
        entry.zone.height = 34;
        entry.zone.removeAllListeners();
        if (!command.disabled && command.action) {
          setInteractiveTarget(entry.zone, () => this.controller.handleAction(command.action));
        }
        if (command.active) cursorPos = pos;
      });
      this.commandPanel.cursor.setPosition(cursorPos.x - 18, cursorPos.y + 2);
      const tera = ui.teraToggle;
      if (tera) {
        this.commandPanel.teraButton.setVisible(true);
        if (this.commandPanel.teraButton.setFrame && textureExists(this, UI_ASSETS.teraAtlas.key, 'unknown')) {
          this.commandPanel.teraButton.setTexture(UI_ASSETS.teraAtlas.key, 'unknown');
        }
        this.commandPanel.teraButton.setAlpha(tera.disabled ? 0.45 : 1);
        this.commandPanel.teraButton.x = 258;
        this.commandPanel.teraButton.y = 108;
        this.commandPanel.teraButton.removeAllListeners?.();
        if (!tera.disabled && tera.action) {
          setInteractiveTarget(this.commandPanel.teraButton, () => this.controller.handleAction(tera.action));
        }
      } else {
        this.commandPanel.teraButton.setVisible(false);
      }
    }

    renderFightPanel(ui = {}) {
      this.fightPanel.container.setVisible(true);
      this.fightPanel.title.setText(ui.title || 'Moves');
      const positions = [
        { x: 36, y: 44 },
        { x: 228, y: 44 },
        { x: 36, y: 98 },
        { x: 228, y: 98 },
      ];
      let cursorPos = positions[0];
      (ui.moves || []).slice(0, 4).forEach((move, index) => {
        const entry = this.fightPanel.moves[index];
        const pos = positions[index];
        entry.label.setPosition(pos.x, pos.y);
        entry.label.setText(move.label || '');
        entry.label.setAlpha(move.disabled ? 0.42 : 1);
        entry.label.setColor(move.disabled ? '#64748b' : (move.active ? '#93c5fd' : '#f8fbff'));
        entry.zone.setPosition(pos.x - 16, pos.y - 4);
        entry.zone.width = 176;
        entry.zone.height = 38;
        entry.zone.removeAllListeners();
        if (!move.disabled) {
          const hoverAction = move.focusAction ? () => this.controller.handleAction(move.focusAction) : null;
          setInteractiveTarget(entry.zone, move.action ? () => this.controller.handleAction(move.action) : null, hoverAction);
        }
        if (move.focused || move.active) cursorPos = pos;
      });
      this.fightPanel.cursor.setPosition(cursorPos.x - 18, cursorPos.y + 2);
      const detail = ui.detail || {};
      this.fightPanel.detailName.setText(detail.name || '—');
      if (this.fightPanel.typeIcon.setTexture) {
        const typesKey = this.uiLanguage === 'ko' && textureExists(this, UI_ASSETS.typesKoAtlas.key, detail.type) ? UI_ASSETS.typesKoAtlas.key : UI_ASSETS.typesAtlas.key;
        if (textureExists(this, typesKey, detail.type || 'unknown')) {
          this.fightPanel.typeIcon.setTexture(typesKey, detail.type || 'unknown');
          this.fightPanel.typeIcon.setVisible(true);
        } else {
          this.fightPanel.typeIcon.setVisible(false);
        }
      } else {
        this.fightPanel.typeIcon.setText(detail.typeLabel || '');
      }
      if (this.fightPanel.categoryIcon.setTexture) {
        if (textureExists(this, UI_ASSETS.categoriesAtlas.key, detail.category || 'status')) {
          this.fightPanel.categoryIcon.setTexture(UI_ASSETS.categoriesAtlas.key, detail.category || 'status');
          this.fightPanel.categoryIcon.setVisible(true);
        } else {
          this.fightPanel.categoryIcon.setVisible(false);
        }
      } else {
        this.fightPanel.categoryIcon.setText(detail.category || '');
      }
      this.fightPanel.ppText.setText(`PP ${detail.ppLabel || '—'}`);
      this.fightPanel.powerText.setText(`Power ${detail.powerLabel || '—'}`);
      this.fightPanel.accuracyText.setText(`Accuracy ${detail.accuracyLabel || '—'}`);
      this.fightPanel.description.setText(detail.description || '');

      (ui.toggles || []).slice(0, this.fightPanel.toggles.length).forEach((toggle, index) => {
        const entry = this.fightPanel.toggles[index];
        entry.button.setVisible(true);
        entry.button.setPosition(440 + index * 62, 124);
        entry.bg.setFillStyle(toggle.active ? 0x24416b : 0x132742, toggle.disabled ? 0.42 : 0.98);
        entry.bg.setStrokeStyle(2, toggle.active ? 0x93c5fd : 0xdbeafe, toggle.active ? 0.3 : 0.16);
        entry.label.setText(toggle.label || '');
        entry.label.setColor(toggle.disabled ? '#64748b' : '#f8fbff');
        entry.bg.removeAllListeners();
        if (entry.icon) {
          entry.icon.setVisible(toggle.kind === 'tera');
          if (toggle.kind === 'tera' && textureExists(this, UI_ASSETS.teraAtlas.key, toggle.type || 'unknown')) {
            entry.icon.setTexture(UI_ASSETS.teraAtlas.key, toggle.type || 'unknown');
            entry.icon.setPosition(6, 4);
            entry.label.setPosition(54, 14);
          } else {
            entry.icon.setVisible(false);
            entry.label.setPosition(38, 14);
          }
        }
        if (!toggle.disabled && toggle.action) {
          setInteractiveTarget(entry.bg, () => this.controller.handleAction(toggle.action));
        }
      });
      this.fightPanel.toggles.slice((ui.toggles || []).length).forEach(entry => entry.button.setVisible(false));

      (ui.footerActions || []).slice(0, this.fightPanel.footerActions.length).forEach((action, index) => {
        const entry = this.fightPanel.footerActions[index];
        entry.bg.setPosition(16 + index * 106, 122);
        entry.label.setPosition(16 + index * 106 + 49, 137);
        entry.label.setText(action.label || '');
        entry.label.setColor(action.disabled ? '#64748b' : '#f8fbff');
        entry.bg.setAlpha(action.disabled ? 0.42 : 0.98);
        entry.bg.removeAllListeners();
        if (!action.disabled && action.action) {
          setInteractiveTarget(entry.bg, () => this.controller.handleAction(action.action));
        }
      });
    }

    renderPartyPanel(ui = {}) {
      this.partyPanel.container.setVisible(true);
      this.partyPanel.title.setText(ui.title || 'Switch');
      this.partyPanel.subtitle.setText(ui.subtitle || '');
      let cursorY = 84;
      (ui.partyOptions || []).slice(0, this.partyPanel.entries.length).forEach((option, index) => {
        const entry = this.partyPanel.entries[index];
        entry.row.setVisible(true);
        entry.row.setPosition(16, 78 + index * 38);
        entry.label.setText(option.label || '');
        entry.sublabel.setText(option.sublabel || '');
        entry.rowBg.setAlpha(option.disabled ? 0.32 : (option.active ? 0.98 : 0.76));
        entry.rowBg.setFillStyle(option.active ? 0x24416b : 0x132742, option.disabled ? 0.32 : (option.active ? 0.98 : 0.76));
        entry.rowBg.removeAllListeners();
        if (!option.disabled && option.action) {
          setInteractiveTarget(entry.rowBg, () => this.controller.handleAction(option.action));
        }
        if (option.active) cursorY = 86 + index * 38;
      });
      this.partyPanel.entries.slice((ui.partyOptions || []).length).forEach(entry => entry.row.setVisible(false));
      this.partyPanel.cursor.setPosition(22, cursorY);
      const footerAction = (ui.footerActions || [])[0] || null;
      this.partyPanel.footer.setText(footerAction?.label || '');
      this.partyPanel.footer.setVisible(Boolean(footerAction));
      this.partyPanel.footerZone.removeAllListeners();
      this.partyPanel.footerZone.setVisible(Boolean(footerAction));
      if (footerAction && !footerAction.disabled && footerAction.action) {
        setInteractiveTarget(this.partyPanel.footerZone, () => this.controller.handleAction(footerAction.action));
      }
    }

    renderNotePanel(ui = {}) {
      this.notePanel.container.setVisible(true);
      this.notePanel.title.setText(ui.title || 'Battle');
      this.notePanel.body.setText(ui.placeholder || ui.subtitle || '');
      const footerAction = (ui.footerActions || [])[0] || null;
      this.notePanel.footer.setText(footerAction?.label || '');
      this.notePanel.footer.setVisible(Boolean(footerAction));
      this.notePanel.footerZone.setVisible(Boolean(footerAction));
      this.notePanel.footerZone.removeAllListeners();
      if (footerAction && !footerAction.disabled && footerAction.action) {
        setInteractiveTarget(this.notePanel.footerZone, () => this.controller.handleAction(footerAction.action));
      }
    }

    renderStateWindow(ui = {}) {
      this.commandPanel.container.setVisible(false);
      this.fightPanel.container.setVisible(false);
      this.partyPanel.container.setVisible(false);
      this.notePanel.container.setVisible(false);
      if (ui.mode === 'command') {
        this.renderCommandPanel(ui);
        return;
      }
      if (ui.mode === 'fight') {
        this.renderFightPanel(ui);
        return;
      }
      if (ui.mode === 'party') {
        this.renderPartyPanel(ui);
        return;
      }
      this.renderNotePanel(ui);
    }

    renderModel(model) {
      this.currentModel = model;
      if (!model) return;
      this.uiLanguage = model.language || 'ko';
      this.turnChip.setText(model.turnChip || `Turn ${model.turn || 0}`);
      this.bannerText.setText(model.bannerText || 'Battle');
      this.fieldStatusText.setText(model.fieldStatus || '');
      this.updatePerspectiveTabs(model);
      this.updateInfoBox(this.enemyInfo, model.enemyInfo || {});
      this.updateInfoBox(this.playerInfo, model.playerInfo || {});
      this.updateTray(this.enemyTray, model.enemyTray || []);
      this.updateTray(this.playerTray, model.playerTray || []);
      this.renderMessageWindow(model.message || {});
      this.renderStateWindow(model.stateWindow || {});
      this.setAbilityBar(model.abilityBar || null);
      renderAnimatedSpriteToHost(this.enemySprite.host, model.enemySprite || {}, 'large');
      renderAnimatedSpriteToHost(this.playerSprite.host, model.playerSprite || {}, 'large');
    }
  };
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
    this.rejectSceneReady = null;
    this.sceneBootTimer = null;
    this.bootError = null;
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
    this.bootError = null;
    if (this.sceneBootTimer) {
      clearTimeout(this.sceneBootTimer);
      this.sceneBootTimer = null;
    }
    if (typeof this.resolveSceneReady === 'function') {
      this.resolveSceneReady();
      this.resolveSceneReady = null;
      this.rejectSceneReady = null;
    }
    this.setStatus('', 'ready');
  }

  notifySceneError(error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error || 'Unknown Phaser battle renderer error'));
    this.bootError = normalizedError;
    if (this.sceneBootTimer) {
      clearTimeout(this.sceneBootTimer);
      this.sceneBootTimer = null;
    }
    this.setStatus(`Phaser battle renderer error: ${normalizedError.message}`, 'error');
    if (typeof this.rejectSceneReady === 'function') {
      this.rejectSceneReady(normalizedError);
      this.resolveSceneReady = null;
      this.rejectSceneReady = null;
    }
  }

  async ensureReady() {
    if (this.bootError) throw this.bootError;
    if (this.sceneReady && this.ready) return;
    if (!this.mount) throw new Error('Phaser battle mount element is missing.');
    if (!this.sceneReadyPromise) {
      this.sceneReadyPromise = new Promise((resolve, reject) => {
        this.resolveSceneReady = resolve;
        this.rejectSceneReady = reject;
      });
    }
    if (!this.ready) {
      this.setStatus('Loading Phaser battle renderer…', 'loading');
      const Phaser = await loadPhaserModule();
      const PhaserBattleScene = createPhaserBattleSceneClass(Phaser);
      const scene = new PhaserBattleScene(this);
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
      this.sceneBootTimer = setTimeout(() => {
        this.notifySceneError(new Error('Scene boot timed out before create() completed.'));
      }, 8000);
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
    this.rejectSceneReady = null;
    this.bootError = null;
    if (this.sceneBootTimer) {
      clearTimeout(this.sceneBootTimer);
      this.sceneBootTimer = null;
    }
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
