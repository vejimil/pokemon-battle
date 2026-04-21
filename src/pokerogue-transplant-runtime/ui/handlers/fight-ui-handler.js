import { UiHandler } from './ui-handler.js';
import { UiMode } from '../ui-mode.js';
import { Button } from '../facade/input-facade.js';
import { createGlobalSceneFacade } from '../facade/global-scene-facade.js';
import { addTextObject } from '../helpers/text.js';
import { addWindow } from '../helpers/ui-theme.js';
import { getAuxMenuConfig, getMoveInfoPanelConfig } from '../helpers/fight-layout-tune.js';
import { MoveInfoOverlay } from '../containers/move-info-overlay.js';

// Move stat display: normalize missing/zero values to '---' (matches PokeRogue power/accuracy < 0 → '---')
function formatMoveStatValue(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed || trimmed === '—' || trimmed === '0') return '---';
  return trimmed;
}

// PP ratio → color (matches PokeRogue TextStyle colors, non-legacy theme)
function ppRatioToColor(ratio) {
  if (ratio === null || ratio === undefined) return { color: '#f8f8f8', shadow: '#6b5a73' };
  if (ratio === 0)       return { color: '#e13d3d', shadow: '#632929' };
  if (ratio <= 0.25)     return { color: '#d64b00', shadow: '#69402a' };
  if (ratio <= 0.5)      return { color: '#ccbe00', shadow: '#6e672c' };
  return                        { color: '#f8f8f8', shadow: '#6b5a73' };
}

export class FightUiHandler extends UiHandler {
  static MOVES_CONTAINER_NAME = 'moves';

  constructor(ui) {
    super(ui, UiMode.FIGHT);
    this.globalScene = createGlobalSceneFacade(ui);
    this.movesContainer = null;
    this.moveInfoContainer = null;
    this.cursorObj = null;
    this.moveButtons = [];
    this.typeIcon = null;
    this.moveCategoryIcon = null;
    this.ppLabel = null;
    this.ppText = null;
    this.powerLabel = null;
    this.powerText = null;
    this.auxMenuContainer = null;
    this.auxMenuBg = null;
    this.auxEntries = [];
    this.auxEntryModel = [];
    this.activeToggles = [];
    this.activeFooterActions = [];
    this.fieldIndex = 0;
    this.cursor2 = 0;
    this.focusRegion = 'moves';
    this.toggleCursor = 0;
    this.footerCursor = 0;
    this.infoVisible = false;
    this.moveInfoOverlay = null;
    this.moveInfoPanelConfig = getMoveInfoPanelConfig();
    this.auxMenuConfig = getAuxMenuConfig();
  }

