import { Button, Command } from '../ui/facade/input-facade.js';
import { UiMode, normalizeUiMode } from '../ui/ui-mode.js';

const INFO_CAPABLE_MODES = new Set([UiMode.COMMAND, UiMode.FIGHT, UiMode.MESSAGE, UiMode.TARGET_SELECT]);

function clampIndex(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (max < min) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function normalizeMessageText(message = {}, stateWindow = {}) {
  // Accept both primaryText (adapter canonical) and primary (buildBattleMessageModel output)
  const primary = String(message.primaryText || message.primary || '').trim();
  const secondary = String(message.secondaryText || message.secondary || '').trim();
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

function findFlaggedIndex(items = [], keys = []) {
  for (const key of keys) {
    const index = items.findIndex(item => Boolean(item?.[key]));
    if (index >= 0) return index;
  }
  return -1;
}

function findFirstEnabledIndex(items = [], preferred = 0) {
  const normalizedPreferred = clampIndex(preferred, 0, Math.max(0, items.length - 1));
  if (items[normalizedPreferred] && !items[normalizedPreferred].disabled) return normalizedPreferred;
  const firstEnabled = items.findIndex(item => item && !item.disabled);
  return firstEnabled >= 0 ? firstEnabled : normalizedPreferred;
}

function hasInteractiveAction(entry) {
  return Boolean(entry && !entry.disabled && entry.action);
}

function cloneSelection(selection = {}) {
  return { ...selection };
}

export class PkbBattleUiAdapter {
  constructor() {
    this.model = {};
    this.stateWindow = {};
    this.mode = UiMode.MESSAGE;
    this.partyLastLeftCursor = 0;
    this.partyLastRightCursor = 0;
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

  canProcessInfoButton(mode = this.mode) {
    return INFO_CAPABLE_MODES.has(normalizeUiMode(mode));
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

  getCommandEntries() {
    return this.getCommandState().commands || [];
  }

  getTeraToggle() {
    return this.getCommandState().teraToggle || null;
  }

  getCommandInputModel() {
    const state = this.getCommandState();
    return {
      fieldIndex: Number.isInteger(state.fieldIndex) ? state.fieldIndex : 0,
      entries: this.getCommandEntries(),
      teraToggle: this.getTeraToggle(),
      title: state.title || '',
    };
  }

  getCommandSelectionState(previousCursor = null) {
    const entries = this.getCommandEntries();
    const teraToggle = this.getTeraToggle();
    const activeCommandIndex = findFlaggedIndex(entries, ['active']);
    const hasExplicitCursor = Number.isInteger(previousCursor);
    let cursor = hasExplicitCursor ? previousCursor : null;

    // Only use `active` as an initial seed. During directional navigation we
    // must preserve the explicit cursor passed from the UI handler.
    if (!hasExplicitCursor && activeCommandIndex >= 0 && cursor !== Command.TERA) {
      cursor = activeCommandIndex;
    }

    if (cursor == null) {
      cursor = findFirstEnabledIndex(entries, Command.FIGHT);
    }

    if (cursor === Command.TERA && !teraToggle) {
      cursor = findFirstEnabledIndex(entries, Command.FIGHT);
    }

    if (cursor !== Command.TERA) {
      cursor = findFirstEnabledIndex(entries, cursor);
    }

    return {
      cursor,
      entries,
      teraToggle,
      canTera: Boolean(teraToggle),
    };
  }

  moveCommandSelection(currentCursor, button) {
    const state = this.getCommandSelectionState(currentCursor);
    const { entries, canTera } = state;
    let nextCursor = state.cursor;

    switch (button) {
      case Button.UP:
        if (nextCursor === Command.POKEMON || nextCursor === Command.RUN) nextCursor -= 2;
        break;
      case Button.DOWN:
        if (nextCursor === Command.FIGHT || nextCursor === Command.BALL) nextCursor += 2;
        break;
      case Button.LEFT:
        if (nextCursor === Command.BALL || nextCursor === Command.RUN) nextCursor -= 1;
        else if ((nextCursor === Command.FIGHT || nextCursor === Command.POKEMON) && canTera) nextCursor = Command.TERA;
        break;
      case Button.RIGHT:
        if (nextCursor === Command.TERA) {
          nextCursor = Command.FIGHT;
          break;
        }
        if (nextCursor === Command.FIGHT || nextCursor === Command.POKEMON) {
          const adjacent = entries[nextCursor + 1];
          if (adjacent && !adjacent.disabled) nextCursor += 1;
        }
        break;
      default:
        break;
    }

    return this.getCommandSelectionState(nextCursor).cursor;
  }

  getCommandSubmitAction(currentCursor) {
    const selection = this.getCommandSelectionState(currentCursor);
    if (selection.cursor === Command.TERA) {
      return hasInteractiveAction(selection.teraToggle) ? selection.teraToggle.action : null;
    }
    const entry = selection.entries[selection.cursor] || null;
    return hasInteractiveAction(entry) ? entry.action : null;
  }

  resolveCommandInput(currentCursor, button) {
    const selection = this.getCommandSelectionState(currentCursor);
    if (button === Button.ACTION) {
      return {
        cursor: selection.cursor,
        action: this.getCommandSubmitAction(selection.cursor),
        changed: false,
      };
    }
    if (button === Button.CANCEL) {
      return { cursor: selection.cursor, action: null, changed: false };
    }
    const nextCursor = this.moveCommandSelection(selection.cursor, button);
    return {
      cursor: nextCursor,
      action: null,
      changed: nextCursor !== selection.cursor,
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

  getFightInputModel() {
    const state = this.getFightState();
    return {
      fieldIndex: Number.isInteger(state.fieldIndex) ? state.fieldIndex : 0,
      moves: this.getFightMoves(),
      toggles: this.getFightToggles(),
      footerActions: this.getFightFooterActions(),
      detail: state.detail || {},
      title: state.title || '',
    };
  }

  getFightSelectionState(previousSelection = {}) {
    const moves = this.getFightMoves();
    const toggles = this.getFightToggles();
    const footerActions = this.getFightFooterActions();
    const maxMoveIndex = Math.max(0, Math.min(moves.length - 1, 3));
    const activeMoveIndex = findFlaggedIndex(moves, ['focused', 'active']);
    const activeToggleIndex = findFlaggedIndex(toggles, ['active']);
    const activeFooterIndex = findFlaggedIndex(footerActions, ['active']);

    let moveCursor = clampIndex(
      previousSelection.moveCursor ?? (activeMoveIndex >= 0 ? activeMoveIndex : 0),
      0,
      maxMoveIndex,
    );
    let toggleCursor = clampIndex(
      previousSelection.toggleCursor ?? (activeToggleIndex >= 0 ? activeToggleIndex : 0),
      0,
      Math.max(0, toggles.length - 1),
    );
    let footerCursor = clampIndex(
      previousSelection.footerCursor ?? (activeFooterIndex >= 0 ? activeFooterIndex : 0),
      0,
      Math.max(0, footerActions.length - 1),
    );

    let focusRegion = previousSelection.focusRegion || 'moves';
    if (activeToggleIndex >= 0) focusRegion = 'toggles';
    else if (activeFooterIndex >= 0) focusRegion = 'footer';
    else if (!previousSelection.focusRegion && activeMoveIndex >= 0) focusRegion = 'moves';

    if (focusRegion === 'toggles' && !toggles.length) focusRegion = footerActions.length ? 'footer' : 'moves';
    if (focusRegion === 'footer' && !footerActions.length) focusRegion = toggles.length ? 'toggles' : 'moves';

    return {
      focusRegion,
      moveCursor,
      toggleCursor,
      footerCursor,
      moves,
      toggles,
      footerActions,
    };
  }

  moveFightSelection(currentSelection = {}, button) {
    const selection = cloneSelection(this.getFightSelectionState(currentSelection));
    const { moves, toggles, footerActions } = selection;

    const focusMove = nextCursor => {
      selection.focusRegion = 'moves';
      selection.moveCursor = clampIndex(nextCursor, 0, Math.max(0, Math.min(moves.length - 1, 3)));
      return selection;
    };

    const focusToggle = nextCursor => {
      if (!toggles.length) return selection;
      selection.focusRegion = 'toggles';
      selection.toggleCursor = clampIndex(nextCursor, 0, toggles.length - 1);
      return selection;
    };

    const focusFooter = nextCursor => {
      if (!footerActions.length) return selection;
      selection.focusRegion = 'footer';
      selection.footerCursor = clampIndex(nextCursor, 0, footerActions.length - 1);
      return selection;
    };

    if (selection.focusRegion === 'toggles') {
      switch (button) {
        case Button.UP:
          if (selection.toggleCursor > 0) focusToggle(selection.toggleCursor - 1);
          else focusMove(Math.min(selection.toggleCursor, Math.max(0, moves.length - 1)));
          break;
        case Button.DOWN:
          if (selection.toggleCursor < toggles.length - 1) focusToggle(selection.toggleCursor + 1);
          else if (footerActions.length) focusFooter(0);
          break;
        case Button.RIGHT:
          focusMove(Math.min(selection.toggleCursor, Math.max(0, moves.length - 1)));
          break;
        case Button.LEFT:
          break;
        default:
          break;
      }
      return selection;
    }

    if (selection.focusRegion === 'footer') {
      switch (button) {
        case Button.UP:
          if (toggles.length) focusToggle(toggles.length - 1);
          else focusMove(Math.min(2, Math.max(0, moves.length - 1)));
          break;
        case Button.DOWN:
          focusMove(Math.min(2, Math.max(0, moves.length - 1)));
          break;
        case Button.LEFT:
          if (toggles.length) focusToggle(Math.min(selection.footerCursor, toggles.length - 1));
          break;
        case Button.RIGHT:
          focusMove(Math.min(selection.footerCursor, Math.max(0, moves.length - 1)));
          break;
        default:
          break;
      }
      return selection;
    }

    switch (button) {
      case Button.UP:
        if (selection.moveCursor >= 2) focusMove(selection.moveCursor - 2);
        else if (toggles.length) focusToggle(Math.min(selection.moveCursor, toggles.length - 1));
        break;
      case Button.DOWN:
        if (selection.moveCursor < 2 && moves[selection.moveCursor + 2]) focusMove(selection.moveCursor + 2);
        else if (footerActions.length) focusFooter(Math.min(selection.moveCursor % 2, footerActions.length - 1));
        break;
      case Button.LEFT:
        if (selection.moveCursor % 2 === 1) focusMove(selection.moveCursor - 1);
        else if (toggles.length) focusToggle(0);
        break;
      case Button.RIGHT:
        if (selection.moveCursor % 2 === 0 && moves[selection.moveCursor + 1]) focusMove(selection.moveCursor + 1);
        break;
      default:
        break;
    }

    return selection;
  }

  getFightSelectionFocusAction(currentSelection = {}) {
    const selection = this.getFightSelectionState(currentSelection);
    if (selection.focusRegion !== 'moves') return null;
    const move = selection.moves[selection.moveCursor] || null;
    return move?.focusAction || null;
  }

  getFightSelectionSubmitAction(currentSelection = {}) {
    const selection = this.getFightSelectionState(currentSelection);
    if (selection.focusRegion === 'toggles') {
      const toggle = selection.toggles[selection.toggleCursor] || null;
      return hasInteractiveAction(toggle) ? toggle.action : null;
    }
    if (selection.focusRegion === 'footer') {
      const footer = selection.footerActions[selection.footerCursor] || null;
      return hasInteractiveAction(footer) ? footer.action : null;
    }
    const move = selection.moves[selection.moveCursor] || null;
    return hasInteractiveAction(move) ? move.action : null;
  }

  getFightCancelResult(currentSelection = {}) {
    const selection = this.getFightSelectionState(currentSelection);
    if (selection.focusRegion === 'toggles' || selection.focusRegion === 'footer') {
      return {
        selection: this.getFightSelectionState({ ...selection, focusRegion: 'moves' }),
        action: null,
      };
    }
    const backAction = selection.footerActions[0] || null;
    return {
      selection,
      action: hasInteractiveAction(backAction) ? backAction.action : null,
    };
  }

  areFightSelectionsEqual(firstSelection = {}, secondSelection = {}) {
    const first = this.getFightSelectionState(firstSelection);
    const second = this.getFightSelectionState(secondSelection);
    return first.focusRegion === second.focusRegion
      && first.moveCursor === second.moveCursor
      && first.toggleCursor === second.toggleCursor
      && first.footerCursor === second.footerCursor;
  }

  resolveFightInput(currentSelection = {}, button) {
    const selection = this.getFightSelectionState(currentSelection);
    if (button === Button.ACTION) {
      return {
        selection,
        action: this.getFightSelectionSubmitAction(selection),
        focusAction: null,
        changed: false,
      };
    }
    if (button === Button.CANCEL) {
      const result = this.getFightCancelResult(selection);
      const nextSelection = this.getFightSelectionState(result?.selection || selection);
      return {
        selection: nextSelection,
        action: result?.action || null,
        focusAction: null,
        changed: !this.areFightSelectionsEqual(selection, nextSelection),
      };
    }
    const nextSelection = this.getFightSelectionState(this.moveFightSelection(selection, button));
    const changed = !this.areFightSelectionsEqual(selection, nextSelection);
    return {
      selection: nextSelection,
      action: null,
      focusAction: changed ? this.getFightSelectionFocusAction(nextSelection) : null,
      changed,
    };
  }

  getPartyOptions() {
    return this.getPartyState().partyOptions || [];
  }

  getPartyFooterActions() {
    return this.getPartyState().footerActions || [];
  }

  getPartyInputModel() {
    const state = this.getPartyState();
    return {
      fieldIndex: Number.isInteger(state.fieldIndex) ? state.fieldIndex : 0,
      partyOptions: this.getPartyOptions(),
      footerActions: this.getPartyFooterActions(),
      title: state.title || '',
      subtitle: state.subtitle || '',
      slotCount: Number.isInteger(state.slotCount) ? state.slotCount : this.getPartySlotCount(),
      battlerCount: Number.isInteger(state.battlerCount) ? state.battlerCount : this.getPartyBattlerCount(),
    };
  }

  getPartySlotCount() {
    const explicit = this.getPartyState().slotCount;
    if (Number.isInteger(explicit)) return clampIndex(explicit, 0, 6);
    return clampIndex(this.getPartyOptions().length, 0, 6);
  }

  getPartyBattlerCount() {
    const explicit = this.getPartyState().battlerCount;
    if (Number.isInteger(explicit)) return Math.max(1, explicit);
    return 1;
  }

  getPartySelectionState(previousCursor = null) {
    const partyOptions = this.getPartyOptions();
    const footerActions = this.getPartyFooterActions();
    const footerAction = footerActions[0] || null;
    const slotCount = this.getPartySlotCount();
    const battlerCount = this.getPartyBattlerCount();
    const activePartyIndex = findFlaggedIndex(partyOptions, ['active']);
    let cursor = Number.isInteger(previousCursor) ? previousCursor : null;

    if (activePartyIndex >= 0 && !Number.isInteger(previousCursor)) {
      cursor = activePartyIndex;
    }

    if (cursor == null) cursor = 0;

    const maxCursor = footerAction ? 6 : Math.max(0, slotCount - 1);
    cursor = clampIndex(cursor, 0, maxCursor);

    if (cursor < 6 && cursor >= slotCount) {
      cursor = Math.max(0, slotCount - 1);
    }
    if (cursor === 6 && !footerAction) {
      cursor = Math.max(0, slotCount - 1);
    }

    return {
      cursor,
      partyOptions,
      footerActions,
      footerAction,
      slotCount,
      battlerCount,
    };
  }

  getSelectablePartyIndexes() {
    const selectable = Array.from({ length: this.getPartySlotCount() }, (_, index) => index);
    if (this.getPartyFooterActions()[0]) selectable.push(6);
    return selectable;
  }

  getFirstSelectablePartyIndex() {
    const slotCount = this.getPartySlotCount();
    if (slotCount > 0) return 0;
    return this.getPartyFooterActions()[0] ? 6 : 0;
  }

  movePartySelection(currentCursor, button) {
    const selection = this.getPartySelectionState(currentCursor);
    const { slotCount, battlerCount } = selection;
    if (!slotCount) return selection.cursor;

    if (selection.cursor < battlerCount) this.partyLastLeftCursor = selection.cursor;
    if (selection.cursor >= battlerCount && selection.cursor < 6) this.partyLastRightCursor = selection.cursor;

    let nextCursor = selection.cursor;
    switch (button) {
      case Button.UP:
        nextCursor = selection.cursor ? (selection.cursor < 6 ? selection.cursor - 1 : slotCount - 1) : 6;
        break;
      case Button.DOWN:
        nextCursor = selection.cursor < 6 ? (selection.cursor < slotCount - 1 ? selection.cursor + 1 : 6) : 0;
        break;
      case Button.LEFT:
        if (selection.cursor === 6) {
          nextCursor = this.partyLastLeftCursor;
        } else if (selection.cursor >= battlerCount && selection.cursor < 6) {
          nextCursor = this.partyLastLeftCursor;
        }
        break;
      case Button.RIGHT:
        if (slotCount <= battlerCount) {
          nextCursor = 6;
        } else if (selection.cursor < battlerCount) {
          nextCursor = this.partyLastRightCursor || battlerCount;
        }
        break;
      default:
        break;
    }
    return this.getPartySelectionState(nextCursor).cursor;
  }

  getPartySelectionSubmitAction(currentCursor) {
    const selection = this.getPartySelectionState(currentCursor);
    if (selection.cursor === 6) {
      return hasInteractiveAction(selection.footerAction) ? selection.footerAction.action : null;
    }
    const option = selection.partyOptions[selection.cursor] || null;
    return hasInteractiveAction(option) ? option.action : null;
  }

  getPartyCancelAction() {
    const footerAction = this.getPartyFooterActions()[0] || null;
    return hasInteractiveAction(footerAction) ? footerAction.action : null;
  }

  resolvePartyInput(currentCursor, button) {
    const selection = this.getPartySelectionState(currentCursor);
    if (button === Button.ACTION) {
      return {
        cursor: selection.cursor,
        action: this.getPartySelectionSubmitAction(selection.cursor),
        changed: false,
      };
    }
    if (button === Button.CANCEL) {
      return {
        cursor: selection.cursor,
        action: this.getPartyCancelAction(),
        changed: false,
      };
    }
    const nextCursor = this.movePartySelection(selection.cursor, button);
    return {
      cursor: nextCursor,
      action: null,
      changed: nextCursor !== selection.cursor,
    };
  }

  getTargetFooterActions() {
    return this.getTargetState().footerActions || [];
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

  getTargetBackAction() {
    const footerAction = this.getTargetFooterActions()[0] || null;
    return hasInteractiveAction(footerAction) ? footerAction.action : null;
  }

  resolveTargetInput(button) {
    if (button !== Button.ACTION && button !== Button.CANCEL) {
      return { action: null, handled: false };
    }
    const action = this.getTargetBackAction();
    return {
      action,
      handled: Boolean(action),
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
