import { PkbBattleUiAdapter } from '../adapter/pkb-battle-ui-adapter.js';
import { UiMode } from './ui-mode.js';
import { BattleMessageUiHandler } from './handlers/battle-message-ui-handler.js';
import { CommandUiHandler } from './handlers/command-ui-handler.js';
import { FightUiHandler } from './handlers/fight-ui-handler.js';
import { PartyUiHandler } from './handlers/party-ui-handler.js';
import { TargetSelectUiHandler } from './handlers/target-select-ui-handler.js';
import { AbilityBar, BattleTray } from './battle-info/battle-info.js';
import { EnemyBattleInfo } from './battle-info/enemy-battle-info.js';
import { PlayerBattleInfo } from './battle-info/player-battle-info.js';

// Horizontal offset (in logical pixels) between slot 0 and slot 1 in doubles.
// Temporary value — refined later against PokeRogue measured coordinates (DB-9).
const DOUBLES_MOUNT_OFFSET_X = 24;

// Global offset applied to every doubles battle info panel (enemy + player).
// Use this for one-shot coarse movement of all four panels at once.
const DOUBLES_INFO_GLOBAL_OFFSET = Object.freeze({
  x: 0,
  y: 0,
});

// Doubles BattleInfo anchor positions (logical pixels).
// Keep these values centralized so visual tuning is a one-line edit.
const DOUBLES_INFO_POS = Object.freeze({
  enemy: { x: 140, slot0Y: 39, slot1Y: 22 },
  // Player mini info now follows enemy-like slot spacing (17px).
  player: { x: 310, slot0Y: 108, slot1Y: 125 },
});

export class TransplantBattleUI {
  constructor(scene, controller, env) {
    this.scene = scene;
    this.controller = controller;
    this.env = env;
    this.uiLanguage = 'ko';
    this.mode = UiMode.MESSAGE;
    this.modeChain = [];
    this.modeArgs = new Map([[UiMode.MESSAGE, null]]);
    this.handlers = [];
    this.adapter = new PkbBattleUiAdapter();
    this.rootContainer = scene.add.container(0, 0).setDepth(40).setName('pkb-transplant-ui-root');
    // Two BattleInfo instances per side support doubles slot 0/1.  Slot 1 stays
    // hidden (no model emitted) in singles.
    this.enemyInfos = [new EnemyBattleInfo(this), new EnemyBattleInfo(this)];
    this.playerInfos = [new PlayerBattleInfo(this), new PlayerBattleInfo(this)];
    // Aliases for legacy callers that only address slot 0.
    this.enemyInfo = this.enemyInfos[0];
    this.playerInfo = this.playerInfos[0];
    this.enemyTray = new BattleTray(this, 'enemy');
    this.playerTray = new BattleTray(this, 'player');
    this.abilityBar = new AbilityBar(this);
    this.enemySprites = [];
    this.playerSprites = [];
    // Aliases for legacy callers that only address slot 0.
    this.enemySprite = null;
    this.playerSprite = null;
    this.overlayActive = false;
    this.partyModeActive = false;
  }

