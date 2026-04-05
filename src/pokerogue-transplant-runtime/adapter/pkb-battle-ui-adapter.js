import { UiMode, normalizeUiMode } from '../ui/ui-mode.js';

function normalizeMessageText(message = {}, stateWindow = {}) {
  const text = String(message.text || '').trim();
  const placeholder = String(stateWindow.placeholder || '').trim();
  const primary = text || placeholder || '';
  const secondary = text && placeholder ? placeholder : '';
  return {
    primaryText: primary || text,
    secondaryText: secondary,
    showPrompt: Boolean(message.showPrompt),
    speaker: message.speaker || '',
  };
}

function clampIndex(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function findFirstEnabledIndex(entries = []) {
  const index = entries.findIndex(entry => entry && !entry.disabled);
  return index >= 0 ? index : 0;
}

function sanitizeCommandSelection(selection, entries = [], teraToggle = null) {
  if (selection?.kind === 'tera' && teraToggle && !teraToggle.disabled) {
    return { kind: 'tera', index: 4 };
  }
  const maxIndex = Math.max(0, entries.length - 1);
  let index = clampIndex(selection?.index ?? findFirstEnabledIndex(entries), 0, maxIndex);
  if (!entries[index] || entries[index].disabled) {
    index = findFirstEnabledIndex(entries);
  }
  return { kind: 'command', index };
}

function getCommandActiveSelection(entries = [], teraToggle = null) {
  if (teraToggle?.active) return { kind: 'tera', index: 4 };
  const activeIndex = entries.findIndex(entry => entry?.active && !entry.disabled);
  if (activeIndex >= 0) return { kind: 'command', index: activeIndex };
  return sanitizeCommandSelection(null, entries, teraToggle);
}

function getCommandDirectionalSelection(selection, button, entries = [], teraToggle = null) {
  const current = sanitizeCommandSelection(selection, entries, teraToggle);
  const teraEnabled = Boolean(teraToggle && !teraToggle.disabled);
  if (current.kind === 'tera') {
    if (button === 'right') return sanitizeCommandSelection({ kind: 'command', index: 0 }, entries, teraToggle);
    return null;
  }
  const cursor = current.index;
  switch (button) {
    case 'up':
      if (cursor === 2 || cursor === 3) return sanitizeCommandSelection({ kind: 'command', index: cursor - 2 }, entries, teraToggle);
      return null;
    case 'down':
      if (cursor === 0 || cursor === 1) return sanitizeCommandSelection({ kind: 'command', index: cursor + 2 }, entries, teraToggle);
      return null;
    case 'left':
      if (cursor === 1 || cursor === 3) return sanitizeCommandSelection({ kind: 'command', index: cursor - 1 }, entries, teraToggle);
      if ((cursor === 0 || cursor === 2) && teraEnabled) return { kind: 'tera', index: 4 };
      return null;
    case 'right':
      if ((cursor === 0 || cursor === 2) && entries[cursor + 1] && !entries[cursor + 1].disabled) {
        return sanitizeCommandSelection({ kind: 'command', index: cursor + 1 }, entries, teraToggle);
      }
      return null;
    default:
      return null;
  }
}

function sanitizeFightSelection(selection, moves = [], toggles = [], footerActions = []) {
  const moveCount = Math.min(4, moves.length);
  const toggleCount = toggles.length;
  const footerCount = footerActions.length;
  if (selection?.region === 'toggles' && toggleCount) {
    return { region: 'toggles', index: clampIndex(selection.index ?? 0, 0, toggleCount - 1) };
  }
  if (selection?.region === 'footer' && footerCount) {
    return { region: 'footer', index: clampIndex(selection.index ?? 0, 0, footerCount - 1) };
  }
  return { region: 'moves', index: clampIndex(selection?.index ?? 0, 0, Math.max(0, moveCount - 1)) };
}

function getFightActiveSelection(moves = [], toggles = [], footerActions = []) {
  const activeFooter = footerActions.findIndex(action => action?.active && !action.disabled);
  if (activeFooter >= 0) return { region: 'footer', index: activeFooter };
  const activeToggle = toggles.findIndex(toggle => toggle?.active && !toggle.disabled);
  if (activeToggle >= 0) return { region: 'toggles', index: activeToggle };
  const activeMove = moves.findIndex(move => (move?.focused || move?.active) && !move.disabled);
  if (activeMove >= 0) return { region: 'moves', index: activeMove };
  return sanitizeFightSelection(null, moves, toggles, footerActions);
}

function getFightDirectionalSelection(selection, button, moves = [], toggles = [], footerActions = []) {
  const current = sanitizeFightSelection(selection, moves, toggles, footerActions);
  const moveCount = Math.min(4, moves.length);
  const toggleCount = toggles.length;
  const footerCount = footerActions.length;
  if (current.region === 'toggles') {
    switch (button) {
      case 'left':
        return current.index > 0 ? { region: 'toggles', index: current.index - 1 } : null;
      case 'right':
        if (current.index < toggleCount - 1) return { region: 'toggles', index: current.index + 1 };
        return footerCount ? { region: 'footer', index: 0 } : null;
      case 'up':
      case 'down':
        return { region: 'moves', index: clampIndex(current.index, 0, Math.max(0, moveCount - 1)) };
      default:
        return null;
    }
  }
  if (current.region === 'footer') {
    switch (button) {
      case 'left':
        if (current.index > 0) return { region: 'footer', index: current.index - 1 };
        return toggleCount ? { region: 'toggles', index: clampIndex(0, 0, toggleCount - 1) } : null;
      case 'right':
        return current.index < footerCount - 1 ? { region: 'footer', index: current.index + 1 } : null;
      case 'up':
      case 'down':
        if (toggleCount) return { region: 'toggles', index: clampIndex(current.index, 0, toggleCount - 1) };
        return { region: 'moves', index: clampIndex(2 + current.index, 0, Math.max(0, moveCount - 1)) };
      default:
        return null;
    }
  }
  const cursor = current.index;
  switch (button) {
    case 'up':
      if (cursor >= 2) return { region: 'moves', index: cursor - 2 };
      return toggleCount ? { region: 'toggles', index: clampIndex(cursor, 0, toggleCount - 1) } : null;
    case 'down':
      if (cursor < 2 && moves[cursor + 2]) return { region: 'moves', index: cursor + 2 };
      return footerCount ? { region: 'footer', index: clampIndex(cursor % 2, 0, footerCount - 1) } : null;
    case 'left':
      if (cursor % 2 === 1) return { region: 'moves', index: cursor - 1 };
      return toggleCount ? { region: 'toggles', index: 0 } : null;
    case 'right':
      if (cursor % 2 === 0 && moves[cursor + 1]) return { region: 'moves', index: cursor + 1 };
      return footerCount ? { region: 'footer', index: clampIndex(cursor % 2, 0, footerCount - 1) } : null;
    default:
      return null;
  }
}

function buildPartyNavigationMap(optionCount, hasFooter) {
  const lastRightIndex = Math.max(1, optionCount - 1);
  const map = {};
  if (optionCount > 0) {
    map[0] = { right: optionCount > 1 ? 1 : (hasFooter ? 6 : null), down: hasFooter ? 6 : (optionCount > 1 ? 1 : null), left: null, up: null };
  }
  for (let index = 1; index < optionCount; index += 1) {
    map[index] = {
      up: index > 1 ? index - 1 : null,
      down: index < optionCount - 1 ? index + 1 : (hasFooter ? 6 : null),
      left: 0,
      right: null,
    };
  }
  if (hasFooter) {
    map[6] = {
      up: optionCount > 1 ? lastRightIndex : 0,
      down: null,
      left: 0,
      right: null,
    };
  }
  return map;
}

function getPartyActiveSelection(partyOptions = [], footerActions = []) {
  const activeSlot = partyOptions.findIndex(option => option?.active && !option.disabled);
  if (activeSlot >= 0) return activeSlot;
  const footerAction = footerActions[0] || null;
  if (footerAction?.active && !footerAction.disabled) return 6;
  const firstEnabled = partyOptions.findIndex(option => option && !option.disabled);
  if (firstEnabled >= 0) return firstEnabled;
  return footerAction ? 6 : 0;
}

function sanitizePartySelection(index, partyOptions = [], footerActions = []) {
  const footerAction = footerActions[0] || null;
  const hasFooter = Boolean(footerAction);
  if (index === 6 && hasFooter) return 6;
  const optionCount = Math.min(6, partyOptions.length);
  return clampIndex(index ?? getPartyActiveSelection(partyOptions, footerActions), 0, Math.max(0, optionCount - 1));
}

function getPartyDirectionalSelection(index, button, partyOptions = [], footerActions = []) {
  const footerAction = footerActions[0] || null;
  const optionCount = Math.min(6, partyOptions.length);
  const hasFooter = Boolean(footerAction);
  const map = buildPartyNavigationMap(optionCount, hasFooter);
  const current = sanitizePartySelection(index, partyOptions, footerActions);
  const next = map[current]?.[button] ?? null;
  return next == null ? null : next;
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

  supportsInfoToggle(mode = this.mode) {
    return [UiMode.COMMAND, UiMode.FIGHT, UiMode.MESSAGE, UiMode.TARGET_SELECT].includes(normalizeUiMode(mode));
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
        return this.getCommandInputModel();
      case UiMode.FIGHT:
        return this.getFightInputModel();
      case UiMode.PARTY:
        return this.getPartyInputModel();
      case UiMode.TARGET_SELECT:
        return this.getTargetInputModel();
      case UiMode.MESSAGE:
      default:
        return this.getMessageState();
    }
  }

  getCommandEntries() {
    return this.getCommandState().commands || [];
  }

  getTeraToggle() {
    return this.getCommandState().teraToggle || null;
  }

  getCommandSelectionState(preferredSelection = null) {
    const entries = this.getCommandEntries();
    const teraToggle = this.getTeraToggle();
    return sanitizeCommandSelection(preferredSelection || getCommandActiveSelection(entries, teraToggle), entries, teraToggle);
  }

  moveCommandSelection(selection, button) {
    return getCommandDirectionalSelection(selection, button, this.getCommandEntries(), this.getTeraToggle());
  }

  getCommandSubmitAction(selection) {
    const resolved = this.getCommandSelectionState(selection);
    if (resolved.kind === 'tera') {
      const tera = this.getTeraToggle();
      return !tera?.disabled ? (tera?.action || null) : null;
    }
    const entry = this.getCommandEntries()[resolved.index] || null;
    return entry && !entry.disabled ? (entry.action || null) : null;
  }

  getCommandInputModel() {
    const state = this.getCommandState();
    return {
      fieldIndex: Number.isInteger(state.fieldIndex) ? state.fieldIndex : 0,
      entries: this.getCommandEntries(),
      teraToggle: this.getTeraToggle(),
      selection: this.getCommandSelectionState(),
      title: state.title || '',
    };
  }

  getFightMoves() {
    return this.getFightState().moves || [];
  }

  getFightToggles() {
    return this.getFightState().toggles || [];
  }

  getFightFooterActions() {
    return this.getFightState().footerActions || [];
  }

  getFightSelectionState(preferredSelection = null) {
    const moves = this.getFightMoves();
    const toggles = this.getFightToggles();
    const footerActions = this.getFightFooterActions();
    return sanitizeFightSelection(preferredSelection || getFightActiveSelection(moves, toggles, footerActions), moves, toggles, footerActions);
  }

  moveFightSelection(selection, button) {
    return getFightDirectionalSelection(selection, button, this.getFightMoves(), this.getFightToggles(), this.getFightFooterActions());
  }

  getFightSubmitAction(selection) {
    const resolved = this.getFightSelectionState(selection);
    if (resolved.region === 'toggles') {
      const toggle = this.getFightToggles()[resolved.index] || null;
      return toggle && !toggle.disabled ? (toggle.action || null) : null;
    }
    if (resolved.region === 'footer') {
      const footer = this.getFightFooterActions()[resolved.index] || null;
      return footer && !footer.disabled ? (footer.action || null) : null;
    }
    const move = this.getFightMoves()[resolved.index] || null;
    return move && !move.disabled ? (move.action || null) : null;
  }

  getFightFocusAction(selection) {
    const resolved = this.getFightSelectionState(selection);
    if (resolved.region !== 'moves') return null;
    const move = this.getFightMoves()[resolved.index] || null;
    return move && !move.disabled ? (move.focusAction || null) : null;
  }

  getFightCancelResult(selection) {
    const resolved = this.getFightSelectionState(selection);
    if (resolved.region === 'moves') {
      const footer = this.getFightFooterActions()[0] || null;
      return footer && !footer.disabled ? { kind: 'action', action: footer.action || null } : null;
    }
    return { kind: 'selection', selection: { region: 'moves', index: this.getFightSelectionState({ region: 'moves', index: resolved.index }).index } };
  }

  getFightInputModel() {
    const state = this.getFightState();
    return {
      fieldIndex: Number.isInteger(state.fieldIndex) ? state.fieldIndex : 0,
      moves: this.getFightMoves(),
      toggles: this.getFightToggles(),
      footerActions: this.getFightFooterActions(),
      selection: this.getFightSelectionState(),
      detail: state.detail || {},
      title: state.title || '',
    };
  }

  getPartyOptions() {
    return this.getPartyState().partyOptions || [];
  }

  getPartyFooterActions() {
    return this.getPartyState().footerActions || [];
  }

  getPartySelectionState(preferredIndex = null) {
    return sanitizePartySelection(preferredIndex ?? getPartyActiveSelection(this.getPartyOptions(), this.getPartyFooterActions()), this.getPartyOptions(), this.getPartyFooterActions());
  }

  movePartySelection(index, button) {
    return getPartyDirectionalSelection(index, button, this.getPartyOptions(), this.getPartyFooterActions());
  }

  getPartySubmitAction(index) {
    const resolvedIndex = this.getPartySelectionState(index);
    if (resolvedIndex === 6) {
      const footer = this.getPartyFooterActions()[0] || null;
      return footer && !footer.disabled ? (footer.action || null) : null;
    }
    const option = this.getPartyOptions()[resolvedIndex] || null;
    return option && !option.disabled ? (option.action || null) : null;
  }

  getPartyCancelAction() {
    const footer = this.getPartyFooterActions()[0] || null;
    return footer && !footer.disabled ? (footer.action || null) : null;
  }

  getPartyInputModel() {
    const state = this.getPartyState();
    return {
      fieldIndex: Number.isInteger(state.fieldIndex) ? state.fieldIndex : 0,
      partyOptions: this.getPartyOptions(),
      footerActions: this.getPartyFooterActions(),
      selection: this.getPartySelectionState(),
      title: state.title || '',
      subtitle: state.subtitle || '',
    };
  }

  getTargetFooterActions() {
    return this.getTargetState().footerActions || [];
  }

  getTargetBackAction() {
    const footer = this.getTargetFooterActions()[0] || null;
    return footer && !footer.disabled ? (footer.action || null) : null;
  }

  getTargetInputModel() {
    const state = this.getTargetState();
    return {
      fieldIndex: Number.isInteger(state.fieldIndex) ? state.fieldIndex : 0,
      title: state.title || '',
      placeholder: state.placeholder || '',
      footerActions: this.getTargetFooterActions(),
      blockedReason: state.blockedReason || '',
    };
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
