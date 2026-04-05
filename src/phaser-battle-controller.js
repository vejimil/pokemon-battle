const PHASER_IMPORT_PATH = '../node_modules/phaser/dist/phaser.esm.js';

const LOGICAL_WIDTH = 320;
const LOGICAL_HEIGHT = 240;
const FIELD_HEIGHT = 192;
const ACTIVE_ARENA = Object.freeze({
  bg: 'grass_bg',
  enemy: 'grass_b',
  player: 'grass_a',
});
const ARENA_BASE_Y = 60;
const ARENA_OFFSETS = Object.freeze({
  enemy: { x: -47, y: ARENA_BASE_Y },
  player: { x: 50, y: ARENA_BASE_Y },
});
const ARENA_PLATFORM_CENTERS = Object.freeze({
  enemy: { x: 216, y: 132 },
  player: { x: 104, y: 184 },
});

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
  menuSel: { key: 'pkb-ui-menu-sel', url: './assets/pokerogue/ui/bmenu_sel.png' },
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
  partyBg: { key: 'pkb-ui-party-bg', url: './assets/pokerogue/ui/party_bg.png' },
  partyCancelAtlas: { key: 'pkb-ui-party-cancel', image: './assets/pokerogue/ui/party_cancel.png', json: './assets/pokerogue/ui/party_cancel.json' },
  partySlotAtlas: { key: 'pkb-ui-party-slot', image: './assets/pokerogue/ui/party_slot.png', json: './assets/pokerogue/ui/party_slot.json' },
  partySlotMainAtlas: { key: 'pkb-ui-party-slot-main', image: './assets/pokerogue/ui/party_slot_main.png', json: './assets/pokerogue/ui/party_slot_main.json' },
  partyPbAtlas: { key: 'pkb-ui-party-pb', image: './assets/pokerogue/ui/party_pb.png', json: './assets/pokerogue/ui/party_pb.json' },
  partySlotHpOverlayAtlas: { key: 'pkb-ui-party-slot-hp-overlay', image: './assets/pokerogue/ui/party_slot_hp_overlay.png', json: './assets/pokerogue/ui/party_slot_hp_overlay.json' },
  partySlotHpBar: { key: 'pkb-ui-party-slot-hp-bar', url: './assets/pokerogue/ui/party_slot_hp_bar.png' },
  abilityBarLeft: { key: 'pkb-ui-ability-bar-left', url: './assets/pokerogue/ui/ability_bar_left.png' },
  abilityBarRight: { key: 'pkb-ui-ability-bar-right', url: './assets/pokerogue/ui/ability_bar_right.png' },
  arenaBg: { key: 'pkb-arena-bg', url: './assets/pokerogue/arenas/grass_bg.png' },
  arenaEnemy: { key: 'pkb-arena-enemy', url: './assets/pokerogue/arenas/grass_b.png' },
  arenaEnemyProp1: { key: 'pkb-arena-enemy-prop1', url: './assets/pokerogue/arenas/grass_b_1.png' },
  arenaEnemyProp2: { key: 'pkb-arena-enemy-prop2', url: './assets/pokerogue/arenas/grass_b_2.png' },
  arenaEnemyProp3: { key: 'pkb-arena-enemy-prop3', url: './assets/pokerogue/arenas/grass_b_3.png' },
  arenaPlayer: { key: 'pkb-arena-player', url: './assets/pokerogue/arenas/grass_a.png' },
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

function ensureSpriteHostStyles(host) {
  Object.assign(host.style, {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'end center',
    pointerEvents: 'none',
    userSelect: 'none',
    overflow: 'visible',
    imageRendering: 'pixelated',
  });
}

function clearAnimatedSprite(host) {
  if (!host) return;
  const animator = host.__pkbAnimator;
  if (animator?.rafId) cancelAnimationFrame(animator.rafId);
  host.__pkbAnimator = null;
  host.innerHTML = '';
}

