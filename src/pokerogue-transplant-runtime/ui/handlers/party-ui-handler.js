import { UiHandler } from './ui-handler.js';
import { UiMode } from '../ui-mode.js';
import { Button } from '../facade/input-facade.js';
import { createGlobalSceneFacade } from '../facade/global-scene-facade.js';
import { addTextObject } from '../helpers/text.js';
import { addWindow } from '../helpers/ui-theme.js';

// HP overlay (party_slot_hp_overlay) frame width is 80px
const HP_FILL_WIDTH = 80;
const GENDER_SYMBOL = Object.freeze({ M: '♂', F: '♀' });
const PARTY_OPTION_MAX = 3;

// Cache of icon keys: 'loaded' | 'loading'
const iconTextureCache = new Map();

function t(ui, ko, en) {
  return ui?.uiLanguage === 'ko' ? ko : en;
}

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
    this.selected = false;
    this.transfer = false;
    this.fainted = false;

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
      this.label      = addTextObject(this.ui, 24, 10, '', 'PARTY').setOrigin(0, 0);
      this.levelText  = addTextObject(this.ui, 32, 22, '', 'PARTY').setOrigin(0, 0);
      this.sublabel   = addTextObject(this.ui, 76, 22, '', 'PARTY').setOrigin(0, 0);
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
      this.label      = addTextObject(this.ui, 21, 3, '', 'PARTY').setOrigin(0, 0);
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

  _resolveSlotFrame() {
    const { textureExists, UI_ASSETS } = this.env;
    const atlasKey = this.isActive ? UI_ASSETS.partySlotMainAtlas.key : UI_ASSETS.partySlotAtlas.key;
    const base = this.mainFrame;
    const has = frame => textureExists(this.scene, atlasKey, frame);

    if (this.transfer) {
      const swapSel = `${base}_swap_sel`;
      const swap = `${base}_swap`;
      if (this.selected && has(swapSel)) return swapSel;
      if (has(swap)) return swap;
    }

    if (this.fainted) {
      const fntSel = `${base}_fnt_sel`;
      const fnt = `${base}_fnt`;
      if (this.selected && has(fntSel)) return fntSel;
      if (has(fnt)) return fnt;
    }

    if (this.selected && has(`${base}_sel`)) return `${base}_sel`;
    return base;
  }

  _applySelectionFrame() {
    const { UI_ASSETS } = this.env;
    const atlasKey = this.isActive ? UI_ASSETS.partySlotMainAtlas.key : UI_ASSETS.partySlotAtlas.key;
    this.bgObj.setTexture(atlasKey, this._resolveSlotFrame());
    this.pb.setTexture(UI_ASSETS.partyPbAtlas.key, this.selected ? 'party_pb_sel' : 'party_pb');
  }

  setSelected(selected) {
    const next = Boolean(selected);
    if (this.selected === next) return;
    this.selected = next;
    this._applySelectionFrame();
  }

  setTransfer(transfer) {
    const next = Boolean(transfer);
    if (this.transfer === next) return;
    this.transfer = next;
    this._applySelectionFrame();
  }

  update(option = null) {
    const { textureExists, UI_ASSETS, clamp, setHorizontalCrop } = this.env;
    this.row.setVisible(Boolean(option));
    if (!option) return;

    this.fainted = Boolean(option.fainted);
    this._applySelectionFrame();

    this.label.setText(option.label || '');

    // Level
    const lvStr = option.level != null ? `Lv.${option.level}` : '';
    this.levelText.setText(lvStr);

    // Sublabel (HP + status text)
    const gender = GENDER_SYMBOL[option.gender] || '';
    this.sublabel.setText([gender, option.sublabel || ''].filter(Boolean).join(' '));

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
    if (option) {
      this.env.setInteractiveTarget(this.hit, () => {
        if (this.handler.openPartyOptions(this.index)) this.handler.getUi().playSelect();
        else this.handler.getUi().playError();
      });
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
    this.optionsContainer = null;
    this.optionsBg = null;
    this.optionsCursorObj = null;
    this.optionsItems = [];
    this.optionsMode = false;
    this.optionsCursor = 0;
    this.optionsTargetCursor = null;
    this.infoContainer = null;
    this.infoBg = null;
    this.infoBody = null;
    this.infoHint = null;
    this.infoVisible = false;
    this.slots = [];
    this.fieldIndex = 0;
  }

  setCancelSelected(selected) {
    const isSelected = Boolean(selected);
    if (this.cancelBg?.setTexture && this.env.textureExists(this.scene, this.env.UI_ASSETS.partyCancelAtlas.key, isSelected ? 'party_cancel_sel' : 'party_cancel')) {
      this.cancelBg.setTexture(this.env.UI_ASSETS.partyCancelAtlas.key, isSelected ? 'party_cancel_sel' : 'party_cancel');
    }
    if (this.cancelPb?.setTexture && this.env.textureExists(this.scene, this.env.UI_ASSETS.partyPbAtlas.key, isSelected ? 'party_pb_sel' : 'party_pb')) {
      this.cancelPb.setTexture(this.env.UI_ASSETS.partyPbAtlas.key, isSelected ? 'party_pb_sel' : 'party_pb');
    }
  }

  applyCursorSelection(previousCursor, nextCursor) {
    if (Number.isInteger(previousCursor)) {
      if (previousCursor < 6) this.slots[previousCursor]?.setSelected(false);
      if (previousCursor === 6) this.setCancelSelected(false);
    }
    if (Number.isInteger(nextCursor)) {
      if (nextCursor < 6) this.slots[nextCursor]?.setSelected(true);
      if (nextCursor === 6) this.setCancelSelected(true);
    }
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
    this.cancelLabel = addTextObject(this.ui, 281, -23, t(this.ui, '취소', 'Cancel'), 'PARTY').setOrigin(0, 0);
    // Zone covers the cancel bg area: x=291, y=-24 (top), w=52, h=16
    this.cancelZone = scene.add.rectangle(291, -24, 52, 16, 0xffffff, 0.001).setOrigin(0, 0);

    this.optionsContainer = scene.add.container(env.LOGICAL_WIDTH - 1, -1).setVisible(false).setName('party-options');
    this.optionsBg = addWindow(this.ui, 0, 0, 128, 40).setOrigin(1, 1).setVisible(false);
    this.optionsCursorObj = env.textureExists(scene, env.UI_ASSETS.menuSel.key)
      ? scene.add.image(0, 0, env.UI_ASSETS.menuSel.key).setOrigin(0, 0).setVisible(false)
      : addTextObject(this.ui, 0, 0, '▶', 'WINDOW_BATTLE_COMMAND').setOrigin(0, 0).setVisible(false);
    this.optionsContainer.add([this.optionsBg, this.optionsCursorObj]);

    this.infoContainer = scene.add.container(65, -173).setVisible(false).setName('party-info-popup');
    this.infoBg = addWindow(this.ui, 0, 0, 194, 118).setOrigin(0, 0);
    this.infoBody = addTextObject(this.ui, 8, 8, '', 'PARTY', {
      wordWrap: { width: 178, useAdvancedWrap: true },
      lineSpacing: 1,
    }).setOrigin(0, 0);
    this.infoHint = addTextObject(this.ui, 8, 106, '', 'PARTY').setOrigin(0, 0);
    this.infoContainer.add([this.infoBg, this.infoBody, this.infoHint]);

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
      this.optionsContainer,
      this.infoContainer,
    ]);
    this.clear();
  }

  show(args = null) {
    const state = args || this.globalScene.getPartyInputModel();
    super.show(state);
    this.partyContainer.setVisible(true);
    this.closePartyOptions();
    this.closePartyInfo();

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
      slot.setSelected(false);
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
    this.setCancelSelected(false);
    const selection = this.globalScene.getPartySelectionState(0);
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

  getPartyOptionMenuItems(slotIndex) {
    const option = this.getPartyOptions()[slotIndex] || null;
    if (!option) return [];
    const items = [];
    if (!option.disabled && option.action) {
      items.push({
        label: t(this.ui, '교체한다', 'Switch'),
        execute: () => this.globalScene.dispatchAction(option.action),
      });
    }
    items.push({
      label: t(this.ui, '정보를 확인한다', 'Check Info'),
      execute: () => this.showPartyInfo(slotIndex),
    });
    if (this.getFooterAction()) {
      items.push({
        label: t(this.ui, '취소', 'Cancel'),
        execute: () => {},
      });
    }
    return items.slice(0, PARTY_OPTION_MAX);
  }

  openPartyOptions(slotIndex) {
    if (this.infoVisible) return false;
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= 6) return false;
    const menuItems = this.getPartyOptionMenuItems(slotIndex);
    if (!menuItems.length) return false;

    this.setCursor(slotIndex, true);
    this.closePartyOptions();
    this.optionsItems = menuItems;
    this.optionsMode = true;
    this.optionsCursor = 0;
    this.optionsTargetCursor = slotIndex;

    const panelWidth = 128;
    const rowHeight = 16;
    const panelHeight = Math.max(16, menuItems.length * rowHeight + 4);
    this.optionsBg.setSize?.(panelWidth, panelHeight);
    this.optionsBg.width = panelWidth;
    this.optionsBg.height = panelHeight;
    this.optionsBg.setVisible(true);
    this.optionsContainer.setVisible(true);
    this.optionsCursorObj.setVisible(true);

    this.optionsItems.forEach((item, index) => {
      const rowY = -panelHeight + 2 + index * rowHeight;
      const label = addTextObject(this.ui, -102, rowY, item.label || '', 'WINDOW').setOrigin(0, 0);
      const hit = this.scene.add.rectangle(-108, rowY - 1, panelWidth - 12, rowHeight, 0xffffff, 0.001).setOrigin(0, 0);
      this.optionsContainer.add([hit, label]);
      this.env.setInteractiveTarget(hit, () => {
        this.optionsCursor = index;
        this.refreshOptionsCursorVisual();
        this.confirmOptionSelection();
      });
      item.labelObj = label;
      item.hitObj = hit;
    });
    this.optionsContainer.bringToTop?.(this.optionsCursorObj);

    this.refreshOptionsCursorVisual();
    return true;
  }

  closePartyOptions() {
    this.optionsMode = false;
    this.optionsCursor = 0;
    this.optionsTargetCursor = null;
    this.optionsItems.forEach(item => {
      item.labelObj?.destroy?.();
      item.hitObj?.destroy?.();
    });
    this.optionsItems = [];
    this.optionsCursorObj?.setVisible(false);
    this.optionsBg?.setVisible(false);
    this.optionsContainer?.setVisible(false);
  }

  closePartyInfo() {
    this.infoVisible = false;
    this.infoContainer?.setVisible(false);
    if (this.infoBody) this.infoBody.setText('');
    if (this.infoHint) this.infoHint.setText('');
  }

  processInfoInput(button) {
    if (!this.infoVisible) return false;
    if (button === Button.ACTION || button === Button.CANCEL) {
      this.closePartyInfo();
      this.getUi().playSelect();
      return true;
    }
    if (button === Button.UP || button === Button.DOWN || button === Button.LEFT || button === Button.RIGHT) {
      return true;
    }
    return false;
  }

  refreshOptionsCursorVisual() {
    if (!this.optionsMode || !this.optionsItems.length) return;
    const panelHeight = Number(this.optionsBg?.height || 0);
    const rowHeight = 16;
    const rowY = -panelHeight + 2 + this.optionsCursor * rowHeight;
    this.optionsCursorObj?.setPosition(-114, rowY + 1).setVisible(true);
    this.optionsItems.forEach((item, index) => {
      item.labelObj?.setColor(index === this.optionsCursor ? '#fff6b0' : '#f8f8f8');
    });
  }

  confirmOptionSelection() {
    if (!this.optionsMode) return false;
    const option = this.optionsItems[this.optionsCursor] || null;
    if (!option) return false;
    option.execute?.();
    this.closePartyOptions();
    this.getUi().playSelect();
    return true;
  }

  processOptionsInput(button) {
    if (!this.optionsMode) return false;
    const count = this.optionsItems.length;
    if (!count) {
      this.closePartyOptions();
      return false;
    }
    if (button === Button.CANCEL) {
      this.closePartyOptions();
      this.getUi().playSelect();
      return true;
    }
    if (button === Button.UP || button === Button.DOWN) {
      const delta = button === Button.UP ? -1 : 1;
      this.optionsCursor = (this.optionsCursor + delta + count) % count;
      this.refreshOptionsCursorVisual();
      this.getUi().playSelect();
      return true;
    }
    if (button === Button.ACTION) {
      return this.confirmOptionSelection();
    }
    if (button === Button.LEFT || button === Button.RIGHT) {
      return true;
    }
    return false;
  }

  showPartyInfo(slotIndex) {
    const option = this.getPartyOptions()[slotIndex] || null;
    if (!option) return;
    const levelLabel = option.level != null ? `Lv.${option.level}` : '';
    const statusMap = {
      brn: t(this.ui, '화상', 'Burn'),
      par: t(this.ui, '마비', 'Paralysis'),
      psn: t(this.ui, '중독', 'Poison'),
      tox: t(this.ui, '맹독', 'Badly Poisoned'),
      slp: t(this.ui, '잠듦', 'Sleep'),
      frz: t(this.ui, '얼음', 'Freeze'),
    };
    const statusLabel = statusMap[String(option.statusEffect || '').toLowerCase()]
      || (option.fainted ? t(this.ui, '기절', 'Fainted') : t(this.ui, '정상', 'Healthy'));
    const typeLabel = Array.isArray(option.typeLabels) && option.typeLabels.length
      ? option.typeLabels.join(' / ')
      : t(this.ui, '알 수 없음', 'Unknown');
    const moveLabel = Array.isArray(option.moveLabels) && option.moveLabels.length
      ? option.moveLabels.join(', ')
      : t(this.ui, '기술 없음', 'No moves');
    const detail = [
      [option.label || '', levelLabel].filter(Boolean).join('  '),
      `${t(this.ui, 'HP', 'HP')} ${option.hpLabel || '--/--'}`,
      `${t(this.ui, '상태', 'Status')} ${statusLabel}`,
      `${t(this.ui, '타입', 'Type')} ${typeLabel}`,
      `${t(this.ui, '특성', 'Ability')} ${option.abilityLabel || t(this.ui, '없음', 'None')}`,
      `${t(this.ui, '도구', 'Item')} ${option.itemLabel || t(this.ui, '없음', 'None')}`,
      `${t(this.ui, '기술', 'Moves')} ${moveLabel}`,
    ].join('\n');
    this.infoBody?.setText(detail);
    this.infoHint?.setText(t(this.ui, 'A/B 닫기', 'A/B Close'));
    this.infoVisible = true;
    this.infoContainer?.setVisible(true);
    this.container?.bringToTop?.(this.infoContainer);
  }

  setCursor(index, force = false) {
    const previousCursor = this.getCursor();
    const selection = this.globalScene.getPartySelectionState(index);
    const nextIndex = selection.cursor;
    const changed = force ? previousCursor !== nextIndex : super.setCursor(nextIndex);
    if (force) this.cursor = nextIndex;
    this.applyCursorSelection(previousCursor, nextIndex);
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
    if (this.processInfoInput(button)) return true;
    if (this.processOptionsInput(button)) return true;

    if (button === Button.ACTION) {
      const cursor = this.getCursor();
      if (cursor === 6) {
        const cancelAction = this.getFooterAction();
        if (cancelAction && !cancelAction.disabled && cancelAction.action) {
          this.globalScene.dispatchAction(cancelAction.action);
          this.getUi().playSelect();
          return true;
        }
        this.getUi().playError();
        return false;
      }
      if (cursor < 6) {
        const opened = this.openPartyOptions(cursor);
        if (opened) this.getUi().playSelect();
        else this.getUi().playError();
        return opened;
      }
      return false;
    }

    if (button === Button.CANCEL) {
      const cancelAction = this.getFooterAction();
      if (cancelAction && !cancelAction.disabled && cancelAction.action) {
        this.globalScene.dispatchAction(cancelAction.action);
        this.getUi().playSelect();
        return true;
      }
      return false;
    }

    if (button === Button.UP || button === Button.DOWN || button === Button.LEFT || button === Button.RIGHT) {
      const nextCursor = this.globalScene.movePartySelection(this.getCursor(), button);
      const changed = this.setCursor(nextCursor);
      if (changed) this.getUi().playSelect();
      return changed;
    }

    return false;
  }

  clear() {
    super.clear();
    this.closePartyOptions();
    this.closePartyInfo();
    this.partyContainer?.setVisible(false);
    if (this.cursorObj) this.cursorObj.setVisible(false);

    // Clean up icon animation timers
    this.slots.forEach(s => {
      if (s.iconAnimTimer) { s.iconAnimTimer.remove(); s.iconAnimTimer = null; }
      s.setSelected(false);
    });
    this.setCancelSelected(false);

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
