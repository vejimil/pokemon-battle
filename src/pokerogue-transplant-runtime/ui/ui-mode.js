export const UiMode = Object.freeze({
  MESSAGE: 0,
  COMMAND: 2,
  FIGHT: 3,
  TARGET_SELECT: 5,
  PARTY: 8,
});

export const UiModeName = Object.freeze(Object.fromEntries(Object.entries(UiMode).map(([key, value]) => [value, key])));

const MODE_ALIASES = Object.freeze({
  message: UiMode.MESSAGE,
  command: UiMode.COMMAND,
  fight: UiMode.FIGHT,
  target: UiMode.TARGET_SELECT,
  target_select: UiMode.TARGET_SELECT,
  party: UiMode.PARTY,
});

export function normalizeUiMode(value) {
  if (typeof value === 'number' && UiModeName[value]) return value;
  return MODE_ALIASES[String(value || 'message').toLowerCase()] ?? UiMode.MESSAGE;
}
