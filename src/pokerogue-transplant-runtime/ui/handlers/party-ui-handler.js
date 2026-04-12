import { UiHandler } from './ui-handler.js';
import { UiMode } from '../ui-mode.js';
import { Button } from '../facade/input-facade.js';
import { createGlobalSceneFacade } from '../facade/global-scene-facade.js';
import { addTextObject } from '../helpers/text.js';
import { addWindow } from '../helpers/ui-theme.js';

// HP overlay (party_slot_hp_overlay) frame width is 80px
const HP_FILL_WIDTH = 80;

// Cache of icon keys: 'loaded' | 'loading'
const iconTextureCache = new Map();

/**
 * Dynamically load a pokemon icon into the Phaser texture cache, then call cb().
 * Icons are 2-frame horizontal sprite sheets (128×64 → each frame is 64×64).
 * After loading, a 'frame0' is registered covering the left half of the texture.
 */
function loadIconTexture(scene, key, url, cb) {
  if (scene.textures.exists(key)) { cb(); return; }
  if (iconTextureCache.get(key) === 'loading') {
    scene.load.once('filecomplete-image-' + key, cb);
    return;
  }
  iconTextureCache.set(key, 'loading');
  scene.load.image(key, url);
  scene.load.once('filecomplete-image-' + key, () => {
    // Register frame0 (left half) and frame1 (right half) of the 2-frame sprite sheet
    try {
      const texture = scene.textures.get(key);
      if (texture && texture.source[0]) {
        const fw = Math.floor(texture.source[0].width / 2);
        const fh = texture.source[0].height;
        texture.add('frame0', 0, 0,  0, fw, fh); // left 64×64
        texture.add('frame1', 0, fw, 0, fw, fh); // right 64×64
      }
    } catch (_e) {}
    iconTextureCache.set(key, 'loaded');
    cb();
  });
  scene.load.start();
}

class PartySlot {
  constructor(handler, index, slotY) {
    this.handler = handler;
    this.ui = handler.ui;
    this.scene = handler.scene;
    this.env = handler.env;
    this.index = index;
    this.isActive = index === 0;
    this.slotY = slotY;
    this.baseX = this.isActive ? 9 : 143;
    this.iconObj = null;           // dynamically created pokemon icon sprite
    this.iconAnimTimer = null;     // Phaser TimerEvent for 2-frame icon animation
    this.iconPending = false;      // true while async icon load is in flight
    this.levelText = null;
    this.statusSprite = null;

    if (this.isActive) {
      this.mainFrame = 'party_slot_main';
      this.selFrame = 'party_slot_main_sel';
      this.fntFrame = 'party_slot_main_fnt';
      this.selFntFrame = 'party_slot_main_fnt_sel';
    } else {
      this.mainFrame = 'party_slot';
      this.selFrame = 'party_slot_sel';
      this.fntFrame = 'party_slot_fnt';
      this.selFntFrame = 'party_slot_fnt_sel';
    }
  }

