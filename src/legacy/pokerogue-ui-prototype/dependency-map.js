export const PKB_POKEROGUE_UI_DEPENDENCY_MAP = Object.freeze({
  uiRoot: {
    pokerogueSources: ['src/ui/ui.ts', 'src/enums/ui-mode.ts'],
    directTransplantable: ['mode/handler registry shape', 'single UI root ownership of battle handlers'],
    adapterRequired: ['PKB battle model -> Pokerogue-style handler arguments', 'PKB action dispatch -> handler callbacks'],
    blockedBy: ['Pokerogue globalScene ownership', 'Pokerogue UI mode stack / transition chain'],
  },
  battleMessageUiHandler: {
    pokerogueSources: ['src/ui/handlers/battle-message-ui-handler.ts', 'src/ui/handlers/message-ui-handler.ts'],
    directTransplantable: ['message window ownership', 'prompt sprite ownership', 'message-first mode'],
    adapterRequired: ['PKB message queue shape', 'PKB prompt semantics'],
    blockedBy: ['Pokerogue timed text pipeline', 'globalScene-managed sound / tween side effects'],
  },
  commandUiHandler: {
    pokerogueSources: ['src/ui/handlers/command-ui-handler.ts'],
    directTransplantable: ['command-mode window ownership', 'command selection responsibility'],
    adapterRequired: ['PKB command list / enabled state', 'PKB perspective pass-through'],
    blockedBy: ['Pokerogue button enums', 'Pokerogue phase-driven command lifecycle'],
  },
  fightUiHandler: {
    pokerogueSources: ['src/ui/handlers/fight-ui-handler.ts'],
    directTransplantable: ['fight-mode ownership', 'move detail area', 'fight footer toggles'],
    adapterRequired: ['PKB move metadata and toggle state', 'PKB move-select / cancel dispatch'],
    blockedBy: ['Pokerogue target-select follow-up', 'globalScene effectiveness / flyout dependencies'],
  },
  partyUiHandler: {
    pokerogueSources: ['src/ui/handlers/party-ui-handler.ts'],
    directTransplantable: ['party-mode ownership', 'party slot responsibility', 'cancel footer ownership'],
    adapterRequired: ['PKB switch availability model', 'PKB party action filters'],
    blockedBy: ['Pokerogue summary / ball / target chaining', 'Pokemon instance-rich callbacks'],
  },
  battleInfo: {
    pokerogueSources: ['src/ui/battle-info/battle-info.ts', 'src/ui/battle-info/enemy-battle-info.ts', 'src/ui/battle-info/player-battle-info.ts'],
    directTransplantable: ['enemy/player split', 'info-box ownership', 'type icon slots', 'hp/exp presentation layers'],
    adapterRequired: ['PKB normalized battler info model'],
    blockedBy: ['Pokemon instance methods', 'mini/boss/flyout/stat container features not yet mirrored'],
  },
});