  setup() {
    const { scene, env } = this;
    this.container = scene.add.container(0, env.LOGICAL_HEIGHT).setDepth(55).setName('pkb-transplant-fight');

    this.movesContainer = scene.add.container(18, -39).setName(FightUiHandler.MOVES_CONTAINER_NAME);
    this.container.add(this.movesContainer);

    // PokeRogue uses default origin (0.5, 0.5) for the cursor image
    this.cursorObj = env.textureExists(scene, env.UI_ASSETS.cursor.key)
      ? scene.add.image(0, 0, env.UI_ASSETS.cursor.key)
      : addTextObject(this.ui, 0, 0, '▶', 'WINDOW_BATTLE_COMMAND').setOrigin(0, 0);
    this.container.add(this.cursorObj);

    this.moveButtons = Array.from({ length: 4 }, (_, moveIndex) => {
      const x = moveIndex % 2 === 0 ? 0 : 114;
      const y = moveIndex < 2 ? 0 : 16;
      const hit = scene.add.rectangle(x - 6, y - 2, 110, 14, 0xffffff, 0.001).setOrigin(0, 0);
      const label = addTextObject(this.ui, x, y, '', 'WINDOW_BATTLE_COMMAND', {
        wordWrap: { width: 98, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      this.movesContainer.add([hit, label]);
      return { x, y, hit, label };
    });

    this.moveInfoPanelConfig = getMoveInfoPanelConfig();
    this.moveInfoContainer = scene
      .add.container(1 + this.moveInfoPanelConfig.xOffset, this.moveInfoPanelConfig.yOffset)
      .setName('move-info');
    // PokeRogue 원본 fight UI 오른쪽 패널 레이아웃 (scaledCanvas.width=320 기준):
    //   row1 y=-36: typeIcon(263) + moveCategoryIcon(295)
    //   row2 y=-26: ppLabel(250) + ppText(308)
    //   row3 y=-18: powerLabel(250) + powerText(308)
    // 정확도 행은 제거했지만, 남은 2개 행은 원본 y 간격을 유지해 텍스트가 눌려 보이지 않게 한다.
    // 원본 scale: typeIcon=0.8 (fight-ui-handler.ts:269), moveCategoryIcon=1.0 (line 272)
    this.typeIcon = env.textureExists(scene, env.UI_ASSETS.typesAtlas.key, 'unknown')
      ? scene.add.sprite(263, -36, env.UI_ASSETS.typesAtlas.key, 'unknown').setScale(0.8).setVisible(false)
      : addTextObject(this.ui, 263, -36, '', 'MOVE_INFO_CONTENT').setOrigin(0.5, 0.5).setVisible(false);
    this.moveCategoryIcon = env.textureExists(scene, env.UI_ASSETS.categoriesAtlas.key, 'status')
      ? scene.add.sprite(295, -36, env.UI_ASSETS.categoriesAtlas.key, 'status').setScale(1.0).setVisible(false)
      : addTextObject(this.ui, 295, -36, '', 'MOVE_INFO_CONTENT').setOrigin(0.5, 0.5).setVisible(false);
    this.ppLabel = addTextObject(this.ui, 250, -26, 'PP', 'MOVE_INFO_CONTENT').setOrigin(0, 0.5).setVisible(false);
    this.ppText = addTextObject(this.ui, 308, -26, '--/--', 'MOVE_INFO_CONTENT').setOrigin(1, 0.5).setVisible(false);
    this.powerLabel = addTextObject(this.ui, 250, -18, '', 'MOVE_INFO_CONTENT').setOrigin(0, 0.5).setVisible(false);
    this.powerText = addTextObject(this.ui, 308, -18, '---', 'MOVE_INFO_CONTENT').setOrigin(1, 0.5).setVisible(false);
    this.moveInfoContainer.add([
      this.typeIcon,
      this.moveCategoryIcon,
      this.ppLabel,
      this.ppText,
      this.powerLabel,
      this.powerText,
    ]);
    this.container.add(this.moveInfoContainer);

    this.moveInfoOverlay = new MoveInfoOverlay(this.ui, {
      delayVisibility: true,
      onSide: true,
      right: true,
      x: 0,
      y: -MoveInfoOverlay.getHeight(true),
      width: env.LOGICAL_WIDTH + 4,
      hideEffectBox: true,
      hideBg: true,
    });
    this.container.add(this.moveInfoOverlay.container);

    // Left-top auxiliary action window: gimmicks + back in a vertical list.
    this.auxMenuConfig = getAuxMenuConfig();
    this.auxMenuContainer = scene.add.container(this.auxMenuConfig.x, this.auxMenuConfig.y).setName('fight-aux-menu').setVisible(false);
    this.auxMenuBg = addWindow(
      this.ui,
      0,
      0,
      this.auxMenuConfig.minWidth,
      this.auxMenuConfig.rowHeight + this.auxMenuConfig.topPadding + this.auxMenuConfig.bottomPadding
    ).setOrigin(0, 0);
    this.auxMenuContainer.add(this.auxMenuBg);
    this.auxEntries = Array.from({ length: 6 }, () => {
      const label = addTextObject(this.ui, 0, 0, '', this.auxMenuConfig.textStyle)
        .setOrigin(0.5, 0.5)
        .setVisible(false);
      label.setAlign?.('center');
      // addTextObject already applies base pixel-text scale; keep it and multiply from that baseline.
      label._pkbBaseScaleX = Number(label.scaleX || 1);
      label._pkbBaseScaleY = Number(label.scaleY || 1);
      label.setScale(label._pkbBaseScaleX * this.auxMenuConfig.textScale, label._pkbBaseScaleY * this.auxMenuConfig.textScale);
      const hit = scene.add.rectangle(
        this.auxMenuConfig.sideInset,
        this.auxMenuConfig.topPadding,
        this.auxMenuConfig.minWidth - this.auxMenuConfig.sideInset * 2,
        this.auxMenuConfig.rowHeight,
        0xffffff,
        0.001
      ).setOrigin(0, 0).setVisible(false);
      this.auxMenuContainer.add([hit, label]);
      return { label, hit };
    });
    this.container.add(this.auxMenuContainer);

    this.clear();
  }

  getInputModel() {
    return this.globalScene.getFightInputModel();
  }

  getSelectionState() {
    return {
      focusRegion: this.focusRegion,
      moveCursor: this.getCursor(),
      toggleCursor: this.toggleCursor,
      footerCursor: this.footerCursor,
    };
  }

  applySelectionState(selection) {
    const normalized = this.globalScene.getFightSelectionState(selection);
    this.focusRegion = normalized.focusRegion;
    this.toggleCursor = normalized.toggleCursor;
    this.footerCursor = normalized.footerCursor;
    this.setCursor(normalized.moveCursor);
    this.applyFocusVisuals();
    return normalized;
  }

  show(args = null) {
    const state = args || this.getInputModel();
    super.show(state);
    this.moveInfoPanelConfig = getMoveInfoPanelConfig();
    this.moveInfoContainer?.setPosition(1 + this.moveInfoPanelConfig.xOffset, this.moveInfoPanelConfig.yOffset);
    this.fieldIndex = Number(state.fieldIndex || 0);
    const battleMessage = this.ui.getMessageHandler();
    battleMessage.bg.setVisible(false);
    battleMessage.commandWindow.setVisible(false);
    battleMessage.movesWindowContainer.setVisible(true);
    // Clear any lingering message text (e.g. "기술을 선택하세요") that overlaps move buttons
    battleMessage.message?.setText?.('');

    this.moveButtons.forEach((button, index) => {
      const move = this.getMoves()[index] || { label: '', disabled: true };
      button.label.setText(move.label || '');
      button.label.setAlpha(move.disabled ? 0.42 : 1);
      button.label.setColor(move.disabled ? '#64748b' : '#f8fbff');
      button.hit.removeAllListeners();
      if (!move.disabled) {
        const hoverAction = move.focusAction ? () => this.globalScene.dispatchAction(move.focusAction) : null;
        this.env.setInteractiveTarget(button.hit, move.action ? () => { this.getUi().playSelect(); this.globalScene.dispatchAction(move.action); } : null, hoverAction);
      } else {
        this.env.setInteractiveTarget(button.hit, () => this.getUi().playError());
      }
    });

    this.updateMoveDetail(state.detail || {});
    this.updateToggles(this.getToggles());
    this.updateFooterActions(this.getFooterActions());
    this.applySelectionState(this.getSelectionState());
    this.toggleInfo(this.infoVisible);
    return true;
  }

  getMoves() {
    return this.getInputModel().moves || [];
  }

  getToggles() {
    return this.getInputModel().toggles || [];
  }

  getFooterActions() {
    return this.getInputModel().footerActions || [];
  }

  getCursor() {
    return this.fieldIndex ? this.cursor2 : this.cursor;
  }

  setCursor(cursor) {
    const moves = this.getMoves();
    const maxIndex = Math.max(0, Math.min(moves.length - 1, 3));
    const nextCursor = Math.max(0, Math.min(cursor, maxIndex));
    const changed = this.getCursor() !== nextCursor;
    if (changed) {
      if (this.fieldIndex) this.cursor2 = nextCursor;
      else this.cursor = nextCursor;
    }
    this.applyFocusVisuals();
    return changed;
  }

  getCursorPositions() {
    return [
      { x: 13, y: -31 },
      { x: 127, y: -31 },
      { x: 13, y: -16 },
      { x: 127, y: -16 },
    ];
  }

  applyFocusVisuals() {
    const cursorPos = this.getCursorPositions()[this.getCursor()] || this.getCursorPositions()[0];
    const showCursor = this.focusRegion === 'moves' && !this.infoVisible;
    this.cursorObj.setPosition(cursorPos.x, cursorPos.y).setVisible(showCursor);

    const focusedAuxIndex = this.getFocusedAuxIndex();
    this.auxEntries.forEach((entry, index) => {
      const model = this.auxEntryModel[index];
      if (!model) return;
      const isFocused = focusedAuxIndex === index;
      const color = model.disabled
        ? (isFocused ? '#cbd5e1' : '#94a3b8')
        : (isFocused ? '#fff6b0' : '#f8fbff');
      entry.label.setColor(color);
    });
  }

  processInput(button) {
    const result = this.globalScene.resolveFightInput(this.getSelectionState(), button);
    let success = false;

    if (result.changed) {
      this.applySelectionState(result.selection);
      success = true;
    }
    if (result.focusAction) {
      this.globalScene.dispatchAction(result.focusAction);
    }
    if (result.action) {
      this.globalScene.dispatchAction(result.action);
      success = true;
    }

    if (success) this.getUi().playSelect();
    return success;
  }

  toggleInfo(visible) {
    this.infoVisible = Boolean(visible);
    if (visible) {
      // Instantly hide — matches PokeRogue (overlay fades in, names hide immediately)
      this.movesContainer.setVisible(false).setAlpha(0);
      this.cursorObj?.setVisible(false).setAlpha(0);
    } else {
      // Fade-in tween on movesContainer — matches PokeRogue's toggleInfo(false)
      this.movesContainer.setVisible(true);
      this.cursorObj?.setVisible(this.focusRegion === 'moves');
      this.scene.tweens?.add?.({
        targets: [this.movesContainer, this.cursorObj].filter(Boolean),
        alpha: 1,
        duration: 125,
        ease: 'Sine.easeInOut',
      });
    }
    this.moveInfoOverlay?.toggleInfo?.(this.infoVisible);
    return true;
  }

  updateMoveDetail(detail = {}) {
    // 원본 setInfoVis(hasMove): moveInfoContainer 전체 visibility 일괄 제어 (fight-ui-handler.ts:259-262)
    const hasMove = Boolean(detail && detail.name);
    this.moveInfoContainer.iterate(o => o.setVisible?.(hasMove));

    if (!hasMove) {
      this.moveInfoOverlay?.clear?.();
      return;
    }

    if (this.typeIcon.setTexture) {
      const typesKey = this.ui.uiLanguage === 'ko' && this.env.textureExists(this.scene, this.env.UI_ASSETS.typesKoAtlas.key, detail.type)
        ? this.env.UI_ASSETS.typesKoAtlas.key
        : this.env.UI_ASSETS.typesAtlas.key;
      if (this.env.textureExists(this.scene, typesKey, detail.type || 'unknown')) {
        // 원본: setTexture(...).setScale(0.8) (fight-ui-handler.ts:269)
        this.typeIcon.setTexture(typesKey, detail.type || 'unknown').setScale(0.8);
        this.typeIcon.setVisible(true);
      } else {
        this.typeIcon.setVisible(false);
      }
    } else {
      this.typeIcon.setText(detail.typeLabel || '');
    }

    if (this.moveCategoryIcon.setTexture) {
      if (this.env.textureExists(this.scene, this.env.UI_ASSETS.categoriesAtlas.key, detail.category || 'status')) {
        // 원본: setTexture(...).setScale(1.0) (fight-ui-handler.ts:272)
        this.moveCategoryIcon.setTexture(this.env.UI_ASSETS.categoriesAtlas.key, detail.category || 'status').setScale(1.0);
        this.moveCategoryIcon.setVisible(true);
      } else {
        this.moveCategoryIcon.setVisible(false);
      }
    } else {
      this.moveCategoryIcon.setText(detail.category || '');
    }

    this.ppText.setText(detail.ppLabel || '--/--');
    const ppColors = ppRatioToColor(detail.ppRatio ?? null);
    this.ppText.setColor(ppColors.color).setShadowColor(ppColors.shadow);

    // POWER label localized by ui language (ko: 위력, en: Power)
    const isKo = this.ui.uiLanguage === 'ko';
    this.powerLabel?.setText(isKo ? '위력' : 'Power');
    this.powerText?.setText(formatMoveStatValue(detail.powerLabel));
    this.moveInfoOverlay?.show?.(detail);
  }

  updateToggles(toggles = []) {
    this.activeToggles = Array.isArray(toggles) ? toggles : [];
    this.renderAuxMenu();
  }

  updateFooterActions(actions = []) {
    this.activeFooterActions = Array.isArray(actions) ? actions : [];
    this.renderAuxMenu();
  }

  getFocusedAuxIndex() {
    if (this.focusRegion === 'toggles') {
      return this.toggleCursor < this.activeToggles.length ? this.toggleCursor : -1;
    }
    if (this.focusRegion === 'footer') {
      const backCount = this.activeFooterActions[0] ? 1 : 0;
      return backCount && this.footerCursor === 0 ? this.activeToggles.length : -1;
    }
    return -1;
  }

  renderAuxMenu() {
    this.auxMenuConfig = getAuxMenuConfig();
    this.auxMenuContainer?.setPosition(this.auxMenuConfig.x, this.auxMenuConfig.y);

    const backAction = this.activeFooterActions[0] || null;
    this.auxEntryModel = [...this.activeToggles, ...(backAction ? [backAction] : [])].slice(0, this.auxEntries.length);
    const count = this.auxEntryModel.length;
    this.auxMenuContainer?.setVisible(count > 0);
    if (!count) return;

    let panelWidth = this.auxMenuConfig.minWidth;

    this.auxEntries.forEach((entry, index) => {
      const model = this.auxEntryModel[index] || null;
      if (!model) return;
      const baseScaleX = Number(entry.label._pkbBaseScaleX || entry.label.scaleX || 1);
      const baseScaleY = Number(entry.label._pkbBaseScaleY || entry.label.scaleY || 1);
      entry.label.setScale(baseScaleX * this.auxMenuConfig.textScale, baseScaleY * this.auxMenuConfig.textScale);
      entry.label.setText(model.label || '');
      panelWidth = Math.max(
        panelWidth,
        Math.ceil(entry.label.displayWidth || 0) + this.auxMenuConfig.sideInset * 2 + Math.abs(this.auxMenuConfig.textOffsetX) * 2 + 6
      );
    });

    panelWidth = Math.min(panelWidth, this.auxMenuConfig.maxWidth);
    const panelHeight = Math.max(
      this.auxMenuConfig.rowHeight + this.auxMenuConfig.topPadding + this.auxMenuConfig.bottomPadding,
      count * this.auxMenuConfig.rowHeight + this.auxMenuConfig.topPadding + this.auxMenuConfig.bottomPadding
    );
    this.auxMenuBg.setSize?.(panelWidth, panelHeight);
    this.auxMenuBg.setDisplaySize?.(panelWidth, panelHeight);
    this.auxMenuBg.width = panelWidth;
    this.auxMenuBg.height = panelHeight;

    this.auxEntries.forEach((entry, index) => {
      const model = this.auxEntryModel[index] || null;
      entry.label.setVisible(Boolean(model));
      entry.hit.setVisible(Boolean(model));
      if (!model) return;

      const rowY = this.auxMenuConfig.topPadding + index * this.auxMenuConfig.rowHeight;
      const labelX = panelWidth / 2 + this.auxMenuConfig.textOffsetX;
      const labelY = rowY + this.auxMenuConfig.rowHeight / 2 + this.auxMenuConfig.textOffsetY;
      entry.label.setPosition(labelX, labelY);
      entry.label.setText(model.label || '');
      entry.label.setColor(model.disabled ? '#94a3b8' : '#f8fbff');
      entry.hit
        .setPosition(this.auxMenuConfig.sideInset, rowY)
        .setSize(panelWidth - this.auxMenuConfig.sideInset * 2, this.auxMenuConfig.rowHeight);
      entry.hit.removeAllListeners();
      if (!model.disabled && model.action) {
        this.env.setInteractiveTarget(entry.hit, () => {
          this.getUi().playSelect();
          this.globalScene.dispatchAction(model.action);
        });
      }
    });
    this.applyFocusVisuals();
  }

  clear() {
    super.clear();
    const messageHandler = this.getUi().getMessageHandler();
    messageHandler.movesWindowContainer?.setVisible(false);
    messageHandler.bg?.setVisible(true);
    this.infoVisible = false;
    if (this.cursorObj) this.cursorObj.setVisible(false);
    // 원본 clear(): setInfoVis(false) — moveInfoContainer 전체 숨김 (fight-ui-handler.ts:408-409)
    this.moveInfoContainer?.iterate(o => o.setVisible?.(false));
    this.moveInfoOverlay?.clear?.();
    this.activeToggles = [];
    this.activeFooterActions = [];
    this.auxEntryModel = [];
    this.auxMenuContainer?.setVisible(false);
  }
}
