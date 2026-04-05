export const Button = Object.freeze({
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
  ACTION: 'action',
  CANCEL: 'cancel',
  MENU: 'menu',
  INFO: 'info',
});

export const Command = Object.freeze({
  FIGHT: 0,
  BALL: 1,
  POKEMON: 2,
  RUN: 3,
  TERA: 4,
});

const KEY_TO_BUTTON = Object.freeze({
  ArrowUp: Button.UP,
  w: Button.UP,
  W: Button.UP,
  ArrowDown: Button.DOWN,
  s: Button.DOWN,
  S: Button.DOWN,
  ArrowLeft: Button.LEFT,
  a: Button.LEFT,
  A: Button.LEFT,
  ArrowRight: Button.RIGHT,
  d: Button.RIGHT,
  D: Button.RIGHT,
  Enter: Button.ACTION,
  ' ': Button.ACTION,
  Spacebar: Button.ACTION,
  z: Button.ACTION,
  Z: Button.ACTION,
  Escape: Button.CANCEL,
  Backspace: Button.CANCEL,
  x: Button.CANCEL,
  X: Button.CANCEL,
  i: Button.INFO,
  I: Button.INFO,
  Tab: Button.MENU,
});

export function buttonFromKeyboardEvent(event) {
  if (!event) return null;
  return KEY_TO_BUTTON[event.key] || null;
}

export function isTypingIntoElement(element) {
  if (!element || typeof element.tagName !== 'string') return false;
  const tag = element.tagName.toUpperCase();
  if (['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(tag)) return true;
  return Boolean(element.isContentEditable);
}