  setup() {
    const { scene, env } = this;
    const atlas = this.isActive ? env.UI_ASSETS.partySlotMainAtlas.key : env.UI_ASSETS.partySlotAtlas.key;
    this.row = scene.add.container(this.baseX, this.slotY).setName(`party-slot-${this.index}`);
    this.bgObj = scene.add.image(0, 0, atlas, this.mainFrame).setOrigin(0, 0);

    if (this.isActive) {
      // Main slot layout (bgObj: 110×49, origin 0,0)
      this.pb         = scene.add.image(4, 4, env.UI_ASSETS.partyPbAtlas.key, 'party_pb').setOrigin(0, 0);
      this.iconHolder = scene.add.rectangle(4, 4, 18, 18, 0xffffff, 0.001).setOrigin(0, 0);
      this.label      = addTextObject(this.ui, 24, 3, '', 'WINDOW').setOrigin(0, 0);
      this.levelText  = addTextObject(this.ui, 24, 15, '', 'PARTY').setOrigin(0, 0);
      this.sublabel   = addTextObject(this.ui, 52, 16, '', 'PARTY').setOrigin(0, 0);
      this.hpBarBase  = scene.add.image(8, 31, env.UI_ASSETS.partySlotHpBar.key).setOrigin(0, 0);
      this.hpBarFill  = scene.add.image(24, 33, env.UI_ASSETS.partySlotHpOverlayAtlas.key, 'high').setOrigin(0, 0);
      this.hpLabel    = env.textureExists(scene, env.UI_ASSETS.partySlotOverlayHp?.key)
        ? scene.add.image(23, 31, env.UI_ASSETS.partySlotOverlayHp.key).setOrigin(1, 0)
        : null;
      this.hpText     = addTextObject(this.ui, 105, 36, '', 'PARTY').setOrigin(1, 0);
      this.hit        = scene.add.rectangle(0, 0, 110, 49, 0xffffff, 0.001).setOrigin(0, 0);
    } else {
      // Bench slot layout (bgObj: 175×24, origin 0,0)
      this.pb         = scene.add.image(2, 12, env.UI_ASSETS.partyPbAtlas.key, 'party_pb').setOrigin(0, 0);
      this.iconHolder = scene.add.rectangle(2, 12, 18, 18, 0xffffff, 0.001).setOrigin(0, 0);
      this.label      = addTextObject(this.ui, 21, 3, '', 'PARTY_NAME').setOrigin(0, 0);
      this.levelText  = addTextObject(this.ui, 21, 12, '', 'PARTY').setOrigin(0, 0);
      this.sublabel   = addTextObject(this.ui, 50, 12, '', 'PARTY').setOrigin(0, 0);
      this.hpBarBase  = scene.add.image(72, 6, env.UI_ASSETS.partySlotHpBar.key).setOrigin(0, 0);
      this.hpBarFill  = scene.add.image(88, 8, env.UI_ASSETS.partySlotHpOverlayAtlas.key, 'high').setOrigin(0, 0);
      this.hpLabel    = env.textureExists(scene, env.UI_ASSETS.partySlotOverlayHp?.key)
        ? scene.add.image(87, 6, env.UI_ASSETS.partySlotOverlayHp.key).setOrigin(1, 0)
        : null;
      this.hpText     = addTextObject(this.ui, 169, 11, '', 'PARTY').setOrigin(1, 0);
      this.hit        = scene.add.rectangle(0, 0, 175, 24, 0xffffff, 0.001).setOrigin(0, 0);
    }

    // Status sprite (shared position: below label)
    const statusKey = env.UI_ASSETS.statusesAtlas?.key;
    this.statusSprite = statusKey && env.textureExists(scene, statusKey)
      ? scene.add.sprite(
          this.isActive ? 54 : 52,
          this.isActive ? 18 : 15,
          statusKey, 'burn'
        ).setOrigin(0, 0).setVisible(false).setScale(0.9)
      : null;

    this.row.add([
      this.bgObj, this.pb, this.iconHolder,
      this.hpBarBase, this.hpBarFill,
      ...(this.hpLabel ? [this.hpLabel] : []),
      this.label, this.levelText, this.sublabel,
      ...(this.statusSprite ? [this.statusSprite] : []),
      this.hpText, this.hit,
    ]);
    return this.row;
  }

