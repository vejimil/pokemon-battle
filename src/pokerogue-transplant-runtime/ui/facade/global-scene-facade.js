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

  dispatchAction(action) {
    this.controller?.handleAction?.(action);
  }

  textureExists(key, frame = null) {
    return this.env.textureExists(this.scene, key, frame);
  }
}

export function createGlobalSceneFacade(ui) {
  return new TransplantGlobalSceneFacade(ui);
}
