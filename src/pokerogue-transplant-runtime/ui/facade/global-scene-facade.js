export class TransplantGlobalSceneFacade {
  constructor(ui) {
    this.ui = ui;
    this.scene = ui.scene;
    this.controller = ui.controller;
    this.env = ui.env;
    this.adapter = ui.adapter;
    this.scaledCanvas = Object.freeze({
      width: ui.env.LOGICAL_WIDTH,
      height: ui.env.LOGICAL_HEIGHT,
    });
    this.add = ui.scene.add;
    this.textures = ui.scene.textures;
    this.anims = ui.scene.anims;
    this.time = ui.scene.time;
    this.tweens = ui.scene.tweens;
    this.input = ui.scene.input;
  }

  get currentBattle() {
    return this.adapter?.getModel?.() || {};
  }

  get uiState() {
    return this.adapter?.getStateWindow?.() || {};
  }

  get mode() {
    return this.adapter?.getMode?.() ?? this.ui.mode;
  }

  get modeChain() {
    return this.ui?.getModeChain?.() || [];
  }

  get modeChainEntries() {
    return this.ui?.getModeChainEntries?.() || [];
  }

  dispatchAction(action) {
    this.controller?.handleAction?.(action);
  }

  textureExists(key, frame = null) {
    return this.env.textureExists(this.scene, key, frame);
  }

  canProcessInfoButton(mode = this.mode) {
    return this.adapter?.canProcessInfoButton?.(mode) ?? false;
  }

  getMessageState() {
    return this.adapter?.getMessageState?.() || {};
  }

  getCommandState() {
    return this.adapter?.getCommandState?.() || { commands: [] };
  }

  getCommandEntries() {
    return this.adapter?.getCommandEntries?.() || [];
  }

  getTeraToggle() {
    return this.adapter?.getTeraToggle?.() || null;
  }

  getCommandInputModel() {
    return this.adapter?.getCommandInputModel?.() || { fieldIndex: 0, entries: [], teraToggle: null };
  }

  getCommandSelectionState(previousCursor = null) {
    return this.adapter?.getCommandSelectionState?.(previousCursor) || { cursor: 0, entries: [], teraToggle: null, canTera: false };
  }

  moveCommandSelection(currentCursor, button) {
    return this.adapter?.moveCommandSelection?.(currentCursor, button) ?? currentCursor;
  }

  getCommandSubmitAction(currentCursor) {
    return this.adapter?.getCommandSubmitAction?.(currentCursor) || null;
  }

  getFightState() {
    return this.adapter?.getFightState?.() || { moves: [], detail: {} };
  }

  getFightMoves() {
    return this.adapter?.getFightMoves?.() || [];
  }

  getFightToggles() {
    return this.adapter?.getFightToggles?.() || [];
  }

  getFightFooterActions() {
    return this.adapter?.getFightFooterActions?.() || [];
  }

  getFightInputModel() {
    return this.adapter?.getFightInputModel?.() || { fieldIndex: 0, moves: [], toggles: [], footerActions: [], detail: {} };
  }

  getFightSelectionState(previousSelection = {}) {
    return this.adapter?.getFightSelectionState?.(previousSelection) || {
      focusRegion: 'moves',
      moveCursor: 0,
      toggleCursor: 0,
      footerCursor: 0,
      moves: [],
      toggles: [],
      footerActions: [],
    };
  }

  moveFightSelection(currentSelection = {}, button) {
    return this.adapter?.moveFightSelection?.(currentSelection, button) || this.getFightSelectionState(currentSelection);
  }

  getFightSelectionFocusAction(currentSelection = {}) {
    return this.adapter?.getFightSelectionFocusAction?.(currentSelection) || null;
  }

  getFightSelectionSubmitAction(currentSelection = {}) {
    return this.adapter?.getFightSelectionSubmitAction?.(currentSelection) || null;
  }

  getFightCancelResult(currentSelection = {}) {
    return this.adapter?.getFightCancelResult?.(currentSelection) || { selection: this.getFightSelectionState(currentSelection), action: null };
  }

  getPartyState() {
    return this.adapter?.getPartyState?.() || { partyOptions: [] };
  }

  getPartyOptions() {
    return this.adapter?.getPartyOptions?.() || [];
  }

  getPartyFooterActions() {
    return this.adapter?.getPartyFooterActions?.() || [];
  }

  getPartyInputModel() {
    return this.adapter?.getPartyInputModel?.() || { fieldIndex: 0, partyOptions: [], footerActions: [] };
  }

  getPartySelectionState(previousCursor = null) {
    return this.adapter?.getPartySelectionState?.(previousCursor) || { cursor: 0, partyOptions: [], footerActions: [], footerAction: null };
  }

  movePartySelection(currentCursor, button) {
    return this.adapter?.movePartySelection?.(currentCursor, button) ?? currentCursor;
  }

  getPartySelectionSubmitAction(currentCursor) {
    return this.adapter?.getPartySelectionSubmitAction?.(currentCursor) || null;
  }

  getPartyCancelAction() {
    return this.adapter?.getPartyCancelAction?.() || null;
  }

  getTargetState() {
    return this.adapter?.getTargetState?.() || {};
  }

  getTargetFooterActions() {
    return this.adapter?.getTargetFooterActions?.() || [];
  }

  getTargetInputModel() {
    return this.adapter?.getTargetInputModel?.() || { fieldIndex: 0, footerActions: [] };
  }

  getTargetSelectionState(previousCursor = null) {
    return this.adapter?.getTargetSelectionState?.(previousCursor) || { cursor: 0, targets: [], footerActions: [] };
  }

  getTargetBackAction() {
    return this.adapter?.getTargetBackAction?.() || null;
  }

  getUiArgs(mode = this.mode) {
    return this.ui?.getArgsForMode?.(mode) || this.adapter?.getUiArgsForMode?.(mode) || {};
  }

  getCurrentModeArgs() {
    return this.ui?.getCurrentModeArgs?.() || this.getUiArgs(this.mode);
  }

  resolveCommandInput(currentCursor, button) {
    return this.adapter?.resolveCommandInput?.(currentCursor, button) || { cursor: currentCursor, action: null, changed: false };
  }

  resolveFightInput(currentSelection = {}, button) {
    return this.adapter?.resolveFightInput?.(currentSelection, button) || {
      selection: this.getFightSelectionState(currentSelection),
      action: null,
      focusAction: null,
      changed: false,
    };
  }

  resolvePartyInput(currentCursor, button) {
    return this.adapter?.resolvePartyInput?.(currentCursor, button) || { cursor: currentCursor, action: null, changed: false };
  }

  resolveTargetInput(currentCursor, button) {
    return this.adapter?.resolveTargetInput?.(currentCursor, button) || { cursor: currentCursor, action: null, changed: false, handled: false };
  }

  getBlockedReason() {
    return this.adapter?.getBlockedReason?.() || '';
  }

  getPerspectiveOptions() {
    return this.adapter?.getPerspectiveOptions?.() || [];
  }

  focusMove(moveIndex) {
    const move = this.getFightMoves()[moveIndex] || null;
    if (move?.focusAction) {
      this.dispatchAction(move.focusAction);
      return true;
    }
    return false;
  }

  setMode(mode, args = null) {
    return this.ui?.setMode?.(mode, args);
  }

  setModeWithoutClear(mode, args = null) {
    return this.ui?.setModeWithoutClear?.(mode, args);
  }

  setOverlayMode(mode, args = null) {
    return this.ui?.setOverlayMode?.(mode, args);
  }

  revertMode() {
    return this.ui?.revertMode?.() ?? false;
  }

  resetModeChain() {
    this.ui?.resetModeChain?.();
  }
}

export function createGlobalSceneFacade(ui) {
  return new TransplantGlobalSceneFacade(ui);
}
