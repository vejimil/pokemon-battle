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

  dispatchAction(action) {
    this.controller?.handleAction?.(action);
  }

  textureExists(key, frame = null) {
    return this.env.textureExists(this.scene, key, frame);
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

  getTargetState() {
    return this.adapter?.getTargetState?.() || {};
  }

  getTargetFooterActions() {
    return this.adapter?.getTargetFooterActions?.() || [];
  }

  getTargetInputModel() {
    return this.adapter?.getTargetInputModel?.() || { fieldIndex: 0, footerActions: [] };
  }

  getUiArgs(mode = this.mode) {
    return this.adapter?.getUiArgsForMode?.(mode) || {};
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
