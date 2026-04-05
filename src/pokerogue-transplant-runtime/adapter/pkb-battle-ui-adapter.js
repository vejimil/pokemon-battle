import { UiMode, normalizeUiMode } from '../ui/ui-mode.js';

function normalizeMessageText(message = {}, stateWindow = {}) {
  const primary = String(message.primaryText || '').trim();
  const secondary = String(message.secondaryText || '').trim();
  const placeholder = String(stateWindow.placeholder || '').trim();
  const text = [primary, secondary].filter(Boolean).join('\n') || placeholder || '';
  return {
    text,
    primaryText: primary || text,
    secondaryText: secondary,
    showPrompt: Boolean(message.showPrompt),
    speaker: message.speaker || '',
  };
}

export class PkbBattleUiAdapter {
  constructor() {
    this.model = {};
    this.stateWindow = {};
    this.mode = UiMode.MESSAGE;
  }

  setModel(model = {}) {
    this.model = model || {};
    this.stateWindow = this.model.stateWindow || {};
    this.mode = normalizeUiMode(this.stateWindow.mode);
    return this;
  }

  getModel() {
    return this.model || {};
  }

  getMode() {
    return this.mode;
  }

  getMessageState() {
    return normalizeMessageText(this.model.message || {}, this.stateWindow || {});
  }

  getStateWindow() {
    return this.stateWindow || {};
  }

  getCommandState() {
    return this.mode === UiMode.COMMAND ? (this.stateWindow || {}) : { commands: [] };
  }

  getFightState() {
    return this.mode === UiMode.FIGHT ? (this.stateWindow || {}) : { moves: [], detail: {} };
  }

  getPartyState() {
    return this.mode === UiMode.PARTY ? (this.stateWindow || {}) : { partyOptions: [] };
  }

  getTargetState() {
    return this.mode === UiMode.TARGET_SELECT ? (this.stateWindow || {}) : {};
  }

  getUiArgsForMode(mode = this.mode) {
    const normalizedMode = normalizeUiMode(mode);
    switch (normalizedMode) {
      case UiMode.COMMAND:
        return this.getCommandState();
      case UiMode.FIGHT:
        return this.getFightState();
      case UiMode.PARTY:
        return this.getPartyState();
      case UiMode.TARGET_SELECT:
        return this.getTargetState();
      case UiMode.MESSAGE:
      default:
        return this.getMessageState();
    }
  }

  getEnemyInfo() {
    return this.model.enemyInfo || {};
  }

  getPlayerInfo() {
    return this.model.playerInfo || {};
  }

  getEnemyTray() {
    return this.model.enemyTray || [];
  }

  getPlayerTray() {
    return this.model.playerTray || [];
  }

  getAbilityBar() {
    return this.model.abilityBar || null;
  }

  getSpriteModel(side) {
    return side === 'enemy' ? (this.model.enemySprite || {}) : (this.model.playerSprite || {});
  }

  getPerspectiveOptions() {
    return this.model.perspectiveOptions || [];
  }

  getBlockedReason() {
    return this.stateWindow?.blockedReason || '';
  }
}