function setHostVisibility(host, visible = true) {
  if (!host?.style) return;
  host.style.visibility = visible ? 'visible' : 'hidden';
  host.style.opacity = visible ? '1' : '0';
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
  const deferred = Boolean(spriteModel?.deferred || spriteModel?.hidden);
  const url = deferred ? '' : (spriteModel?.url || '');
  const key = `${size}::${url}`;
  if (!url) {
    clearAnimatedSprite(host);
    host.__pkbAnimator = { key: '__empty__' };
    setHostVisibility(host, false);
    return;
  }
  setHostVisibility(host, true);
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
      const cssWidth = Math.max(24, Math.floor(host.clientWidth || 0));
      const cssHeight = Math.max(24, Math.floor(host.clientHeight || 0));
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const frameSize = animator.info.frame;
      const sx = animator.frameIndex * frameSize;
      const scale = Math.min(canvas.width / frameSize, canvas.height / frameSize);
      const dw = Math.max(1, Math.floor(frameSize * scale));
      const dh = Math.max(1, Math.floor(frameSize * scale));
      const dx = Math.floor((canvas.width - dw) / 2);
      const dy = Math.max(0, canvas.height - dh);
      ctx.drawImage(animator.info.img, sx, 0, frameSize, frameSize, dx, dy, dw, dh);
      animator.rafId = requestAnimationFrame(draw);
    };
    host.appendChild(canvas);
    host.__pkbAnimator = animator;
    animator.rafId = requestAnimationFrame(draw);
  } catch (_error) {
    clearAnimatedSprite(host);
    host.__pkbAnimator = { key: '__error__' };
    setHostVisibility(host, false);
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
  if (!textures.exists(UI_ASSETS.menuSel.key)) load.image(UI_ASSETS.menuSel.key, UI_ASSETS.menuSel.url);
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
  if (!textures.exists(UI_ASSETS.partyBg.key)) load.image(UI_ASSETS.partyBg.key, UI_ASSETS.partyBg.url);
  if (!textures.exists(UI_ASSETS.partyCancelAtlas.key)) load.atlas(UI_ASSETS.partyCancelAtlas.key, UI_ASSETS.partyCancelAtlas.image, UI_ASSETS.partyCancelAtlas.json);
  if (!textures.exists(UI_ASSETS.partySlotAtlas.key)) load.atlas(UI_ASSETS.partySlotAtlas.key, UI_ASSETS.partySlotAtlas.image, UI_ASSETS.partySlotAtlas.json);
  if (!textures.exists(UI_ASSETS.partySlotMainAtlas.key)) load.atlas(UI_ASSETS.partySlotMainAtlas.key, UI_ASSETS.partySlotMainAtlas.image, UI_ASSETS.partySlotMainAtlas.json);
  if (!textures.exists(UI_ASSETS.partyPbAtlas.key)) load.atlas(UI_ASSETS.partyPbAtlas.key, UI_ASSETS.partyPbAtlas.image, UI_ASSETS.partyPbAtlas.json);
  if (!textures.exists(UI_ASSETS.partySlotHpOverlayAtlas.key)) load.atlas(UI_ASSETS.partySlotHpOverlayAtlas.key, UI_ASSETS.partySlotHpOverlayAtlas.image, UI_ASSETS.partySlotHpOverlayAtlas.json);
  if (!textures.exists(UI_ASSETS.partySlotHpBar.key)) load.image(UI_ASSETS.partySlotHpBar.key, UI_ASSETS.partySlotHpBar.url);
  if (!textures.exists(UI_ASSETS.abilityBarLeft.key)) load.image(UI_ASSETS.abilityBarLeft.key, UI_ASSETS.abilityBarLeft.url);
  if (!textures.exists(UI_ASSETS.abilityBarRight.key)) load.image(UI_ASSETS.abilityBarRight.key, UI_ASSETS.abilityBarRight.url);
  if (!textures.exists(UI_ASSETS.arenaBg.key)) load.image(UI_ASSETS.arenaBg.key, UI_ASSETS.arenaBg.url);
  if (!textures.exists(UI_ASSETS.arenaEnemy.key)) load.image(UI_ASSETS.arenaEnemy.key, UI_ASSETS.arenaEnemy.url);
  if (!textures.exists(UI_ASSETS.arenaPlayer.key)) load.image(UI_ASSETS.arenaPlayer.key, UI_ASSETS.arenaPlayer.url);
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

function applyHostBox(host, width, height) {
  if (!host) return;
  Object.assign(host.style, {
    width: `${Math.round(width)}px`,
    height: `${Math.round(height)}px`,
  });
}

function measureMountSize(mount) {
  if (!mount?.getBoundingClientRect) return { width: 960, height: 720 };
  const rect = mount.getBoundingClientRect();
  return {
    width: Math.max(320, Math.round(rect.width || mount.clientWidth || 960)),
    height: Math.max(240, Math.round(rect.height || mount.clientHeight || 720)),
  };
}

function createBaseText(scene, x, y, text = '', fontSize = 8, color = '#f8fbff', options = {}) {
  const t = scene.add.text(x, y, text, {
    fontFamily: 'emerald, pkmnems, monospace',
    fontSize: `${fontSize}px`,
    color,
    resolution: 3,
    ...options,
  });
  t.setRoundPixels?.(true);
  return t;
}

function setHorizontalCrop(gameObject, width) {
  const nextWidth = Math.max(0, Math.floor(width));
  if (gameObject.setCrop) {
    gameObject.setCrop(0, 0, nextWidth, gameObject.height || gameObject.displayHeight || 0);
  }
}

function createPhaserBattleSceneClass(Phaser) {
  return class PhaserBattleScene extends Phaser.Scene {
    constructor(controller) {
      super({ key: 'pkb-phaser-battle-scene' });
      this.controller = controller;
      this.Phaser = Phaser;
      this.sceneKey = 'pkb-phaser-battle-scene';
      this.isBootstrapped = false;
      this.currentModel = null;
      this.uiLanguage = 'ko';
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
        this.cameras.main.setRoundPixels(true);
        if (this.game?.canvas) {
          this.game.canvas.style.imageRendering = 'pixelated';
        }

        this.createArenaLayers();

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

        if (textureExists(this, UI_ASSETS.promptAtlas.key, '1') && !this.anims.exists('pkb-ui-prompt-arrow')) {
          this.anims.create({
            key: 'pkb-ui-prompt-arrow',
            frames: ['1', '2', '3', '4']
              .filter(frame => textureExists(this, UI_ASSETS.promptAtlas.key, frame))
              .map(frame => ({ key: UI_ASSETS.promptAtlas.key, frame })),
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

    createArenaLayers() {
      this.arenaBg = this.add.image(0, 0, UI_ASSETS.arenaBg.key).setOrigin(0, 0).setDepth(0);
      this.arenaEnemyBase = this.add.image(ARENA_OFFSETS.enemy.x, ARENA_OFFSETS.enemy.y, UI_ASSETS.arenaEnemy.key).setOrigin(0, 0).setDepth(4);
      this.arenaEnemyProps = [];
      this.arenaPlayerBase = this.add.image(ARENA_OFFSETS.player.x, ARENA_OFFSETS.player.y, UI_ASSETS.arenaPlayer.key).setOrigin(0, 0).setDepth(5);
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
      const anchor = this.add.container(0, 0).setDepth(18).setVisible(false);
      const host = document.createElement('div');
      host.className = `pkb-phaser-sprite pkb-phaser-sprite-${name}`;
      ensureSpriteHostStyles(host);
      setHostVisibility(host, false);
      const dom = this.add.dom(0, 0, host);
      dom.setOrigin(0.5, 1);
      dom.setDepth(19);
      dom.setVisible(false);
      return { anchor, host, dom, name };
    }

    createPerspectiveTabs() {
      const container = this.add.container(0, 0);
      const tabs = [0, 1].map(index => {
        const bg = this.add.nineslice(0, 0, UI_ASSETS.windowThin.key, undefined, 72, 20, 8, 8, 8, 8).setOrigin(0, 0);
        const label = createBaseText(this, 36, 10, `P${index + 1}`, 7, '#dbeafe', { align: 'center' }).setOrigin(0.5, 0.5);
        const hit = this.add.rectangle(0, 0, 72, 20, 0xffffff, 0.001).setOrigin(0, 0);
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
      const name = createBaseText(this, isPlayer ? -115 : -124, isPlayer ? -15 : -11, '', 8, '#f8fbff').setOrigin(0, 0);
      const level = this.add.text(isPlayer ? -41 : -50, isPlayer ? -10 : -5, '', {
        fontFamily: 'emerald, pkmnems, monospace',
        fontSize: '6px',
        color: '#dbeafe',
        resolution: 3,
      }).setOrigin(0, 0.5);
      const status = this.add.text(-12, isPlayer ? 9 : 10, '', {
        fontFamily: 'emerald, pkmnems, monospace',
        fontSize: '6px',
        color: '#fbbf24',
        resolution: 3,
      }).setOrigin(1, 0.5);
      const hpTrack = this.add.rectangle(isPlayer ? -61 : -71, isPlayer ? -1 : 4.5, 48, 2, 0x111827, 1).setOrigin(0, 0);
      const hpFill = this.add.image(hpTrack.x, hpTrack.y, UI_ASSETS.overlayHpAtlas.key, 'high').setOrigin(0, 0);
      const hpText = this.add.text(isPlayer ? -60 : -70, isPlayer ? 8 : 12, '', {
        fontFamily: 'emerald, pkmnems, monospace',
        fontSize: '6px',
        color: '#eff6ff',
        resolution: 3,
      }).setOrigin(0, 0.5);
      const expBar = isPlayer ? this.add.image(-98, 18, UI_ASSETS.overlayExp.key).setOrigin(0, 0.5) : null;
      const expFill = isPlayer ? this.add.rectangle(-98, 18, 0, 2, 0x60a5fa, 1).setOrigin(0, 0.5) : null;
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
      return { container, bg, name, level, status, hpTrack, hpFill, hpText, expBar, expFill, typeIcons, side };
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
      const left = this.add.image(0, 0, UI_ASSETS.abilityBarLeft.key).setOrigin(0, 0.5);
      const right = this.add.image(0, 0, UI_ASSETS.abilityBarRight.key).setOrigin(1, 0.5);
      const text = this.add.text(0, 0, '', {
        fontFamily: 'emerald, pkmnems, monospace',
        fontSize: '7px',
        color: '#f8fbff',
        resolution: 3,
        wordWrap: { width: 104, useAdvancedWrap: true },
      }).setOrigin(0.5, 0.5);
      container.add([left, right, text]);
      container.setVisible(false);
      return { container, left, right, text };
    }

    createMessagePanel() {
      const container = this.add.container(0, 240).setDepth(50);
      const bg = this.add.image(0, 0, UI_ASSETS.bgAtlas.key, '1').setOrigin(0, 1);
      const commandWindow = this.add.nineslice(202, 0, UI_ASSETS.window.key, undefined, 118, 48, 8, 8, 8, 8).setOrigin(0, 1);
      commandWindow.setVisible(false);
      const movesWindowContainer = this.add.container(0, 0);
      movesWindowContainer.setVisible(false);
      const movesWindow = this.add.nineslice(0, 0, UI_ASSETS.window.key, undefined, 243, 48, 8, 8, 8, 8).setOrigin(0, 1);
      const moveDetailsWindow = this.add.nineslice(240, 0, UI_ASSETS.window.key, undefined, 80, 48, 8, 8, 8, 8).setOrigin(0, 1);
      movesWindowContainer.add([movesWindow, moveDetailsWindow]);
      const message = createBaseText(this, 12, -39, '', 8, '#f8fbff', {
        lineSpacing: 1,
        wordWrap: { width: 178, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const prompt = textureExists(this, UI_ASSETS.promptAtlas.key, '1')
        ? this.add.sprite(0, 0, UI_ASSETS.promptAtlas.key, '1').setOrigin(0, 0)
        : createBaseText(this, 0, 0, '▾', 10, '#f8fbff').setOrigin(0, 0);
      prompt.setVisible(false);
      container.add([bg, commandWindow, movesWindowContainer, message, prompt]);
      return { container, bg, commandWindow, movesWindowContainer, movesWindow, moveDetailsWindow, message, prompt };
    }

    createCommandPanel() {
      const container = this.add.container(0, 240).setDepth(55);
      const cursor = textureExists(this, UI_ASSETS.cursor.key)
        ? this.add.image(0, 0, UI_ASSETS.cursor.key).setOrigin(0, 0)
        : createBaseText(this, 0, 0, '▶', 8, '#f8fbff').setOrigin(0, 0);
      const teraButton = textureExists(this, UI_ASSETS.teraAtlas.key, 'unknown')
        ? this.add.sprite(185, -15, UI_ASSETS.teraAtlas.key, 'unknown').setOrigin(0.5, 0.5).setScale(1.3)
        : createBaseText(this, 185, -15, 'Tera', 8, '#f8fbff').setOrigin(0.5, 0.5);
      teraButton.setVisible(false);
      const positions = [
        { x: 217, y: -38.7 },
        { x: 272.8, y: -38.7 },
        { x: 217, y: -22.7 },
        { x: 272.8, y: -22.7 },
      ];
      const entries = positions.map(pos => {
        const label = createBaseText(this, pos.x, pos.y, '', 8, '#f8fbff').setOrigin(0, 0);
        const zone = this.add.rectangle(pos.x - 6, pos.y - 2, 52, 14, 0xffffff, 0.001).setOrigin(0, 0);
        return { label, zone };
      });
      container.add([cursor, teraButton, ...entries.flatMap(entry => [entry.zone, entry.label])]);
      return { container, cursor, teraButton, entries };
    }

    createFightPanel() {
      const container = this.add.container(0, 240).setDepth(55);
      const movesContainer = this.add.container(18, -38.7);
      const cursor = textureExists(this, UI_ASSETS.cursor.key)
        ? this.add.image(0, 0, UI_ASSETS.cursor.key).setOrigin(0, 0)
        : this.add.text(0, 0, '▶', { fontFamily: 'monospace', fontSize: '8px', color: '#f8fbff' }).setOrigin(0, 0);
      const moves = Array.from({ length: 4 }, (_, moveIndex) => {
        const localX = moveIndex % 2 === 0 ? 0 : 114;
        const localY = moveIndex < 2 ? 0 : 16;
        const label = createBaseText(this, localX, localY, '', 8, '#f8fbff', {
          wordWrap: { width: 98, useAdvancedWrap: true },
        }).setOrigin(0, 0);
        const zone = this.add.rectangle(localX - 6, localY - 2, 110, 14, 0xffffff, 0.001).setOrigin(0, 0);
        movesContainer.add([zone, label]);
        return { label, zone, localX, localY };
      });
      const detailName = createBaseText(this, 249, -40, '', 7, '#f8fbff', {
        wordWrap: { width: 44, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const typeIcon = textureExists(this, UI_ASSETS.typesAtlas.key, 'unknown')
        ? this.add.image(263, -38, UI_ASSETS.typesAtlas.key, 'unknown').setOrigin(0, 0).setScale(0.55)
        : this.add.text(263, -38, '', { fontFamily: 'monospace', fontSize: '7px', color: '#cbd5e1' }).setOrigin(0, 0);
      const categoryIcon = textureExists(this, UI_ASSETS.categoriesAtlas.key, 'status')
        ? this.add.image(289, -38, UI_ASSETS.categoriesAtlas.key, 'status').setOrigin(0, 0).setScale(0.55)
        : this.add.text(289, -38, '', { fontFamily: 'monospace', fontSize: '7px', color: '#cbd5e1' }).setOrigin(0, 0);
      const ppLabel = createBaseText(this, 250, -26, 'PP', 6, '#dbeafe').setOrigin(0, 0.5);
      const ppText = createBaseText(this, 308, -26, '--/--', 6, '#dbeafe').setOrigin(1, 0.5);
      const powerLabel = createBaseText(this, 250, -18, 'Pow', 6, '#dbeafe').setOrigin(0, 0.5);
      const powerText = createBaseText(this, 308, -18, '---', 6, '#dbeafe').setOrigin(1, 0.5);
      const accuracyLabel = createBaseText(this, 250, -10, 'Acc', 6, '#dbeafe').setOrigin(0, 0.5);
      const accuracyText = createBaseText(this, 308, -10, '---', 6, '#dbeafe').setOrigin(1, 0.5);
      const description = createBaseText(this, 249, -2, '', 6, '#cbd5e1', {
        wordWrap: { width: 65, useAdvancedWrap: true },
      }).setOrigin(0, 1);
      const toggles = Array.from({ length: 5 }, () => {
        const bg = this.add.nineslice(0, 0, UI_ASSETS.windowXthin.key, undefined, 30, 12, 8, 8, 8, 8).setOrigin(0, 0);
        const label = createBaseText(this, 15, 6, '', 6, '#f8fbff', { align: 'center' }).setOrigin(0.5, 0.5);
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
        const label = createBaseText(this, 20, 6, '', 6, '#f8fbff', { align: 'center' }).setOrigin(0.5, 0.5);
        const hit = this.add.rectangle(0, 0, 40, 12, 0xffffff, 0.001).setOrigin(0, 0);
        return { bg, label, hit };
      });
      container.add([movesContainer, cursor, detailName, typeIcon, categoryIcon, ppLabel, ppText, powerLabel, powerText, accuracyLabel, accuracyText, description, ...toggles.map(entry => entry.button), ...footerActions.flatMap(entry => [entry.bg, entry.label, entry.hit])]);
      return { container, movesContainer, cursor, moves, detailName, typeIcon, categoryIcon, ppLabel, ppText, powerLabel, powerText, accuracyLabel, accuracyText, description, toggles, footerActions };
    }

    createPartyPanel() {
      const container = this.add.container(0, 240).setVisible(false).setDepth(56);
      const bg = this.add.image(0, 0, UI_ASSETS.partyBg.key).setOrigin(0, 1);
      const messageBox = this.add.nineslice(1, -1, UI_ASSETS.window.key, undefined, 262, 30, 8, 8, 8, 8).setOrigin(0, 1);
      const message = createBaseText(this, 10, -23, '', 7, '#f8fbff', {
        wordWrap: { width: 244, useAdvancedWrap: true },
        lineSpacing: 1,
      }).setOrigin(0, 1);
      const cursor = textureExists(this, UI_ASSETS.menuSel.key)
        ? this.add.image(0, 0, UI_ASSETS.menuSel.key).setOrigin(0, 0)
        : createBaseText(this, 0, 0, '▶', 8, '#f8fbff').setOrigin(0, 0);
      const cancelBg = textureExists(this, UI_ASSETS.partyCancelAtlas.key, 'party_cancel')
        ? this.add.image(291, -16, UI_ASSETS.partyCancelAtlas.key, 'party_cancel').setOrigin(0, 0.5)
        : this.add.nineslice(291, -16, UI_ASSETS.windowXthin.key, undefined, 52, 32, 8, 8, 8, 8).setOrigin(0, 0.5);
      const cancelPb = textureExists(this, UI_ASSETS.partyPbAtlas.key, 'party_pb')
        ? this.add.image(274, -16, UI_ASSETS.partyPbAtlas.key, 'party_pb').setOrigin(0.5, 0.5)
        : null;
      const cancelLabel = createBaseText(this, 281, -23, 'Cancel', 7, '#f8fbff').setOrigin(0, 0);
      const cancelZone = this.add.rectangle(291, -32, 52, 32, 0xffffff, 0.001).setOrigin(0, 0);
      const slotYs = [-148.5, -168, -140, -112, -84, -56];
      const entries = slotYs.map((slotY, index) => {
        const benched = index > 0;
        const baseX = benched ? 143 : 9;
        const mainFrame = benched ? 'party_slot' : 'party_slot_main';
        const selFrame = benched ? 'party_slot_sel' : 'party_slot_main_sel';
        const bgObj = this.add.image(baseX, slotY, benched ? UI_ASSETS.partySlotAtlas.key : UI_ASSETS.partySlotMainAtlas.key, mainFrame).setOrigin(0, 0);
        const pb = this.add.image(baseX + (benched ? 2 : 4), slotY + (benched ? 12 : 4), UI_ASSETS.partyPbAtlas.key, 'party_pb').setOrigin(0, 0);
        const label = createBaseText(this, baseX + (benched ? 21 : 24), slotY + (benched ? 2 : 10), '', benched ? 7 : 8, '#f8fbff', {
          wordWrap: { width: benched ? 52 : 76, useAdvancedWrap: true },
        }).setOrigin(0, 0);
        const sublabel = createBaseText(this, baseX + (benched ? 94 : 32), slotY + (benched ? 16 : 46), '', 5, '#dbeafe', {
          wordWrap: { width: benched ? 74 : 72, useAdvancedWrap: true },
        }).setOrigin(benched ? 0 : 0, benched ? 1 : 1);
        const hpBarBase = this.add.image(baseX + (benched ? 72 : 8), slotY + (benched ? 6 : 31), UI_ASSETS.partySlotHpBar.key).setOrigin(0, 0);
        const hpBarFill = this.add.image(hpBarBase.x + 16, hpBarBase.y + 2, UI_ASSETS.partySlotHpOverlayAtlas.key, 'high').setOrigin(0, 0);
        const hpText = createBaseText(this, benched ? (baseX + 172) : (baseX + 95), slotY + (benched ? 12 : 38), '', 5, '#eff6ff').setOrigin(1, 0.5);
        const hit = this.add.rectangle(bgObj.x, bgObj.y, bgObj.width, bgObj.height, 0xffffff, 0.001).setOrigin(0, 0);
        const row = this.add.container(0, 0, [bgObj, pb, hpBarBase, hpBarFill, label, sublabel, hpText, hit]);
        return { row, bgObj, mainFrame, selFrame, pb, label, sublabel, hpBarBase, hpBarFill, hpText, hit, x: bgObj.x, y: bgObj.y };
      });
      container.add([bg, messageBox, message, cursor, cancelBg, cancelLabel, cancelZone, ...(cancelPb ? [cancelPb] : []), ...entries.map(entry => entry.row)]);
      return { container, bg, messageBox, message, cursor, cancelBg, cancelPb, cancelLabel, cancelZone, entries };
    }

    createNotePanel() {
      const container = this.add.container(202, 240).setDepth(55);
      const bg = this.add.nineslice(0, 0, UI_ASSETS.window.key, undefined, 118, 48, 8, 8, 8, 8).setOrigin(0, 1);
      const title = createBaseText(this, 8, -42, '', 8, '#dbeafe').setOrigin(0, 0);
      const body = this.add.text(8, -31, '', {
        fontFamily: 'emerald, pkmnems, monospace',
        fontSize: '6px',
        color: '#cbd5e1',
        resolution: 3,
        wordWrap: { width: 102, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const footer = createBaseText(this, 8, -10, '', 6, '#dbeafe').setOrigin(0, 0);
      const footerZone = this.add.rectangle(8, -12, 40, 10, 0xffffff, 0.001).setOrigin(0, 0);
      container.add([bg, title, body, footer, footerZone]);
      return { container, bg, title, body, footer, footerZone };
    }

    layout() {
      if (!this.isBootstrapped) return;
      this.arenaBg.setPosition(0, 0);
      this.arenaEnemyBase.setPosition(ARENA_OFFSETS.enemy.x, ARENA_OFFSETS.enemy.y);
      this.arenaEnemyProps.forEach(prop => prop.setPosition(ARENA_OFFSETS.enemy.x, ARENA_OFFSETS.enemy.y));
      this.arenaPlayerBase.setPosition(ARENA_OFFSETS.player.x, ARENA_OFFSETS.player.y);
      this.enemyTray.container.setPosition(0, 96);
      this.playerTray.container.setPosition(320, 168);
      this.enemyInfo.container.setPosition(140, 99);
      this.playerInfo.container.setPosition(310, 168);

      this.enemySprite.anchor.setPosition(ARENA_PLATFORM_CENTERS.enemy.x, ARENA_PLATFORM_CENTERS.enemy.y);
      this.playerSprite.anchor.setPosition(ARENA_PLATFORM_CENTERS.player.x, ARENA_PLATFORM_CENTERS.player.y);
      this.enemySprite.dom.setPosition(ARENA_PLATFORM_CENTERS.enemy.x, ARENA_PLATFORM_CENTERS.enemy.y);
      this.playerSprite.dom.setPosition(ARENA_PLATFORM_CENTERS.player.x, ARENA_PLATFORM_CENTERS.player.y);
      applyHostBox(this.enemySprite.host, 72, 72);
      applyHostBox(this.playerSprite.host, 88, 88);

      this.messagePanel.container.setPosition(0, 240);
      this.commandPanel.container.setPosition(0, 240);
      this.fightPanel.container.setPosition(0, 240);
      this.partyPanel.container.setPosition(0, 240);

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
      setHorizontalCrop(target.hpFill, 48 * (hpPercent / 100));
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
      this.abilityBar.text.setText(model.text);
      this.abilityBar.text.setWordWrapWidth(100, true);
      const width = clamp(this.abilityBar.text.width + 14, 72, 118);
      const side = model.side === 'enemy' ? 'enemy' : 'player';
      const leftVisible = side === 'enemy';
      const logicalX = side === 'enemy' ? 202 : 118;
      const logicalY = side === 'enemy' ? 62 : 136;
      this.abilityBar.left.setVisible(leftVisible);
      this.abilityBar.right.setVisible(!leftVisible);
      if (leftVisible) {
        this.abilityBar.left.setPosition(0, 0);
        this.abilityBar.left.setCrop(0, 0, width, this.abilityBar.left.height);
        this.abilityBar.text.setPosition(width / 2, 0);
        this.abilityBar.container.setPosition(logicalX, logicalY);
      } else {
        this.abilityBar.right.setPosition(0, 0);
        this.abilityBar.right.setCrop(this.abilityBar.right.width - width, 0, width, this.abilityBar.right.height);
        this.abilityBar.text.setPosition(-width / 2, 0);
        this.abilityBar.container.setPosition(logicalX, logicalY);
      }
      this.abilityBar.container.setVisible(true);
    }

    renderMessageWindow(message = {}) {
      const lines = [message.primary || '', message.secondary || ''].filter(Boolean);
      this.messagePanel.message.setText(lines.join('\n') || '—');
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
      const positions = [
        { x: 217, y: -38.7 },
        { x: 272.8, y: -38.7 },
        { x: 217, y: -22.7 },
        { x: 272.8, y: -22.7 },
      ];
      let cursorPos = positions[0];
      this.commandPanel.entries.forEach((entry, index) => {
        const command = (ui.commands || [])[index] || { label: '', disabled: true };
        const pos = positions[index];
        entry.label.setPosition(pos.x, pos.y);
        entry.label.setText(command.label || '');
        entry.label.setAlpha(command.disabled ? 0.42 : 1);
        entry.label.setColor(command.disabled ? '#64748b' : '#f8fbff');
        entry.zone.setPosition(pos.x - 6, pos.y - 2);
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
        if (this.commandPanel.teraButton.setTexture && textureExists(this, UI_ASSETS.teraAtlas.key, tera.type || 'unknown')) {
          this.commandPanel.teraButton.setTexture(UI_ASSETS.teraAtlas.key, tera.type || 'unknown');
        }
        this.commandPanel.teraButton.setAlpha(tera.disabled ? 0.45 : 1);
        this.commandPanel.teraButton.setScale(tera.active ? 1.45 : 1.3);
        this.commandPanel.teraButton.x = 185;
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
      this.messagePanel.movesWindowContainer.setVisible(true);
      const positions = [
        { labelX: 0, labelY: 0, cursorX: 13, cursorY: -31 },
        { labelX: 114, labelY: 0, cursorX: 127, cursorY: -31 },
        { labelX: 0, labelY: 16, cursorX: 13, cursorY: -16 },
        { labelX: 114, labelY: 16, cursorX: 127, cursorY: -16 },
      ];
      let cursorPos = positions[0];
      this.fightPanel.moves.forEach((entry, index) => {
        const move = (ui.moves || [])[index] || { label: '', disabled: true };
        const pos = positions[index];
        entry.label.setPosition(pos.labelX, pos.labelY);
        entry.label.setText(move.label || '');
        entry.label.setAlpha(move.disabled ? 0.42 : 1);
        entry.label.setColor(move.disabled ? '#64748b' : '#f8fbff');
        entry.zone.setPosition(pos.labelX - 6, pos.labelY - 2);
        entry.zone.removeAllListeners();
        if (!move.disabled) {
          const hoverAction = move.focusAction ? () => this.controller.handleAction(move.focusAction) : null;
          setInteractiveTarget(entry.zone, move.action ? () => this.controller.handleAction(move.action) : null, hoverAction);
        }
        if (move.focused || move.active) cursorPos = pos;
      });
      this.fightPanel.cursor.setPosition(cursorPos.cursorX, cursorPos.cursorY);
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
      this.fightPanel.ppText.setText(detail.ppLabel || '--/--');
      this.fightPanel.powerText.setText(detail.powerLabel || '---');
      this.fightPanel.accuracyText.setText(detail.accuracyLabel || '---');
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
        entry.bg.setVisible(true);
        entry.label.setVisible(true);
        entry.hit.setVisible(true);
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
      this.fightPanel.footerActions.slice((ui.footerActions || []).length).forEach(entry => {
        entry.bg.setVisible(false);
        entry.label.setVisible(false);
        entry.hit.setVisible(false);
      });
    }

    renderPartyPanel(ui = {}) {
      this.partyPanel.container.setVisible(true);
      const messageLines = [ui.title || '', ui.subtitle || ''].filter(Boolean);
      this.partyPanel.message.setText(messageLines.join('\n'));
      let cursorPos = null;
      this.partyPanel.entries.forEach((entry, index) => {
        const option = (ui.partyOptions || [])[index] || null;
        entry.row.setVisible(Boolean(option));
        if (!option) return;
        const selected = Boolean(option.active);
        entry.bgObj.setTexture(index === 0 ? UI_ASSETS.partySlotMainAtlas.key : UI_ASSETS.partySlotAtlas.key, selected ? entry.selFrame : entry.mainFrame);
        entry.pb.setTexture(UI_ASSETS.partyPbAtlas.key, selected ? 'party_pb_sel' : 'party_pb');
        entry.label.setText(option.label || '');
        entry.label.setColor(option.disabled ? '#64748b' : '#f8fbff');
        entry.sublabel.setText(option.sublabel || '');
        entry.sublabel.setColor(option.disabled ? '#94a3b8' : '#dbeafe');
        const hpPercent = clamp(Number(option.hpPercent ?? 100), 0, 100);
        const hpFrame = hpPercent > 50 ? 'high' : hpPercent > 20 ? 'medium' : 'low';
        if (textureExists(this, UI_ASSETS.partySlotHpOverlayAtlas.key, hpFrame)) {
          entry.hpBarFill.setTexture(UI_ASSETS.partySlotHpOverlayAtlas.key, hpFrame);
        }
        setHorizontalCrop(entry.hpBarFill, 100 * (hpPercent / 100));
        entry.hpText.setText(option.hpLabel || '');
        entry.hit.removeAllListeners();
        if (!option.disabled && option.action) {
          setInteractiveTarget(entry.hit, () => this.controller.handleAction(option.action));
        }
        if (selected) cursorPos = { x: entry.x - 4, y: entry.y - 1 };
      });
      this.partyPanel.cursor.setVisible(Boolean(cursorPos));
      if (cursorPos) this.partyPanel.cursor.setPosition(cursorPos.x, cursorPos.y);
      const footerAction = (ui.footerActions || [])[0] || null;
      const cancelVisible = Boolean(footerAction);
      this.partyPanel.cancelBg.setVisible(cancelVisible);
      this.partyPanel.cancelLabel.setVisible(cancelVisible);
      this.partyPanel.cancelZone.setVisible(cancelVisible);
      if (this.partyPanel.cancelPb) this.partyPanel.cancelPb.setVisible(cancelVisible);
      if (this.partyPanel.cancelBg.setTexture) {
        this.partyPanel.cancelBg.setTexture(UI_ASSETS.partyCancelAtlas.key, cancelVisible ? 'party_cancel' : 'party_cancel');
      }
      this.partyPanel.cancelLabel.setText(footerAction?.label || '');
      this.partyPanel.cancelZone.removeAllListeners();
      if (footerAction && !footerAction.disabled && footerAction.action) {
        setInteractiveTarget(this.partyPanel.cancelZone, () => this.controller.handleAction(footerAction.action));
      }
    }

    renderStateWindow(ui = {}) {
      const mode = ui.mode || 'message';
      this.commandPanel.container.setVisible(false);
      this.fightPanel.container.setVisible(false);
      this.partyPanel.container.setVisible(false);
      this.messagePanel.container.setVisible(false);
      this.messagePanel.bg.setVisible(false);
      this.messagePanel.commandWindow.setVisible(false);
      this.messagePanel.movesWindowContainer.setVisible(false);
      if (mode === 'command') {
        this.messagePanel.container.setVisible(true);
        this.messagePanel.bg.setVisible(true);
        this.renderCommandPanel(ui);
        return;
      }
      if (mode === 'fight') {
        this.messagePanel.container.setVisible(true);
        this.renderFightPanel(ui);
        return;
      }
      if (mode === 'party') {
        this.renderPartyPanel(ui);
        return;
      }
      this.messagePanel.container.setVisible(true);
      this.messagePanel.bg.setVisible(true);
    }

    renderModel(model) {
      this.currentModel = model;
      if (!model) return;
      this.uiLanguage = model.language || 'ko';
      this.updateInfoBox(this.enemyInfo, model.enemyInfo || {});
      this.updateInfoBox(this.playerInfo, model.playerInfo || {});
      this.updateTray(this.enemyTray, model.enemyTray || []);
      this.updateTray(this.playerTray, model.playerTray || []);
      this.renderMessageWindow(model.message || {});
      this.renderStateWindow(model.stateWindow || {});
      this.setAbilityBar(model.abilityBar || null);
      const enemyDeferred = Boolean(model.enemySprite?.deferred || !model.enemySprite?.url);
      const playerDeferred = Boolean(model.playerSprite?.deferred || !model.playerSprite?.url);
      this.enemySprite.dom.setVisible(!enemyDeferred);
      this.playerSprite.dom.setVisible(!playerDeferred);
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
      const renderResolution = typeof window !== 'undefined'
        ? Math.max(1, Math.min(3, Math.ceil(window.devicePixelRatio || 1)))
        : 1;
      this.scene = scene;
      this.lastMountSize = mountSize;
      this.game = new Phaser.Game({
        type: Phaser.AUTO,
        width: LOGICAL_WIDTH,
        height: LOGICAL_HEIGHT,
        parent: this.mount,
        transparent: false,
        backgroundColor: '#000000',
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        autoRound: true,
        resolution: renderResolution,
        dom: { createContainer: true },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: LOGICAL_WIDTH,
          height: LOGICAL_HEIGHT,
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