  update(option = null) {
    const { textureExists, UI_ASSETS, clamp, setHorizontalCrop } = this.env;
    this.row.setVisible(Boolean(option));
    if (!option) return;

    const selected = Boolean(option.active);
    const fainted  = Boolean(option.fainted);
    const atlasKey = this.isActive ? UI_ASSETS.partySlotMainAtlas.key : UI_ASSETS.partySlotAtlas.key;
    const frame = fainted
      ? (selected ? this.selFntFrame : this.fntFrame)
      : (selected ? this.selFrame   : this.mainFrame);
    this.bgObj.setTexture(atlasKey, frame);
    this.pb.setTexture(UI_ASSETS.partyPbAtlas.key, selected ? 'party_pb_sel' : 'party_pb');

    this.label.setText(option.label || '');

    // Level
    const lvStr = option.level != null ? `Lv.${option.level}` : '';
    this.levelText.setText(lvStr);

    // Sublabel (HP + status text)
    this.sublabel.setText(option.sublabel || '');

    // Status sprite
    const STATUS_FRAME = { brn: 'burn', par: 'paralysis', psn: 'poison', tox: 'toxic', slp: 'sleep', frz: 'freeze' };
    if (this.statusSprite) {
      const statusKey = option.statusEffect || '';
      const sfx = STATUS_FRAME[statusKey];
      if (sfx && textureExists(this.scene, UI_ASSETS.statusesAtlas?.key, sfx)) {
        this.statusSprite.setFrame(sfx).setVisible(true);
        this.sublabel.setVisible(false); // hide text sublabel when sprite shown
      } else {
        this.statusSprite.setVisible(false);
        this.sublabel.setVisible(true);
      }
    }

    // HP bar
    const hpPercent = clamp(Number(option.hpPercent ?? 100), 0, 100);
    const hpFrame   = hpPercent > 50 ? 'high' : hpPercent > 20 ? 'medium' : 'low';
    if (textureExists(this.scene, UI_ASSETS.partySlotHpOverlayAtlas.key, hpFrame)) {
      this.hpBarFill.setTexture(UI_ASSETS.partySlotHpOverlayAtlas.key, hpFrame);
    }
    setHorizontalCrop(this.hpBarFill, HP_FILL_WIDTH * (hpPercent / 100));
    this.hpText.setText(option.hpLabel || '');

    // Pokemon icon — load dynamically if URL provided
    if (option.iconUrl) {
      const iconKey = `pkb-party-icon-${option.iconUrl}`;
      if (this.scene.textures.exists(iconKey)) {
        // Already loaded — apply immediately
        this._applyIcon(iconKey);
      } else if (!this.iconPending) {
        // Start loading only if not already in flight for this slot
        this.iconPending = true;
        loadIconTexture(this.scene, iconKey, option.iconUrl, () => {
          this.iconPending = false;
          this._applyIcon(iconKey);
        });
      }
    } else if (this.iconObj) {
      this.iconObj.setVisible(false);
    }

    this.hit.removeAllListeners();
    if (!option.disabled && option.action) {
      this.env.setInteractiveTarget(this.hit, () => { this.handler.getUi().playSelect(); this.handler.globalScene.dispatchAction(option.action); });
    }
  }

  _applyIcon(iconKey) {
    if (!this.scene.textures.exists(iconKey)) return;
    // Use 'frame0' (left half) as starting frame; fall back to default if not registered
    const frameKey = this.scene.textures.get(iconKey).has('frame0') ? 'frame0' : undefined;
    // active slot: icon at (4, 4), bench slot: icon at (2, -4) for 32×32 vertical centering
    const x = this.isActive ? -8 : -10;
    const y = this.isActive ? -4 : -4;
    if (!this.iconObj) {
      this.iconObj = this.scene.add.sprite(x, y, iconKey, frameKey)
        .setOrigin(0, 0).setDisplaySize(32, 32).setName(`party-icon-${this.index}`);
      this.row.add(this.iconObj);
    } else {
      this.iconObj.setTexture(iconKey, frameKey);
    }
    this.iconObj.setVisible(true);
    // 2-frame animation: frame0 ↔ frame1 every 500ms (PokeRogue party icon style)
    if (this.iconAnimTimer) { this.iconAnimTimer.remove(); this.iconAnimTimer = null; }
    if (this.scene.textures.get(iconKey).has('frame1')) {
      this.iconAnimTimer = this.scene.time.addEvent({
        delay: 500,
        loop: true,
        callback: () => {
          if (!this.iconObj?.active) return;
          const next = this.iconObj.frame.name === 'frame0' ? 'frame1' : 'frame0';
          this.iconObj.setFrame(next);
        },
      });
    }
  }