  setup() {
    this.handlers[UiMode.MESSAGE] = new BattleMessageUiHandler(this);
    this.handlers[UiMode.COMMAND] = new CommandUiHandler(this);
    this.handlers[UiMode.FIGHT] = new FightUiHandler(this);
    this.handlers[UiMode.PARTY] = new PartyUiHandler(this);
    this.handlers[UiMode.TARGET_SELECT] = new TargetSelectUiHandler(this);
    this.enemyInfos.forEach(info => info.setup());
    this.playerInfos.forEach(info => info.setup());
    this.enemyTray.setup();
    this.playerTray.setup();
    this.abilityBar.setup();
    Object.values(this.handlers).forEach(handler => handler?.setup?.());
    Object.values(this.handlers).forEach(handler => handler?.container && this.rootContainer.add(handler.container));
    [
      this.enemyTray.container,
      this.playerTray.container,
      ...this.enemyInfos.map(info => info?.container),
      ...this.playerInfos.map(info => info?.container),
      this.abilityBar.container,
    ].forEach(node => {
      if (node) this.rootContainer.add(node);
    });
    // Phaser Container renders children in addition order by default (sortChildrenFlag=false).
    // Enable depth sort so setDepth() values are respected.
    this.rootContainer.sortChildrenFlag = true;
    // Battle info containers need explicit depth below handlers so they don't cover UI panels.
    this.enemyTray.container?.setDepth(42);
    this.playerTray.container?.setDepth(42);
    this.enemyInfos.forEach(info => info?.container?.setDepth(42));
    this.playerInfos.forEach(info => info?.container?.setDepth(42));
    // Slot 1 stays hidden until a doubles model emits a per-slot info entry.
    this.enemyInfos[1]?.container?.setVisible(false);
    this.playerInfos[1]?.container?.setVisible(false);
    this.abilityBar.container?.setDepth(60);
    // COMMAND and TARGET_SELECT have no setDepth call — default 0 would go under battle info.
    this.handlers[UiMode.COMMAND]?.container?.setDepth(50);
    this.handlers[UiMode.TARGET_SELECT]?.container?.setDepth(50);
    this.layout();
    this.getMessageHandler()?.show(this.adapter.getMessageState());
  }

  attachSpriteMounts(spriteMounts = {}) {
    const toArray = value => {
      if (Array.isArray(value)) return value.filter(Boolean);
      return value ? [value] : [];
    };
    this.enemySprites = toArray(spriteMounts.enemy);
    this.playerSprites = toArray(spriteMounts.player);
    this.enemySprite = this.enemySprites[0] || null;
    this.playerSprite = this.playerSprites[0] || null;
  }

  getHandler(mode = this.mode) {
    return this.handlers[mode] || this.handlers[UiMode.MESSAGE];
  }

  getMessageHandler() {
    return this.handlers[UiMode.MESSAGE];
  }

  getMode() {
    return this.mode;
  }

  getModeChain() {
    return this.modeChain.map(entry => (typeof entry === 'object' && entry ? entry.mode : entry)).filter(mode => mode != null);
  }

  getModeChainEntries() {
    return this.modeChain.map(entry => {
      if (typeof entry === 'object' && entry) return { ...entry };
      return { mode: entry, args: null };
    });
  }

  getCurrentModeArgs() {
    return this.getArgsForMode(this.mode);
  }

  storeModeArgs(mode, args) {
    if (mode == null || typeof args === 'undefined') return;
    this.modeArgs.set(mode, args);
  }

  getArgsForMode(mode = this.mode) {
    if (this.modeArgs.has(mode)) {
      return this.modeArgs.get(mode);
    }
    const adapterArgs = this.adapter.getUiArgsForMode(mode);
    this.storeModeArgs(mode, adapterArgs);
    return adapterArgs;
  }

  processInfoButton(pressed) {
    if (this.overlayActive) return false;
    const canProcess = this.adapter.canProcessInfoButton(this.mode);
    if (!canProcess) return false;
    const handler = this.getHandler();
    handler?.toggleInfo?.(Boolean(pressed));
    return true;
  }

  processInput(button) {
    if (this.overlayActive) return false;
    const handler = this.getHandler();
    return handler?.processInput?.(button) ?? false;
  }

  playSelect() {
    return this.scene.audio?.play('ui/select') ?? false;
  }

  playError() {
    return this.scene.audio?.play('ui/error') ?? false;
  }

  setModeInternal(mode, clear = true, force = false, chainMode = false, args = null) {
    const nextArgs = args ?? this.adapter.getUiArgsForMode(mode);
    if (this.mode === mode && !force) {
      this.storeModeArgs(mode, nextArgs);
      this.refreshCurrentHandler(mode, nextArgs);
      return false;
    }
    const previousMode = this.mode;
    const previousArgs = this.getArgsForMode(previousMode);
    if (clear) {
      this.getHandler(previousMode)?.clear?.();
    }
    if (chainMode && previousMode != null && !clear) {
      this.modeChain.push({
        mode: previousMode,
        args: previousArgs,
      });
    }
    this.mode = mode;
    this.storeModeArgs(mode, nextArgs);
    this.refreshCurrentHandler(mode, nextArgs);
    return true;
  }

