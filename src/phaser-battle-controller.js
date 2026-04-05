const PHASER_IMPORT_PATH = '../node_modules/phaser/dist/phaser.esm.js';

const UI_ASSETS = Object.freeze({
  bgAtlas: { key: 'pkb-ui-bg', json: './assets/pokerogue/ui/bg.json', path: './assets/pokerogue/ui/' },
  promptAtlas: { key: 'pkb-ui-prompt', json: './assets/pokerogue/ui/prompt.json', path: './assets/pokerogue/ui/' },
  typesAtlas: { key: 'pkb-ui-types', json: './assets/pokerogue/ui/misc/types.json', path: './assets/pokerogue/ui/misc/' },
  typesKoAtlas: { key: 'pkb-ui-types-ko', json: './assets/pokerogue/ui/misc/types_ko.json', path: './assets/pokerogue/ui/misc/' },
  categoriesAtlas: { key: 'pkb-ui-categories', json: './assets/pokerogue/ui/misc/categories.json', path: './assets/pokerogue/ui/misc/' },
  teraAtlas: { key: 'pkb-ui-button-tera', image: './assets/pokerogue/ui/button_tera.png', json: './assets/pokerogue/ui/button_tera.json' },
  trayAtlas: { key: 'pkb-ui-pb-tray-ball', image: './assets/pokerogue/ui/pb_tray_ball.png', json: './assets/pokerogue/ui/pb_tray_ball.json' },
  overlayHpAtlas: { key: 'pkb-ui-overlay-hp', image: './assets/pokerogue/ui/overlay_hp.png', json: './assets/pokerogue/ui/overlay_hp.json' },
  overlayMessage: { key: 'pkb-ui-overlay-message', url: './assets/pokerogue/ui/overlay_message.png' },
  overlayExp: { key: 'pkb-ui-overlay-exp', url: './assets/pokerogue/ui/overlay_exp.png' },
  window: { key: 'pkb-ui-window', url: './assets/pokerogue/ui/windows/window_1.png' },
  windowThin: { key: 'pkb-ui-window-thin', url: './assets/pokerogue/ui/windows/window_1_thin.png' },
  windowXthin: { key: 'pkb-ui-window-xthin', url: './assets/pokerogue/ui/windows/window_1_xthin.png' },
  cursor: { key: 'pkb-ui-cursor', url: './assets/pokerogue/ui/cursor.png' },
  cursorTera: { key: 'pkb-ui-cursor-tera', url: './assets/pokerogue/ui/cursor_tera.png' },
  pbinfoPlayer: { key: 'pkb-ui-pbinfo-player', url: './assets/pokerogue/ui/pbinfo_player.png' },
  pbinfoEnemy: { key: 'pkb-ui-pbinfo-enemy', url: './assets/pokerogue/ui/pbinfo_enemy_mini.png' },
  pbinfoPlayerType1: { key: 'pkb-ui-pbinfo-player-type1', image: './assets/pokerogue/ui/pbinfo_player_type1.png', json: './assets/pokerogue/ui/pbinfo_player_type1.json' },
  pbinfoPlayerType2: { key: 'pkb-ui-pbinfo-player-type2', image: './assets/pokerogue/ui/pbinfo_player_type2.png', json: './assets/pokerogue/ui/pbinfo_player_type2.json' },
  pbinfoPlayerType3: { key: 'pkb-ui-pbinfo-player-type3', image: './assets/pokerogue/ui/pbinfo_player_type.png', json: './assets/pokerogue/ui/pbinfo_player_type.json' },
  pbinfoEnemyType1: { key: 'pkb-ui-pbinfo-enemy-type1', image: './assets/pokerogue/ui/pbinfo_enemy_type1.png', json: './assets/pokerogue/ui/pbinfo_enemy_type1.json' },
  pbinfoEnemyType2: { key: 'pkb-ui-pbinfo-enemy-type2', image: './assets/pokerogue/ui/pbinfo_enemy_type2.png', json: './assets/pokerogue/ui/pbinfo_enemy_type2.json' },
  pbinfoEnemyType3: { key: 'pkb-ui-pbinfo-enemy-type3', image: './assets/pokerogue/ui/pbinfo_enemy_type.png', json: './assets/pokerogue/ui/pbinfo_enemy_type.json' },
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
    placeItems: 'end center',
    pointerEvents: 'none',
    userSelect: 'none',
    overflow: 'visible',
  });
}

