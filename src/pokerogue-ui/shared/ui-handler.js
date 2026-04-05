class UiHandler {
  constructor(root, mode) {
    this.root = root;
    this.scene = root.scene;
    this.controller = root.controller;
    this.env = root.env;
    this.mode = mode;
    this.container = null;
  }

  setup() {}

  show(_model = {}) {
    if (this.container) this.container.setVisible(true);
  }

  hide() {
    if (this.container) this.container.setVisible(false);
  }

  clear() {
    this.hide();
  }
}

export { UiHandler };
