import { createPkbPokerogueTransplantLayer } from './pokerogue-ui-prototype/index.js';

const PHASER_IMPORT_PATH = '../node_modules/phaser/dist/phaser.esm.js';

const LOGICAL_WIDTH = 320;
const LOGICAL_HEIGHT = 240;
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
      this.pokerogueUi = null;
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
        this.pokerogueUi = createPkbPokerogueTransplantLayer(this, this.controller, {
          UI_ASSETS,
          clamp,
          textureExists,
          createBaseText,
          setHorizontalCrop,
          setInteractiveTarget,
          renderAnimatedSpriteToHost,
          applyHostBox,
        });
        this.pokerogueUi.attachSpriteMounts({ enemy: this.enemySprite, player: this.playerSprite });
        this.pokerogueUi.setup();

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

    layout() {
      if (!this.isBootstrapped) return;
      this.arenaBg.setPosition(0, 0);
      this.arenaEnemyBase.setPosition(ARENA_OFFSETS.enemy.x, ARENA_OFFSETS.enemy.y);
      this.arenaEnemyProps.forEach(prop => prop.setPosition(ARENA_OFFSETS.enemy.x, ARENA_OFFSETS.enemy.y));
      this.arenaPlayerBase.setPosition(ARENA_OFFSETS.player.x, ARENA_OFFSETS.player.y);
      this.pokerogueUi?.layout?.();
    }

    renderModel(model) {
      this.currentModel = model;
      if (!model) return;
      this.pokerogueUi?.renderModel?.(model);
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
