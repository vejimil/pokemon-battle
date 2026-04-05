import { addWindow as buildWindow } from '../../runtime/phaser-utils.js';

export function addWindow(ui, x, y, width, height, key = ui.env.UI_ASSETS.window.key) {
  const addWindowImpl = ui?.env?.addWindow || buildWindow;
  return addWindowImpl(ui.scene, x, y, width, height, key);
}
