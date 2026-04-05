export function addWindow(ui, x, y, width, height, key = ui.env.UI_ASSETS.window.key) {
  return ui.env.addWindow(ui.scene, x, y, width, height, key);
}