  getCursorPosition() {
    return { x: this.baseX - 4, y: this.slotY - 1 };
  }
}

export class PartyUiHandler extends UiHandler {
  constructor(ui) {
    super(ui, UiMode.PARTY);
    this.globalScene = createGlobalSceneFacade(ui);
    this.partyContainer = null;
    this.partyBg = null;
    this.partyMessageBox = null;
    this.message = null;
    this.cursorObj = null;
    this.cancelBg = null;
    this.cancelPb = null;
    this.cancelLabel = null;
    this.cancelZone = null;
    this.slots = [];
    this.fieldIndex = 0;
  }

  setup() {
    const { scene, env } = this;
    this.container = scene.add.container(0, env.LOGICAL_HEIGHT).setDepth(56).setName('pkb-transplant-party-root').setVisible(false);
    this.partyContainer = this.container;

    this.partyBg = scene.add.image(0, 0, env.UI_ASSETS.partyBg.key).setOrigin(0, 1);

    this.partyMessageBox = addWindow(this.ui, 1, -1, 262, 30).setOrigin(0, 1).setName('window-party-msg-box');
    this.message = addTextObject(this.ui, 10, -23, '', 'WINDOW', {
      wordWrap: { width: 244, useAdvancedWrap: true },
      lineSpacing: 1,
    }).setOrigin(0, 1).setName('text-party-msg');

    this.cursorObj = env.textureExists(scene, env.UI_ASSETS.menuSel.key)
      ? scene.add.image(0, 0, env.UI_ASSETS.menuSel.key).setOrigin(0, 0)
      : addTextObject(this.ui, 0, 0, '▶', 'WINDOW_BATTLE_COMMAND').setOrigin(0, 0);

    // Cancel / footer button — party_cancel frame: 52×16, origin (0, 0.5) → top: y-8, bottom: y+8
    this.cancelBg = env.textureExists(scene, env.UI_ASSETS.partyCancelAtlas.key, 'party_cancel')
      ? scene.add.image(291, -16, env.UI_ASSETS.partyCancelAtlas.key, 'party_cancel').setOrigin(0, 0.5)
      : addWindow(this.ui, 291, -24, 52, 16, env.UI_ASSETS.windowXthin?.key).setOrigin(0, 0);
    this.cancelPb = env.textureExists(scene, env.UI_ASSETS.partyPbAtlas.key, 'party_pb')
      ? scene.add.image(274, -16, env.UI_ASSETS.partyPbAtlas.key, 'party_pb').setOrigin(0.5, 0.5)
      : null;
    this.cancelLabel = addTextObject(this.ui, 281, -23, 'Cancel', 'WINDOW').setOrigin(0, 0);
    // Zone covers the cancel bg area: x=291, y=-24 (top), w=52, h=16
    this.cancelZone = scene.add.rectangle(291, -24, 52, 16, 0xffffff, 0.001).setOrigin(0, 0);

    // slotYs: index 0 = main slot, index 1-5 = bench
    // -149 is integer (was -148.5) to avoid sub-pixel text blur
    const slotYs = [-149, -168, -140, -112, -84, -56];
    this.slots = slotYs.map((slotY, index) => new PartySlot(this, index, slotY));

    this.container.add([
      this.partyBg,
      this.partyMessageBox,
      this.message,
      this.cursorObj,
      this.cancelBg,
      this.cancelLabel,
      this.cancelZone,
      ...(this.cancelPb ? [this.cancelPb] : []),
      ...this.slots.map(slot => slot.setup()),
    ]);
    this.clear();
  }