  setMode(mode, args = null) {
    return this.setModeInternal(mode, true, false, false, args);
  }

  setModeWithoutClear(mode, args = null) {
    return this.setModeInternal(mode, false, false, false, args);
  }

  setOverlayMode(mode, args = null) {
    return this.setModeInternal(mode, false, false, true, args);
  }

  resetModeChain() {
    this.modeChain = [];
  }

  revertMode() {
    if (!this.modeChain.length) return false;
    this.getHandler(this.mode)?.clear?.();
    const previous = this.modeChain.pop();
    const restoredMode = typeof previous === 'object' && previous ? previous.mode : previous;
    const restoredArgs = typeof previous === 'object' && previous ? previous.args : null;
    this.mode = restoredMode;
    this.storeModeArgs(restoredMode, restoredArgs);
    this.refreshCurrentHandler(this.mode, restoredArgs);
    return true;
  }

  refreshCurrentHandler(mode = this.mode, args = null) {
    const messageHandler = this.getMessageHandler();
    const nextArgs = args ?? this.getArgsForMode(mode);
    this.storeModeArgs(mode, nextArgs);
    if (messageHandler) {
      messageHandler.show(this.adapter.getMessageState());
      if (mode === UiMode.MESSAGE) {
        messageHandler.render(this.adapter.getMessageState());
      }
    }
    const handler = this.getHandler(mode);
    if (mode !== UiMode.MESSAGE) {
      handler?.show?.(nextArgs);
    }
    return handler;
  }

  layout() {
    // Positions derived from PokeRogue fieldUI coords (fieldUI at y=1080, scale 6):
    // absolute canvas pos / 6 = our logical pos; y = (1080 + localY*6) / 6 = 180 + localY
    this.enemyTray.container?.setPosition(0, 36);      // PokeRogue: (0, -144) in fieldUI
    this.playerTray.container?.setPosition(320, 108);  // PokeRogue: (scaledCanvas.width, -72) in fieldUI
    // Slot 0 BattleInfo at the singles base position; slot 1 stacks vertically
    // above (enemy) / below (player) so two HP bars stay legible side-by-side.
    const infoOffsetX = DOUBLES_INFO_GLOBAL_OFFSET.x;
    const infoOffsetY = DOUBLES_INFO_GLOBAL_OFFSET.y;
    this.enemyInfos[0]?.container?.setPosition(
      DOUBLES_INFO_POS.enemy.x + infoOffsetX,
      DOUBLES_INFO_POS.enemy.slot0Y + infoOffsetY
    );
    this.enemyInfos[1]?.container?.setPosition(
      DOUBLES_INFO_POS.enemy.x + infoOffsetX,
      DOUBLES_INFO_POS.enemy.slot1Y + infoOffsetY
    );
    this.playerInfos[0]?.container?.setPosition(
      DOUBLES_INFO_POS.player.x + infoOffsetX,
      DOUBLES_INFO_POS.player.slot0Y + infoOffsetY
    );
    this.playerInfos[1]?.container?.setPosition(
      DOUBLES_INFO_POS.player.x + infoOffsetX,
      DOUBLES_INFO_POS.player.slot1Y + infoOffsetY
    );

    // Slot 0 keeps the singles base coordinates; slot 1 is offset horizontally
    // so the doubles pair appears side-by-side.  Slot 1 mounts stay invisible
    // until renderBattlerSprite stages an actual texture on them.
    const enemyBaseX = 216;
    const enemyBaseY = 74;
    const playerBaseX = 100;
    const playerBaseY = 143;
    if (this.enemySprites[0]?.phaserSprite) {
      this.enemySprites[0].phaserSprite.setPosition(enemyBaseX, enemyBaseY + 10);
      this.enemySprites[0].baseX = enemyBaseX;
      this.enemySprites[0].baseY = enemyBaseY;
    }
    if (this.enemySprites[1]?.phaserSprite) {
      const slot1X = enemyBaseX - DOUBLES_MOUNT_OFFSET_X;
      this.enemySprites[1].phaserSprite.setPosition(slot1X, enemyBaseY + 10);
      this.enemySprites[1].baseX = slot1X;
      this.enemySprites[1].baseY = enemyBaseY;
    }
    if (this.playerSprites[0]?.phaserSprite) {
      this.playerSprites[0].phaserSprite.setPosition(playerBaseX + 6, playerBaseY + 5);
      this.playerSprites[0].baseX = playerBaseX;
      this.playerSprites[0].baseY = playerBaseY;
    }
    if (this.playerSprites[1]?.phaserSprite) {
      const slot1X = playerBaseX + DOUBLES_MOUNT_OFFSET_X;
      this.playerSprites[1].phaserSprite.setPosition(slot1X + 6, playerBaseY + 5);
      this.playerSprites[1].baseX = slot1X;
      this.playerSprites[1].baseY = playerBaseY;
    }
  }

