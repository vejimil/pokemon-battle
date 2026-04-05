export class UiHandler {
  constructor(ui, mode = null) {
    this.ui = ui;
    this.scene = ui.scene;
    this.controller = ui.controller;
    this.env = ui.env;
    this.mode = mode;
    this.cursor = 0;
    this.active = false;
    this.container = null;
  }

  setup() {}

  show(_args = {}) {
    this.active = true;
    if (this.container) this.container.setVisible(true);
    return true;
  }

  processInput(_button) {
    return false;
  }

  toggleInfo(_visible) {
    return false;
  }

  getUi() {
    return this.ui;
  }

  getCursor() {
    return this.cursor;
  }

  setCursor(cursor) {
    const changed = this.cursor !== cursor;
    if (changed) this.cursor = cursor;
    return changed;
  }

  clear() {
    this.active = false;
    if (this.container) this.container.setVisible(false);
  }

  destroy() {}
}