function clearAnimatedSprite(host) {
  if (!host) return;
  const animator = host.__pkbAnimator;
  if (animator?.rafId) cancelAnimationFrame(animator.rafId);
  host.__pkbAnimator = null;
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
  ensureSpriteHostStyles(host);
  const url = spriteModel?.url || '';
  const key = `${size}::${url}`;
  if (!url) {
    if (host.__pkbAnimator?.key !== '__empty__') {
      clearAnimatedSprite(host);
      host.__pkbAnimator = { key: '__empty__' };
      host.textContent = '—';
      host.style.color = '#d8e7ff';
      host.style.font = '600 20px system-ui';
    }
    return;
  }
  if (host.__pkbAnimator?.key === key) return;
  const token = (Number(host.dataset.renderToken || '0') + 1).toString();
  host.dataset.renderToken = token;
  clearAnimatedSprite(host);
  try {
    const info = await inspectSpriteUrl(url);
    if (host.dataset.renderToken !== token) return;
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.imageRendering = 'pixelated';
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const animator = {
      key,
      info,
      canvas,
      ctx,
      frameIndex: 0,
      lastFrameAt: performance.now(),
      lastWidth: 0,
      lastHeight: 0,
      rafId: 0,
    };
    const draw = (timestamp) => {
      if (!host.isConnected || host.dataset.renderToken !== token || host.__pkbAnimator !== animator) return;
      const cssWidth = Math.max(32, Math.floor(host.clientWidth || 0));
      const cssHeight = Math.max(32, Math.floor(host.clientHeight || 0));
      if (cssWidth !== animator.lastWidth || cssHeight !== animator.lastHeight) {
        animator.lastWidth = cssWidth;
        animator.lastHeight = cssHeight;
        animator.canvas.width = cssWidth;
        animator.canvas.height = cssHeight;
      }
      if (timestamp - animator.lastFrameAt >= 120) {
        animator.frameIndex = (animator.frameIndex + 1) % animator.info.count;
        animator.lastFrameAt = timestamp;
      }
      const { frame, height, img } = animator.info;
      const scale = Math.min(animator.canvas.width / frame, animator.canvas.height / height);
      const drawWidth = Math.max(1, Math.floor(frame * scale));
      const drawHeight = Math.max(1, Math.floor(height * scale));
      const dx = Math.floor((animator.canvas.width - drawWidth) / 2);
      const dy = Math.floor(animator.canvas.height - drawHeight);
      animator.ctx.clearRect(0, 0, animator.canvas.width, animator.canvas.height);
      animator.ctx.drawImage(img, animator.frameIndex * frame, 0, frame, height, dx, dy, drawWidth, drawHeight);
      animator.rafId = requestAnimationFrame(draw);
    };
    host.__pkbAnimator = animator;
    host.appendChild(canvas);
    animator.rafId = requestAnimationFrame(draw);
  } catch (_error) {
    if (host.dataset.renderToken !== token) return;
    clearAnimatedSprite(host);
    host.__pkbAnimator = { key: '__missing__' };
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
  if (!textures.exists(UI_ASSETS.overlayHpAtlas.key)) load.atlas(UI_ASSETS.overlayHpAtlas.key, UI_ASSETS.overlayHpAtlas.image, UI_ASSETS.overlayHpAtlas.json);
  if (!textures.exists(UI_ASSETS.overlayMessage.key)) load.image(UI_ASSETS.overlayMessage.key, UI_ASSETS.overlayMessage.url);
  if (!textures.exists(UI_ASSETS.overlayExp.key)) load.image(UI_ASSETS.overlayExp.key, UI_ASSETS.overlayExp.url);
  if (!textures.exists(UI_ASSETS.window.key)) load.image(UI_ASSETS.window.key, UI_ASSETS.window.url);
  if (!textures.exists(UI_ASSETS.windowThin.key)) load.image(UI_ASSETS.windowThin.key, UI_ASSETS.windowThin.url);
  if (!textures.exists(UI_ASSETS.windowXthin.key)) load.image(UI_ASSETS.windowXthin.key, UI_ASSETS.windowXthin.url);
  if (!textures.exists(UI_ASSETS.cursor.key)) load.image(UI_ASSETS.cursor.key, UI_ASSETS.cursor.url);
  if (!textures.exists(UI_ASSETS.cursorTera.key)) load.image(UI_ASSETS.cursorTera.key, UI_ASSETS.cursorTera.url);
  if (!textures.exists(UI_ASSETS.pbinfoPlayer.key)) load.image(UI_ASSETS.pbinfoPlayer.key, UI_ASSETS.pbinfoPlayer.url);
  if (!textures.exists(UI_ASSETS.pbinfoEnemy.key)) load.image(UI_ASSETS.pbinfoEnemy.key, UI_ASSETS.pbinfoEnemy.url);
  if (!textures.exists(UI_ASSETS.pbinfoPlayerType1.key)) load.atlas(UI_ASSETS.pbinfoPlayerType1.key, UI_ASSETS.pbinfoPlayerType1.image, UI_ASSETS.pbinfoPlayerType1.json);
  if (!textures.exists(UI_ASSETS.pbinfoPlayerType2.key)) load.atlas(UI_ASSETS.pbinfoPlayerType2.key, UI_ASSETS.pbinfoPlayerType2.image, UI_ASSETS.pbinfoPlayerType2.json);
  if (!textures.exists(UI_ASSETS.pbinfoPlayerType3.key)) load.atlas(UI_ASSETS.pbinfoPlayerType3.key, UI_ASSETS.pbinfoPlayerType3.image, UI_ASSETS.pbinfoPlayerType3.json);
  if (!textures.exists(UI_ASSETS.pbinfoEnemyType1.key)) load.atlas(UI_ASSETS.pbinfoEnemyType1.key, UI_ASSETS.pbinfoEnemyType1.image, UI_ASSETS.pbinfoEnemyType1.json);
  if (!textures.exists(UI_ASSETS.pbinfoEnemyType2.key)) load.atlas(UI_ASSETS.pbinfoEnemyType2.key, UI_ASSETS.pbinfoEnemyType2.image, UI_ASSETS.pbinfoEnemyType2.json);
  if (!textures.exists(UI_ASSETS.pbinfoEnemyType3.key)) load.atlas(UI_ASSETS.pbinfoEnemyType3.key, UI_ASSETS.pbinfoEnemyType3.image, UI_ASSETS.pbinfoEnemyType3.json);
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

function applyHostBox(host, width, height) {
  if (!host) return;
  Object.assign(host.style, {
    width: `${Math.round(width)}px`,
    height: `${Math.round(height)}px`,
  });
}

function measureMountSize(mount) {
  if (!mount?.getBoundingClientRect) return { width: 1280, height: 720 };
  const rect = mount.getBoundingClientRect();
  return {
    width: Math.max(320, Math.round(rect.width || mount.clientWidth || 1280)),
    height: Math.max(240, Math.round(rect.height || mount.clientHeight || 720)),
  };
}

function createPhaserBattleSceneClass(Phaser) {
  return class PhaserBattleScene extends Phaser.Scene {
    constructor(controller) {
      super({ key: 'pkb-phaser-battle-scene' });
      this.controller = controller;
      this.Phaser = Phaser;
      this.sceneKey = 'pkb-phaser-battle-scene';
      this.isBootstrapped = false;
      this.layoutMetrics = null;
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
      dom.setOrigin(0.5, 1);
      return { host, dom };
    }

    createPerspectiveTabs() {
      const container = this.add.container(0, 0);
      const tabs = [0, 1].map(index => {
        const bg = this.add.nineslice(0, 0, UI_ASSETS.windowThin.key, undefined, 72, 22, 8, 8, 8, 8).setOrigin(0, 0);
        const label = this.add.text(36, 11, `P${index + 1}`, {
          fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
          fontSize: '9px',
          color: '#dbeafe',
          align: 'center',
        }).setOrigin(0.5, 0.5);
        const hit = this.add.rectangle(0, 0, 72, 22, 0xffffff, 0.001).setOrigin(0, 0);
        const button = this.add.container(index * 76, 0, [bg, label, hit]);
        setInteractiveTarget(hit, () => this.controller.handleAction({ type: 'perspective', player: index }));
        container.add(button);
        return { button, bg, label, hit };
      });
      return { container, tabs };
    }

    createBattleInfoBox(side) {
      const container = this.add.container(0, 0);
      const isPlayer = side === 'player';
      const textureKey = isPlayer ? UI_ASSETS.pbinfoPlayer.key : UI_ASSETS.pbinfoEnemy.key;
      const bg = this.add.image(0, 0, textureKey).setOrigin(1, 0.5);
      const name = this.add.text(isPlayer ? -115 : -124, isPlayer ? -15.2 : -11.2, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '9px',
        color: '#f8fbff',
      }).setOrigin(0, 0);
      const level = this.add.text(isPlayer ? -41 : -50, isPlayer ? -10 : -5, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '7px',
        color: '#dbeafe',
      }).setOrigin(0, 0.5);
      const status = this.add.text(isPlayer ? -12 : -12, isPlayer ? 9 : 10, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '6px',
        color: '#fbbf24',
      }).setOrigin(1, 0.5);
      const hpTrack = this.add.rectangle(isPlayer ? -61 : -71, isPlayer ? -1 : 4.5, 48, 2, 0x1f2937, 1).setOrigin(0, 0);
      const hpFill = this.add.image(hpTrack.x, hpTrack.y, UI_ASSETS.overlayHpAtlas.key, 'high').setOrigin(0, 0);
      const hpText = this.add.text(isPlayer ? -60 : -70, isPlayer ? 8 : 12, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: isPlayer ? '6px' : '6px',
        color: '#eff6ff',
      }).setOrigin(0, 0.5);
      const expBar = isPlayer ? this.add.image(-98, 18, UI_ASSETS.overlayExp.key).setOrigin(0, 0.5) : null;
      const expFill = isPlayer ? this.add.rectangle(-98, 18, 85, 2, 0x60a5fa, 1).setOrigin(0, 0.5) : null;
      const typeConfigs = isPlayer
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
      const typeIcons = typeConfigs.map(config => {
        const icon = this.add.image(config.x, config.y, config.key, 'unknown').setOrigin(0, 0);
        icon.setVisible(false);
        return icon;
      });
      container.add([bg, hpTrack, hpFill, ...(expBar ? [expBar, expFill] : []), name, level, status, hpText, ...typeIcons]);
      return { container, bg, name, level, status, hpTrack, hpFill, hpText, expBar, expFill, typeIcons, side, width: bg.width, height: bg.height };
    }

    createTray(side) {
      const container = this.add.container(0, 0);
      const isPlayer = side === 'player';
      const overlayKey = isPlayer ? UI_ASSETS.trayOverlayPlayer.key : UI_ASSETS.trayOverlayEnemy.key;
      const overlay = textureExists(this, overlayKey)
        ? this.add.image(0, 0, overlayKey).setOrigin(isPlayer ? 1 : 0, 0)
        : this.add.rectangle(0, 0, 104, 4, 0x0f172a, 0.64).setOrigin(isPlayer ? 1 : 0, 0);
      const startX = isPlayer ? -83 : 76;
      const step = isPlayer ? 10 : -10;
      const balls = Array.from({ length: 6 }, (_, index) => {
        const ball = textureExists(this, UI_ASSETS.trayAtlas.key, 'ball')
          ? this.add.image(startX + step * index, -8, UI_ASSETS.trayAtlas.key, 'ball').setOrigin(0, 0)
          : this.add.circle(startX + step * index, -8, 2, 0xe2e8f0, 0.85).setOrigin(0, 0);
        return ball;
      });
      container.add([overlay, ...balls]);
      return { container, overlay, balls, side };
    }

    createAbilityBar() {
      const container = this.add.container(0, 0);
      const bg = this.add.nineslice(0, 0, UI_ASSETS.windowThin.key, undefined, 118, 22, 8, 8, 8, 8).setOrigin(0, 0);
      const text = this.add.text(6, 4, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '7px',
        color: '#f8fbff',
        wordWrap: { width: 106, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      container.add([bg, text]);
      container.setVisible(false);
      return { container, bg, text };
    }

    createMessagePanel() {
      const container = this.add.container(0, 0);
      const bg = this.add.image(0, 0, UI_ASSETS.bgAtlas.key, '1').setOrigin(0, 1);
      const primary = this.add.text(12, -39, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '11px',
        color: '#f8fbff',
        lineSpacing: 2,
        wordWrap: { width: 178, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const secondary = this.add.text(12, -18, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '7px',
        color: '#cbd5e1',
        lineSpacing: 1,
        wordWrap: { width: 178, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const prompt = textureExists(this, UI_ASSETS.promptAtlas.key, '1')
        ? this.add.sprite(0, 0, UI_ASSETS.promptAtlas.key, '1').setOrigin(0, 0)
        : this.add.text(0, 0, '▾', { fontFamily: 'system-ui, sans-serif', fontSize: '10px', color: '#f8fbff' }).setOrigin(0, 0);
      prompt.setVisible(false);
      container.add([bg, primary, secondary, prompt]);
      return { container, bg, primary, secondary, prompt };
    }

    createCommandPanel() {
      const container = this.add.container(0, 0);
      const bg = this.add.nineslice(0, 0, UI_ASSETS.window.key, undefined, 118, 48, 8, 8, 8, 8).setOrigin(0, 1);
      const title = this.add.text(0, 0, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '8px',
        color: '#dbeafe',
      }).setVisible(false);
      const cursor = textureExists(this, UI_ASSETS.cursor.key)
        ? this.add.image(0, 0, UI_ASSETS.cursor.key).setOrigin(0, 0)
        : this.add.text(0, 0, '▶', { fontFamily: 'system-ui, sans-serif', fontSize: '8px', color: '#f8fbff' }).setOrigin(0, 0);
      const teraButton = textureExists(this, UI_ASSETS.teraAtlas.key, 'unknown')
        ? this.add.sprite(-32, 15, UI_ASSETS.teraAtlas.key, 'unknown').setOrigin(0.5, 0.5).setScale(1.3)
        : this.add.text(-32, 15, 'Tera', { fontFamily: 'system-ui, sans-serif', fontSize: '8px', color: '#f8fbff' }).setOrigin(0.5, 0.5);
      teraButton.setVisible(false);
      const entries = Array.from({ length: 4 }, (_, index) => {
        const label = this.add.text(index % 2 === 0 ? 0 : 55.8, index < 2 ? -38 : -22, '', {
          fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
          fontSize: '10px',
          color: '#f8fbff',
        }).setOrigin(0, 0);
        const zone = this.add.rectangle(label.x - 6, label.y - 2, 52, 14, 0xffffff, 0.001).setOrigin(0, 0);
        return { label, zone };
      });
      container.add([bg, title, cursor, teraButton, ...entries.flatMap(entry => [entry.zone, entry.label])]);
      return { container, bg, title, cursor, teraButton, entries };
    }

    createFightPanel() {
      const container = this.add.container(0, 0);
      const movesBg = this.add.nineslice(0, 0, UI_ASSETS.window.key, undefined, 243, 48, 8, 8, 8, 8).setOrigin(0, 1);
      const detailBg = this.add.nineslice(240, 0, UI_ASSETS.window.key, undefined, 80, 48, 8, 8, 8, 8).setOrigin(0, 1);
      const title = this.add.text(0, 0, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '8px',
        color: '#dbeafe',
      }).setVisible(false);
      const cursor = textureExists(this, UI_ASSETS.cursor.key)
        ? this.add.image(0, 0, UI_ASSETS.cursor.key).setOrigin(0, 0)
        : this.add.text(0, 0, '▶', { fontFamily: 'system-ui, sans-serif', fontSize: '8px', color: '#f8fbff' }).setOrigin(0, 0);
      const moves = Array.from({ length: 4 }, (_, moveIndex) => {
        const label = this.add.text(moveIndex % 2 === 0 ? 0 : 114, moveIndex < 2 ? -39 : -23, '', {
          fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
          fontSize: '9px',
          color: '#f8fbff',
          wordWrap: { width: 102, useAdvancedWrap: true },
        }).setOrigin(0, 0);
        const zone = this.add.rectangle(label.x - 6, label.y - 2, 110, 14, 0xffffff, 0.001).setOrigin(0, 0);
        return { label, zone };
      });
      const detailName = this.add.text(247, -40, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '8px',
        color: '#f8fbff',
        wordWrap: { width: 46, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const typeIcon = textureExists(this, UI_ASSETS.typesAtlas.key, 'unknown')
        ? this.add.image(263, -38, UI_ASSETS.typesAtlas.key, 'unknown').setOrigin(0, 0).setScale(0.55)
        : this.add.text(263, -38, '', { fontFamily: 'system-ui, sans-serif', fontSize: '7px', color: '#cbd5e1' }).setOrigin(0, 0);
      const categoryIcon = textureExists(this, UI_ASSETS.categoriesAtlas.key, 'status')
        ? this.add.image(289, -38, UI_ASSETS.categoriesAtlas.key, 'status').setOrigin(0, 0).setScale(0.55)
        : this.add.text(289, -38, '', { fontFamily: 'system-ui, sans-serif', fontSize: '7px', color: '#cbd5e1' }).setOrigin(0, 0);
      const ppText = this.add.text(247, -26, '', { fontFamily: 'system-ui, sans-serif', fontSize: '6px', color: '#dbeafe' }).setOrigin(0, 0);
      const powerText = this.add.text(247, -18, '', { fontFamily: 'system-ui, sans-serif', fontSize: '6px', color: '#dbeafe' }).setOrigin(0, 0);
      const accuracyText = this.add.text(247, -10, '', { fontFamily: 'system-ui, sans-serif', fontSize: '6px', color: '#dbeafe' }).setOrigin(0, 0);
      const description = this.add.text(247, -2, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '6px',
        color: '#cbd5e1',
        wordWrap: { width: 66, useAdvancedWrap: true },
      }).setOrigin(0, 1);
      const toggles = Array.from({ length: 5 }, () => {
        const bg = this.add.nineslice(0, 0, UI_ASSETS.windowXthin.key, undefined, 30, 12, 8, 8, 8, 8).setOrigin(0, 0);
        const label = this.add.text(15, 6, '', {
          fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
          fontSize: '6px',
          color: '#f8fbff',
          align: 'center',
        }).setOrigin(0.5, 0.5);
        const icon = textureExists(this, UI_ASSETS.teraAtlas.key, 'unknown')
          ? this.add.sprite(0, 0, UI_ASSETS.teraAtlas.key, 'unknown').setOrigin(0.5, 0.5).setScale(0.45)
          : null;
        const hit = this.add.rectangle(0, 0, 30, 12, 0xffffff, 0.001).setOrigin(0, 0);
        const button = this.add.container(0, 0, icon ? [bg, icon, label, hit] : [bg, label, hit]);
        button.setVisible(false);
        return { button, bg, label, icon, hit };
      });
      const footerActions = Array.from({ length: 2 }, () => {
        const bg = this.add.nineslice(0, 0, UI_ASSETS.windowXthin.key, undefined, 40, 12, 8, 8, 8, 8).setOrigin(0, 0);
        const label = this.add.text(20, 6, '', {
          fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
          fontSize: '6px',
          color: '#f8fbff',
          align: 'center',
        }).setOrigin(0.5, 0.5);
        const hit = this.add.rectangle(0, 0, 40, 12, 0xffffff, 0.001).setOrigin(0, 0);
        return { bg, label, hit };
      });
      container.add([movesBg, detailBg, title, cursor, ...moves.flatMap(entry => [entry.zone, entry.label]), detailName, typeIcon, categoryIcon, ppText, powerText, accuracyText, description, ...toggles.map(entry => entry.button), ...footerActions.flatMap(entry => [entry.bg, entry.label, entry.hit])]);
      return { container, movesBg, detailBg, title, cursor, moves, detailName, typeIcon, categoryIcon, ppText, powerText, accuracyText, description, toggles, footerActions };
    }

    createPartyPanel() {
      const container = this.add.container(0, 0);
      const bg = this.add.nineslice(0, 0, UI_ASSETS.window.key, undefined, 160, 104, 8, 8, 8, 8).setOrigin(0, 1);
      const title = this.add.text(8, -96, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '8px',
        color: '#dbeafe',
      }).setOrigin(0, 0);
      const subtitle = this.add.text(8, -86, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '6px',
        color: '#bfdbfe',
        wordWrap: { width: 144, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const cursor = textureExists(this, UI_ASSETS.cursor.key)
        ? this.add.image(0, 0, UI_ASSETS.cursor.key).setOrigin(0, 0)
        : this.add.text(0, 0, '▶', { fontFamily: 'system-ui, sans-serif', fontSize: '8px', color: '#f8fbff' }).setOrigin(0, 0);
      const entries = Array.from({ length: 6 }, (_, index) => {
        const rowBg = this.add.nineslice(0, 0, UI_ASSETS.windowXthin.key, undefined, 144, 12, 8, 8, 8, 8).setOrigin(0, 0);
        const label = this.add.text(6, 2, '', {
          fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
          fontSize: '7px',
          color: '#f8fbff',
        }).setOrigin(0, 0);
        const sublabel = this.add.text(72, 2, '', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '5px',
          color: '#cbd5e1',
        }).setOrigin(0, 0);
        const hit = this.add.rectangle(0, 0, 144, 12, 0xffffff, 0.001).setOrigin(0, 0);
        const row = this.add.container(0, 0, [rowBg, label, sublabel, hit]);
        return { row, rowBg, label, sublabel, hit };
      });
      const footer = this.add.text(8, -12, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '6px',
        color: '#dbeafe',
      }).setOrigin(0, 0);
      const footerZone = this.add.rectangle(8, -14, 44, 10, 0xffffff, 0.001).setOrigin(0, 0);
      container.add([bg, title, subtitle, cursor, ...entries.map(entry => entry.row), footer, footerZone]);
      return { container, bg, title, subtitle, cursor, entries, footer, footerZone };
    }

    createNotePanel() {
      const container = this.add.container(0, 0);
      const bg = this.add.nineslice(0, 0, UI_ASSETS.window.key, undefined, 118, 48, 8, 8, 8, 8).setOrigin(0, 1);
      const title = this.add.text(8, -42, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '8px',
        color: '#dbeafe',
      }).setOrigin(0, 0);
      const body = this.add.text(8, -31, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '6px',
        color: '#cbd5e1',
        wordWrap: { width: 102, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const footer = this.add.text(8, -10, '', {
        fontFamily: 'emerald, pkmnems, system-ui, sans-serif',
        fontSize: '6px',
        color: '#dbeafe',
      }).setOrigin(0, 0);
      const footerZone = this.add.rectangle(8, -12, 40, 10, 0xffffff, 0.001).setOrigin(0, 0);
      container.add([bg, title, body, footer, footerZone]);
      return { container, bg, title, body, footer, footerZone };
    }

    layout() {
      if (!this.isBootstrapped) return;
      const width = this.scale.width;
      const height = this.scale.height;
      const baseWidth = 320;
      const baseHeight = 240;
      const stageScale = Math.max(1.5, Math.min(width / baseWidth, height / baseHeight));
      const originX = (width - baseWidth * stageScale) / 2;
      const originY = (height - baseHeight * stageScale) / 2;
      const toScreen = (x, y) => ({ x: originX + x * stageScale, y: originY + y * stageScale });
      const activeMode = this.currentModel?.stateWindow?.mode || 'message';

      this.layoutMetrics = { width, height, stageScale, originX, originY, toScreen };

      this.background.clear();
      this.background.fillGradientStyle(0x06111f, 0x06111f, 0x10213d, 0x081425, 1);
      this.background.fillRect(0, 0, width, height);
      this.background.fillStyle(0x17324d, 0.34);
      const enemyPlat = toScreen(236, 88);
      const playerPlat = toScreen(106, 153);
      this.background.fillEllipse(enemyPlat.x, enemyPlat.y, 52 * stageScale, 14 * stageScale);
      this.background.fillStyle(0x17324d, 0.44);
      this.background.fillEllipse(playerPlat.x, playerPlat.y, 84 * stageScale, 18 * stageScale);

      this.overlay.clear();
      this.overlay.lineStyle(2, 0xffffff, 0.05);
      this.overlay.strokeRoundedRect(originX, originY, baseWidth * stageScale, baseHeight * stageScale, 18);

      const turnPos = toScreen(3, 18);
      this.turnChip.setPosition(turnPos.x, turnPos.y);
      this.turnChip.setScale(stageScale * 0.22);
      const bannerPos = toScreen(160, 18);
      this.bannerText.setPosition(bannerPos.x, bannerPos.y);
      this.bannerText.setScale(stageScale * 0.2);
      const fieldPos = toScreen(160, 30);
      this.fieldStatusText.setPosition(fieldPos.x, fieldPos.y);
      this.fieldStatusText.setScale(stageScale * 0.18);
      this.fieldStatusText.setWordWrapWidth(140 * stageScale, true);

      const tabsPos = toScreen(124, 38);
      this.perspectiveTabs.container.setPosition(tabsPos.x, tabsPos.y);
      this.perspectiveTabs.container.setScale(stageScale);

      const enemyTrayPos = toScreen(0, 96);
      this.enemyTray.container.setPosition(enemyTrayPos.x, enemyTrayPos.y);
      this.enemyTray.container.setScale(stageScale);
      const playerTrayPos = toScreen(320, 168);
      this.playerTray.container.setPosition(playerTrayPos.x, playerTrayPos.y);
      this.playerTray.container.setScale(stageScale);

      const enemyInfoPos = toScreen(140, 99);
      this.enemyInfo.container.setPosition(enemyInfoPos.x, enemyInfoPos.y);
      this.enemyInfo.container.setScale(stageScale);
      const playerInfoPos = toScreen(310, 168);
      this.playerInfo.container.setPosition(playerInfoPos.x, playerInfoPos.y);
      this.playerInfo.container.setScale(stageScale);

      const enemySpritePos = toScreen(236, 84);
      this.enemySprite.dom.setPosition(enemySpritePos.x, enemySpritePos.y);
      const playerSpritePos = toScreen(106, 148);
      this.playerSprite.dom.setPosition(playerSpritePos.x, playerSpritePos.y);
      applyHostBox(this.enemySprite.host, 84 * stageScale, 84 * stageScale);
      applyHostBox(this.playerSprite.host, 104 * stageScale, 104 * stageScale);

      const msgPos = toScreen(0, 240);
      this.messagePanel.container.setPosition(msgPos.x, msgPos.y);
      this.messagePanel.container.setScale(stageScale);

      const commandPos = toScreen(202, 240);
      this.commandPanel.container.setPosition(commandPos.x, commandPos.y);
      this.commandPanel.container.setScale(stageScale);
      const fightPos = toScreen(18, 240);
      this.fightPanel.container.setPosition(fightPos.x, fightPos.y);
      this.fightPanel.container.setScale(stageScale);

      const partyPos = toScreen(160, 240);
      this.partyPanel.container.setPosition(partyPos.x - 80 * stageScale, partyPos.y);
      this.partyPanel.container.setScale(stageScale);
      const notePos = toScreen(202, 240);
      this.notePanel.container.setPosition(notePos.x, notePos.y);
      this.notePanel.container.setScale(stageScale);

      if (this.currentModel) this.renderModel(this.currentModel);
    }

    updatePerspectiveTabs(model) {
      const tabs = model?.perspectiveOptions || [];
      this.perspectiveTabs.tabs.forEach((tab, index) => {
        const option = tabs[index] || { label: `P${index + 1}`, active: false };
        tab.label.setText(option.label || `P${index + 1}`);
        tab.label.setColor(option.active ? '#f8fbff' : '#dbeafe');
        tab.bg.setAlpha(option.active ? 1 : 0.82);
        if (tab.bg.setTint) {
          if (option.active) tab.bg.clearTint();
          else tab.bg.setTint(0xb7c0d6);
        }
      });
    }

    updateInfoBox(target, info = {}) {
      const hpPercent = clamp(Number(info.hpPercent || 0), 0, 100);
      const hpFrame = hpPercent > 50 ? 'high' : hpPercent > 20 ? 'medium' : 'low';
      target.name.setText(info.displayName || '—');
      target.level.setText(info.levelLabel || '');
      target.status.setText(info.statusLabel || '');
      target.hpText.setText(info.hpLabel || '');
      if (target.hpFill.setTexture && textureExists(this, UI_ASSETS.overlayHpAtlas.key, hpFrame)) {
        target.hpFill.setTexture(UI_ASSETS.overlayHpAtlas.key, hpFrame);
      }
      target.hpFill.displayWidth = Math.max(0, 48 * (hpPercent / 100));
      target.hpFill.displayHeight = 2;
      if (target.expFill) {
        target.expFill.width = Math.max(0, 85 * (clamp(Number(info.expPercent || 0), 0, 100) / 100));
      }
      const typeTextureKeys = target.side === 'player'
        ? [UI_ASSETS.pbinfoPlayerType1.key, UI_ASSETS.pbinfoPlayerType2.key, UI_ASSETS.pbinfoPlayerType3.key]
        : [UI_ASSETS.pbinfoEnemyType1.key, UI_ASSETS.pbinfoEnemyType2.key, UI_ASSETS.pbinfoEnemyType3.key];
      target.typeIcons.forEach((icon, index) => {
        const typeId = String(info.types?.[index] || '').toLowerCase();
        const textureKey = typeTextureKeys[index] || typeTextureKeys[0];
        if (textureExists(this, textureKey, typeId)) {
          icon.setTexture(textureKey, typeId);
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
          if (entry.state === 'active' && ball.setTintFill) ball.setTintFill(0x9bd6ff);
          else if (ball.clearTint) ball.clearTint();
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
      const { stageScale = 1, toScreen = (x, y) => ({ x, y }) } = this.layoutMetrics || {};
      this.abilityBar.text.setText(model.text);
      this.abilityBar.bg.setSize(clamp(this.abilityBar.text.width + 12, 118, 170), 22);
      const logicalX = model.side === 'enemy' ? 202 : 0;
      const logicalY = model.side === 'enemy' ? 60 : 124;
      const pos = toScreen(logicalX, logicalY);
      this.abilityBar.container.setPosition(pos.x, pos.y);
      this.abilityBar.container.setScale(stageScale);
      this.abilityBar.container.setVisible(true);
    }

    renderMessageWindow(message = {}) {
      this.messagePanel.primary.setWordWrapWidth(178, true);
      this.messagePanel.secondary.setWordWrapWidth(178, true);
      this.messagePanel.primary.setText(message.primary || '—');
      if (message.secondary) {
        this.messagePanel.secondary.setText(message.secondary);
        this.messagePanel.secondary.setVisible(true);
        this.messagePanel.secondary.setPosition(12, -18);
      } else {
        this.messagePanel.secondary.setText('');
        this.messagePanel.secondary.setVisible(false);
      }
      const promptVisible = Boolean(message.showPrompt);
      this.messagePanel.prompt.setVisible(promptVisible);
      if (promptVisible) {
        this.messagePanel.prompt.setPosition(304, -14);
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
        { x: 0, y: -38 },
        { x: 55.8, y: -38 },
        { x: 0, y: -22 },
        { x: 55.8, y: -22 },
      ];
      let cursorPos = positions[0];
      (ui.commands || []).slice(0, 4).forEach((command, index) => {
        const entry = this.commandPanel.entries[index];
        const pos = positions[index];
        entry.label.setPosition(pos.x, pos.y);
        entry.label.setText(command.label || '');
        entry.label.setAlpha(command.disabled ? 0.42 : 1);
        entry.label.setColor(command.disabled ? '#64748b' : '#f8fbff');
        entry.zone.setPosition(pos.x - 6, pos.y - 2);
        entry.zone.width = 52;
        entry.zone.height = 14;
        entry.zone.removeAllListeners();
        if (!command.disabled && command.action) {
          setInteractiveTarget(entry.zone, () => this.controller.handleAction(command.action));
        }
        if (command.active) cursorPos = pos;
      });
      this.commandPanel.cursor.setPosition(cursorPos.x - 5, cursorPos.y + 8);
      const tera = ui.teraToggle;
      if (tera) {
        this.commandPanel.teraButton.setVisible(true);
        if (this.commandPanel.teraButton.setFrame && textureExists(this, UI_ASSETS.teraAtlas.key, tera.type || 'unknown')) {
          this.commandPanel.teraButton.setTexture(UI_ASSETS.teraAtlas.key, tera.type || 'unknown');
        }
        this.commandPanel.teraButton.setAlpha(tera.disabled ? 0.45 : 1);
        this.commandPanel.teraButton.setScale(tera.active ? 1.45 : 1.3);
        this.commandPanel.teraButton.x = -32;
        this.commandPanel.teraButton.y = -15;
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
        { x: 0, y: -39 },
        { x: 114, y: -39 },
        { x: 0, y: -23 },
        { x: 114, y: -23 },
      ];
      let cursorPos = positions[0];
      (ui.moves || []).slice(0, 4).forEach((move, index) => {
        const entry = this.fightPanel.moves[index];
        const pos = positions[index];
        entry.label.setPosition(pos.x, pos.y);
        entry.label.setText(move.label || '');
        entry.label.setAlpha(move.disabled ? 0.42 : 1);
        entry.label.setColor(move.disabled ? '#64748b' : '#f8fbff');
        entry.zone.setPosition(pos.x - 6, pos.y - 2);
        entry.zone.width = 110;
        entry.zone.height = 14;
        entry.zone.removeAllListeners();
        if (!move.disabled) {
          const hoverAction = move.focusAction ? () => this.controller.handleAction(move.focusAction) : null;
          setInteractiveTarget(entry.zone, move.action ? () => this.controller.handleAction(move.action) : null, hoverAction);
        }
        if (move.focused || move.active) cursorPos = pos;
      });
      this.fightPanel.cursor.setPosition(cursorPos.x + 13, cursorPos.y + 8);
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
      this.fightPanel.powerText.setText(`Pow ${detail.powerLabel || '—'}`);
      this.fightPanel.accuracyText.setText(`Acc ${detail.accuracyLabel || '—'}`);
      this.fightPanel.description.setText(detail.description || '');

      (ui.toggles || []).slice(0, this.fightPanel.toggles.length).forEach((toggle, index) => {
        const entry = this.fightPanel.toggles[index];
        entry.button.setVisible(true);
        entry.button.setPosition(246 + index * 31, -13);
        entry.bg.setAlpha(toggle.disabled ? 0.45 : 1);
        entry.label.setText(toggle.label || '');
        entry.label.setColor(toggle.disabled ? '#64748b' : '#f8fbff');
        if (entry.icon) {
          entry.icon.setVisible(toggle.kind === 'tera');
          if (toggle.kind === 'tera' && textureExists(this, UI_ASSETS.teraAtlas.key, toggle.type || 'unknown')) {
            entry.icon.setTexture(UI_ASSETS.teraAtlas.key, toggle.type || 'unknown');
            entry.icon.setPosition(6, 6);
            entry.label.setPosition(15, 6);
          } else {
            entry.icon.setVisible(false);
            entry.label.setPosition(15, 6);
          }
        }
        entry.hit.removeAllListeners();
        if (!toggle.disabled && toggle.action) {
          setInteractiveTarget(entry.hit, () => this.controller.handleAction(toggle.action));
        }
      });
      this.fightPanel.toggles.slice((ui.toggles || []).length).forEach(entry => entry.button.setVisible(false));

      (ui.footerActions || []).slice(0, this.fightPanel.footerActions.length).forEach((action, index) => {
        const entry = this.fightPanel.footerActions[index];
        entry.bg.setPosition(247 + index * 41, -48);
        entry.label.setPosition(247 + index * 41 + 20, -42);
        entry.label.setText(action.label || '');
        entry.label.setColor(action.disabled ? '#64748b' : '#f8fbff');
        entry.bg.setAlpha(action.disabled ? 0.42 : 1);
        entry.hit.setPosition(247 + index * 41, -48);
        entry.hit.removeAllListeners();
        if (!action.disabled && action.action) {
          setInteractiveTarget(entry.hit, () => this.controller.handleAction(action.action));
        }
      });
    }

    renderPartyPanel(ui = {}) {
      this.partyPanel.container.setVisible(true);
      this.partyPanel.title.setText(ui.title || 'Switch');
      this.partyPanel.subtitle.setText(ui.subtitle || '');
      let cursorY = -68;
      (ui.partyOptions || []).slice(0, this.partyPanel.entries.length).forEach((option, index) => {
        const entry = this.partyPanel.entries[index];
        entry.row.setVisible(true);
        entry.row.setPosition(8, -74 + index * 13);
        entry.label.setText(option.label || '');
        entry.sublabel.setText(option.sublabel || '');
        entry.rowBg.setAlpha(option.disabled ? 0.4 : 1);
        entry.rowBg.removeAllListeners?.();
        entry.hit.removeAllListeners();
        if (!option.disabled && option.action) {
          setInteractiveTarget(entry.hit, () => this.controller.handleAction(option.action));
        }
        if (option.active) cursorY = -72 + index * 13;
      });
      this.partyPanel.entries.slice((ui.partyOptions || []).length).forEach(entry => entry.row.setVisible(false));
      this.partyPanel.cursor.setPosition(10, cursorY);
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
    this.resizeObserver = null;
    this.resizeRaf = 0;
    this.lastMountSize = { width: 0, height: 0 };
  }

  observeMount() {
    if (!this.mount || typeof ResizeObserver === 'undefined' || this.resizeObserver) return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
      this.resizeRaf = requestAnimationFrame(() => {
        this.resizeRaf = 0;
        if (!this.game || !this.mount?.isConnected) return;
        const nextSize = measureMountSize(this.mount);
        if (nextSize.width === this.lastMountSize.width && nextSize.height === this.lastMountSize.height) return;
        this.lastMountSize = nextSize;
        try {
          this.game.scale?.refresh?.();
          this.scene?.layoutSafely?.();
        } catch (_error) {
          // no-op
        }
      });
    });
    this.resizeObserver.observe(this.mount);
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
      const mountSize = measureMountSize(this.mount);
      this.scene = scene;
      this.lastMountSize = mountSize;
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
      this.observeMount();
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
    if (this.resizeRaf) {
      cancelAnimationFrame(this.resizeRaf);
      this.resizeRaf = 0;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.lastMountSize = { width: 0, height: 0 };
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