  renderModel(model = {}) {
    this.adapter.setModel(model);
    this.uiLanguage = model.language || 'ko';
    // Slot 0 always renders with the legacy single key (singles + doubles).
    // Slot 1 only renders when a doubles model emits an enemyInfos/playerInfos array;
    // otherwise we hide slot 1 explicitly to clear any stale state.
    const enemyInfoModels = this.adapter.getInfoModelsBySlot('enemy');
    const playerInfoModels = this.adapter.getInfoModelsBySlot('player');
    this.enemyInfos.forEach((info, slot) => {
      if (!info) return;
      const slotModel = enemyInfoModels[slot];
      if (slotModel) {
        info.container?.setVisible?.(true);
        info.update(slotModel);
      } else {
        info.container?.setVisible?.(false);
      }
    });
    this.playerInfos.forEach((info, slot) => {
      if (!info) return;
      const slotModel = playerInfoModels[slot];
      if (slotModel) {
        info.container?.setVisible?.(true);
        info.update(slotModel);
      } else {
        info.container?.setVisible?.(false);
      }
    });
    this.enemyTray.update(this.adapter.getEnemyTray());
    this.playerTray.update(this.adapter.getPlayerTray());
    this.abilityBar.update(this.adapter.getAbilityBar());

    const messageState = this.adapter.getMessageState();
    this.getMessageHandler().render(messageState);

    // renderBattlerToPhaser is async; skips reload if URL unchanged (url === currentUrl).
    // party-ui-handler hides the sprite via mount.dom.setVisible(false) shim — that call
    // happens synchronously and persists because reload is skipped on same URL.
    const enemyModels = this.adapter.getSpriteModelsBySlot('enemy');
    const playerModels = this.adapter.getSpriteModelsBySlot('player');
    this.enemySprites.forEach((mount, slot) => {
      if (!mount) return;
      const slotModel = enemyModels[slot];
      // No slot-specific model emitted (singles, or unused doubles slot) → clear.
      this.env.renderBattlerToPhaser(mount, slotModel || { url: '' });
    });
    this.playerSprites.forEach((mount, slot) => {
      if (!mount) return;
      const slotModel = playerModels[slot];
      this.env.renderBattlerToPhaser(mount, slotModel || { url: '' });
    });

    const nextMode = this.adapter.getMode();
    // Always fetch fresh args from adapter (bypasses stale modeArgs cache).
    // modeArgs only caches args set via setMode/setModeInternal; adapter has the
    // authoritative up-to-date state after setModel() so we must read it directly.
    const nextArgs = this.adapter.getUiArgsForMode(nextMode);
    this.storeModeArgs(nextMode, nextArgs);
    if (nextMode !== this.mode) {
      this.setModeInternal(nextMode, true, true, false, nextArgs);
    } else {
      this.refreshCurrentHandler(nextMode, nextArgs);
    }
  }
}