  show(args = null) {
    const state = args || this.globalScene.getPartyInputModel();
    super.show(state);
    this.partyContainer.setVisible(true);

    // partyModeActive 플래그: ui.js renderModel()이 DOM 스프라이트를 다시 켜는 것을 차단
    this.ui.partyModeActive = true;

    // Hide battle scene DOM sprites (always above canvas) and battle-info containers
    // so the party background fully covers the battle field.
    // Note: BattleTray containers are NOT touched here — they manage their own visibility
    // and start hidden by BattleTray.setup(). Touching them here caused the navy-bar regression.
    if (this.ui.enemySprite?.dom) this.ui.enemySprite.dom.setVisible(false);
    if (this.ui.playerSprite?.dom) this.ui.playerSprite.dom.setVisible(false);
    if (this.ui.enemyInfo?.container) this.ui.enemyInfo.container.setVisible(false);
    if (this.ui.playerInfo?.container) this.ui.playerInfo.container.setVisible(false);

    this.fieldIndex = Number(state.fieldIndex || 0);
    this.message.setText([state.title || '', state.subtitle || ''].filter(Boolean).join('\n'));
    this.slots.forEach((slot, index) => {
      const option = this.globalScene.getPartyOptions()[index] || null;
      slot.update(option);
    });
    const footerAction = this.getFooterAction();
    const cancelVisible = Boolean(footerAction);
    this.cancelBg.setVisible(cancelVisible);
    this.cancelLabel.setVisible(cancelVisible);
    this.cancelZone.setVisible(cancelVisible);
    if (this.cancelPb) this.cancelPb.setVisible(cancelVisible);
    this.cancelLabel.setText(footerAction?.label || '');
    this.cancelZone.removeAllListeners();
    if (footerAction && !footerAction.disabled && footerAction.action) {
      this.env.setInteractiveTarget(this.cancelZone, () => { this.getUi().playSelect(); this.globalScene.dispatchAction(footerAction.action); });
    }
    const selection = this.globalScene.getPartySelectionState(this.getCursor());
    this.setCursor(selection.cursor, true);
    return true;
  }

  getInputModel() {
    return this.globalScene.getPartyInputModel();
  }

  getPartyOptions() {
    return this.getInputModel().partyOptions || [];
  }

  getFooterAction() {
    return (this.getInputModel().footerActions || [])[0] || null;
  }

  setCursor(index, force = false) {
    const selection = this.globalScene.getPartySelectionState(index);
    const nextIndex = selection.cursor;
    const changed = force ? true : super.setCursor(nextIndex);
    if (force) this.cursor = nextIndex;
    const cursorPos = this.getCursorPosition(nextIndex);
    this.cursorObj.setVisible(Boolean(cursorPos));
    if (cursorPos) this.cursorObj.setPosition(cursorPos.x, cursorPos.y);
    return changed;
  }

  getCursorPosition(index) {
    if (index === 6 && this.getFooterAction()) return { x: 286, y: -26 };
    const slot = this.slots[index];
    return slot ? slot.getCursorPosition() : null;
  }

  processInput(button) {
    const result = this.globalScene.resolvePartyInput(this.getCursor(), button);
    let success = false;

    if (result.changed) {
      success = this.setCursor(result.cursor);
    }
    if (result.action) {
      this.globalScene.dispatchAction(result.action);
      success = true;
    }

    if (success) this.getUi().playSelect();
    return success;
  }

  clear() {
    super.clear();
    this.partyContainer?.setVisible(false);
    if (this.cursorObj) this.cursorObj.setVisible(false);

    // Clean up icon animation timers
    this.slots.forEach(s => {
      if (s.iconAnimTimer) { s.iconAnimTimer.remove(); s.iconAnimTimer = null; }
    });

    // partyModeActive 해제: DOM 스프라이트 visibility 복원 허용
    this.ui.partyModeActive = false;

    // Restore battle scene DOM sprites and battle-info containers.
    // BattleTray containers are intentionally NOT restored here — they start hidden and
    // should stay hidden (restoring them here was the navy-bar regression root cause).
    if (this.ui.enemySprite?.dom) this.ui.enemySprite.dom.setVisible(true);
    if (this.ui.playerSprite?.dom) this.ui.playerSprite.dom.setVisible(true);
    if (this.ui.enemyInfo?.container) this.ui.enemyInfo.container.setVisible(true);
    if (this.ui.playerInfo?.container) this.ui.playerInfo.container.setVisible(true);
  }
}
