/**
 * BattleTimelineExecutor (M3 — Sprint 2b: core presentation, Sprint 3: messages + cries + ability)
 *
 * Consumes the `events` array from a snapshot and plays them sequentially.
 * Sprint 2b: switch_in (pb_rel SE), move_use (move SE), damage (hit SE + HP tween), faint SE.
 * Sprint 3: battle messages (BA-1), Pokémon cries (BA-2), ability bar + weather/terrain (BA-3).
 *
 * Usage:
 *   const executor = new BattleTimelineExecutor({ onInputRequired, onComplete, applySnapshot, scene, initialNames });
 *   await executor.play(snapshot.events);
 *
 * Feature flag: only instantiated when FLAGS.battlePresentationV2 === true.
 */
import { Pokedex } from '../data/pokedex.js';

function toId(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Look up National Dex number for a species display name (e.g. "Charizard-Mega-X" → 6). */
function speciesToDexNum(species) {
  return Pokedex[toId(species)]?.num ?? 0;
}

const STATUS_LABELS = {
  brn: '화상에 걸렸다!',
  par: '마비됐다!',
  psn: '독에 걸렸다!',
  tox: '맹독에 걸렸다!',
  slp: '잠들었다!',
  frz: '얼어붙었다!',
};

const STAT_LABELS = {
  atk: '공격',
  def: '방어',
  spa: '특수공격',
  spd: '특수방어',
  spe: '스피드',
  acc: '명중',
  eva: '회피',
};

const WEATHER_LABELS = {
  raindance:     '비가 내리기 시작했다!',
  rain:          '비가 내리기 시작했다!',
  primordialsea: '폭우가 쏟아지기 시작했다!',
  sunnyday:      '날씨가 맑아졌다!',
  sun:           '날씨가 맑아졌다!',
  desolateland:  '강렬한 햇빛이 내리쬐기 시작했다!',
  sandstorm:     '모래바람이 불기 시작했다!',
  sand:          '모래바람이 불기 시작했다!',
  hail:          '싸라기눈이 내리기 시작했다!',
  snow:          '눈이 내리기 시작했다!',
  snowscape:     '눈이 내리기 시작했다!',
  deltastream:   '이상한 기류가 발생했다!',
};

const TERRAIN_LABELS = {
  electricterrain: '전기 필드가 펼쳐졌다!',
  grassyterrain:   '풀 필드가 펼쳐졌다!',
  mistyterrain:    '미스트 필드가 펼쳐졌다!',
  psychicterrain:  '사이코 필드가 펼쳐졌다!',
};

export class BattleTimelineExecutor {
  /**
   * @param {object} opts
   * @param {function(string): void}   [opts.onInputRequired]  called when request_gate fires
   * @param {function(): void}         [opts.onComplete]       called when all events are played
   * @param {function(): void}         [opts.applySnapshot]    called by fastForward to apply final state
   * @param {function(): object}       [opts.scene]            getter returning current Phaser scene (may be null)
   * @param {string}                   [opts.playerSide]       Showdown side id for local player ('p1'|'p2')
   * @param {Record<string, string>}   [opts.initialNames]     pre-seeded slot→species map (key: "p1_0", "p2_0")
   * @param {Record<string, object>}   [opts.initialSlotInfo]  pre-seeded slot→battle-info map
   * @param {function(object): object} [opts.resolveVisualState] resolve sprite/info patch for an event
   * @param {boolean}                  [opts.audioEnabled]     play timeline audio for this executor
   */
  constructor({
    onInputRequired,
    onComplete,
    applySnapshot,
    scene,
    playerSide,
    initialNames,
    initialSlotInfo,
    resolveVisualState,
    audioEnabled = true,
  } = {}) {
    this.onInputRequired = onInputRequired ?? (() => {});
    this.onComplete = onComplete ?? (() => {});
    this._applySnapshot = applySnapshot ?? (() => {});
    this._scene = scene ?? (() => null);
    this._playerSide = playerSide ?? 'p1';
    this._audioEnabled = audioEnabled !== false;
    this._resolveVisualState = resolveVisualState ?? (() => null);
    this.running = false;
    // Tracks species name per slot. Key: "${side}_${slot}" e.g. "p1_0", "p2_0".
    // Pre-seeded from initialNames (previous turn's final roster).
    this._slotNames = new Map(Object.entries(initialNames ?? {}));
    // Tracks live battle-info state (name/hp/status/etc) per side+slot during timeline playback.
    this._slotInfo = new Map(Object.entries(initialSlotInfo ?? {}));
  }

  // ── accessors ─────────────────────────────────────────────────────────────

  get _audio() { return this._scene()?.audio ?? null; }
  get _ui()    { return this._scene()?.ui    ?? null; }
  /** Returns the BattleMessageUiHandler for direct text updates. */
  get _msg()   { return this._ui?.getMessageHandler?.() ?? null; }

  /** Returns the BattleInfo panel for the given Showdown side id ('p1'|'p2'). */
  _infoForSide(side) {
    const ui = this._ui;
    if (!ui) return null;
    return side === this._playerSide ? ui.playerInfo : ui.enemyInfo;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _playAudio(key) {
    if (!this._audioEnabled || !key) return;
    this._audio?.play?.(key);
  }

  _playHitByResult(result) {
    if (!this._audioEnabled) return;
    this._audio?.playHitByResult?.(result);
  }

  async _playCryByNum(dexNum) {
    if (!this._audioEnabled || !dexNum) return;
    await this._audio?.playCryByNum?.(dexNum);
  }

  async _playMoveSe(moveName) {
    if (!this._audioEnabled || !moveName) return;
    await this._audio?.playMoveSe?.(moveName);
  }

  /** Set battle message box text immediately (reading time provided by surrounding _delay calls). */
  _showMsg(text) {
    this._msg?.showText?.(String(text || ''));
  }

  /** Get the tracked species name for a side+slot, or '???' if unknown. */
  _slotName(side, slot = 0) {
    return this._slotNames.get(`${side}_${slot}`) || '???';
  }

  _slotKey(side, slot = 0) {
    return `${side}_${slot}`;
  }

  _slotInfoFor(side, slot = 0) {
    return this._slotInfo.get(this._slotKey(side, slot)) || null;
  }

  _updateSlotInfo(side, slot = 0, patch = {}) {
    const key = this._slotKey(side, slot);
    const current = this._slotInfo.get(key) || {};
    const next = {
      ...current,
      ...patch,
    };
    this._slotInfo.set(key, next);
    return next;
  }

  _applyInfoForSlot(side, slot = 0, patch = {}) {
    const nextInfo = this._updateSlotInfo(side, slot, patch);
    const info = this._infoForSide(side);
    info?.update?.(nextInfo);
    return nextInfo;
  }

  async _setBattlerSprite(side, spriteUrl = '', options = {}) {
    if (!side || !spriteUrl) return;
    const scene = this._scene();
    if (!scene?.setBattlerSprite) return;
    await scene.setBattlerSprite(side, spriteUrl, options);
  }

  async _playFormChangePresentation(side, presentation = null) {
    if (!side || !presentation || presentation.shouldAnimate === false) return;
    const scene = this._scene();
    if (!scene) return;
    const opts = {
      audioEnabled: this._audioEnabled,
      modal: Boolean(presentation.modal),
    };
    if (presentation.kind === 'form' && scene.playFormChange) {
      await scene.playFormChange(side, opts);
      return;
    }
    if (scene.playQuietFormChange) {
      await scene.playQuietFormChange(side, opts);
    }
  }

  _resolveFormChangePresentation(presentation, ev, slotInfoBefore = null) {
    const next = {
      kind: presentation?.kind || 'quiet',
      modal: Boolean(presentation?.modal),
      isActive: presentation?.isActive !== false,
      isVisible: presentation?.isVisible !== false,
    };
    if (slotInfoBefore) {
      const hp = Number(slotInfoBefore?.hp);
      const fainted = Boolean(slotInfoBefore?.fainted) || (Number.isFinite(hp) && hp <= 0);
      if (fainted) {
        next.isVisible = false;
        next.isActive = false;
      }
    }
    next.shouldAnimate = !ev?.silent && (next.modal || (next.isActive && next.isVisible));
    return next;
  }

  async _resolveVisual(ev) {
    try {
      return await this._resolveVisualState?.(ev);
    } catch (_error) {
      return null;
    }
  }

  _buildFormChangeMessage(preName, nextName, mechanism = '') {
    const pre = String(preName || '').trim();
    const next = String(nextName || '').trim();
    const mechId = toId(mechanism);
    const nextId = toId(next);
    if (!pre) return '';

    if (mechId === 'mega' || nextId.includes('mega')) {
      return next
        ? `${pre}은(는)\n${next}로 메가진화했다!`
        : `${pre}은(는)\n메가진화했다!`;
    }
    if (nextId.includes('gigantamax') || nextId.includes('gmax')) {
      return next
        ? `${pre}은(는)\n${next}가 되었다!`
        : `${pre}은(는)\n거다이맥스했다!`;
    }
    if (nextId.includes('eternamax')) {
      return next
        ? `${pre}은(는)\n${next}가 되었다!`
        : `${pre}은(는)\n무한다이맥스했다!`;
    }
    if (next && toId(pre) !== toId(next)) {
      return `${pre}은(는)\n${next}(으)로 변화했다!`;
    }
    return `${pre}은(는)\n다른 모습으로 변화했다!`;
  }

  // ── public API ─────────────────────────────────────────────────────────────

  /**
   * Play events array sequentially.
   * @param {Array<object>} events
   * @param {object} [context]  arbitrary context (unused, reserved for future use)
   */
  async play(events = [], context = {}) {  // eslint-disable-line no-unused-vars
    if (!Array.isArray(events) || events.length === 0) {
      this.onComplete();
      return;
    }
    this.running = true;
    try {
      for (const ev of events) {
        if (!this.running) break;  // fastForward was called
        await this._applyEvent(ev, context);
      }
    } catch (err) {
      console.warn('[BattleTimeline] event error, fast-forwarding to snapshot:', err);
      this.fastForward();
      return;
    }
    this.running = false;
    this.onComplete();
  }

  /**
   * Skip remaining events and apply the final snapshot state immediately.
   */
  fastForward() {
    this.running = false;
    this._applySnapshot();
  }

  // ── event handlers ─────────────────────────────────────────────────────────

  async _applyEvent(ev, context) {  // eslint-disable-line no-unused-vars
    switch (ev.type) {

      // ── BA-1: Turn boundary ──────────────────────────────────────────────
      case 'turn_start': {
        // Intentionally no message — turn numbers are visible in the battle log.
        break;
      }

      // ── BA-1 + BA-2: Pokémon switch-in ───────────────────────────────────
      case 'switch_in': {
        const side = ev.side;
        const slot = ev.slot ?? 0;
        const species = ev.species || this._slotName(side, slot) || '???';
        // Track this pokemon for later move/faint messages
        this._slotNames.set(this._slotKey(side, slot), species);

        const visual = await this._resolveVisual(ev);
        const switchPatch = {
          displayName: species,
          ...(visual?.infoPatch || {}),
        };
        if (Number.isFinite(ev.hpAfter) && Number.isFinite(ev.maxHp) && ev.maxHp > 0) {
          switchPatch.hp = ev.hpAfter;
          switchPatch.maxHp = ev.maxHp;
          switchPatch.hpPercent = (ev.hpAfter / ev.maxHp) * 100;
          switchPatch.hpLabel = `${ev.hpAfter}/${ev.maxHp}`;
          switchPatch.fainted = ev.hpAfter <= 0 || ev.status === 'fnt';
        }
        if (ev.status) {
          switchPatch.statusEffect = ev.status === 'fnt' ? '' : ev.status;
          switchPatch.statusLabel = ev.status === 'fnt' ? '' : ev.status;
        }
        this._applyInfoForSlot(side, slot, switchPatch);

        // BA-1: Show switch message
        const label = side === this._playerSide
          ? `가라! ${species}!`
          : `상대의 ${species} 등장!`;
        this._showMsg(label);

        const scene = this._scene();
        if (!ev.fromBall && visual?.spriteUrl) {
          await this._setBattlerSprite(side, visual.spriteUrl);
        }
        if (scene?.switchInBattler) {
          await scene.switchInBattler(side, !!ev.fromBall, { audioEnabled: this._audioEnabled });
        } else if (ev.fromBall) {
          this._playAudio('se/pb_rel');
        }
        await this._delay(ev.fromBall ? 300 : 100);

        // BA-2: play Pokémon cry via dex number → cry/<num>.m4a
        // Await the load so the cry plays even on first load (avoids 500ms timeout miss).
        const dexNum = speciesToDexNum(species);
        if (dexNum) await this._playCryByNum(dexNum);
        await this._delay(ev.fromBall ? 300 : 100);
        break;
      }

      // ── BA-1 + BA-10: Move use (message + visual animation) ─────────────
      case 'move_use': {
        const actorName = this._slotName(ev.actor?.side, ev.actor?.slot ?? 0);
        this._showMsg(`${actorName}의 ${ev.move}!`);
        const scene = this._scene();
        if (scene?.playMoveAnim) {
          // BA-10: play visual animation (includes timed sound events internally).
          // Safety timeout prevents executor hang if the Promise never resolves
          // (e.g. Phaser delayedCall cancelled on scene reset / loaderror).
          // Max duration: generous upper bound so even long animations always complete.
          const ANIM_TIMEOUT_MS = 5000;
          await Promise.race([
            scene.playMoveAnim(ev.move, ev.actor?.side, ev.target?.side, { audioEnabled: this._audioEnabled }),
            new Promise(resolve => setTimeout(resolve, ANIM_TIMEOUT_MS)),
          ]);
        } else {
          // Fallback: SE-only when scene not available.
          await this._playMoveSe(ev.move);
          await this._delay(500);
        }
        break;
      }

      // ── BA-1: Damage ─────────────────────────────────────────────────────
      case 'damage': {
        this._playHitByResult(ev.hitResult ?? 'effective');
        await this._delay(100);
        const hpPct = ev.maxHp > 0 ? (ev.hpAfter / ev.maxHp) * 100 : 0;
        this._updateSlotInfo(ev.target?.side, ev.target?.slot ?? 0, {
          hp: ev.hpAfter,
          maxHp: ev.maxHp,
          hpPercent: hpPct,
          hpLabel: `${ev.hpAfter}/${ev.maxHp}`,
          ...(ev.status && ev.status !== 'fnt' ? {
            statusEffect: ev.status,
            statusLabel: ev.status,
          } : {}),
          ...(ev.status === 'fnt' ? {
            statusEffect: '',
            statusLabel: '',
          } : {}),
          fainted: ev.hpAfter <= 0 || ev.status === 'fnt',
        });
        const info = this._infoForSide(ev.target?.side);
        if (info?.tweenHpTo) {
          await info.tweenHpTo(hpPct, ev.maxHp);
        } else {
          await this._delay(500);
        }
        // Show hit result message after HP tween
        let hitMsg = null;
        if (ev.critical)                        hitMsg = '급소에 맞았다!';
        else if (ev.hitResult === 'super')       hitMsg = '효과는 굉장했다!';
        else if (ev.hitResult === 'not_very')    hitMsg = '효과는 별로인 것 같다...';
        if (hitMsg) {
          this._showMsg(hitMsg);
          await this._delay(600);
        }
        break;
      }

      // ── Heal ─────────────────────────────────────────────────────────────
      case 'heal': {
        const healPct = ev.maxHp > 0 ? (ev.hpAfter / ev.maxHp) * 100 : 0;
        this._updateSlotInfo(ev.target?.side, ev.target?.slot ?? 0, {
          hp: ev.hpAfter,
          maxHp: ev.maxHp,
          hpPercent: healPct,
          hpLabel: `${ev.hpAfter}/${ev.maxHp}`,
          ...(ev.status && ev.status !== 'fnt' ? {
            statusEffect: ev.status,
            statusLabel: ev.status,
          } : {}),
          ...(ev.status === 'fnt' ? {
            statusEffect: '',
            statusLabel: '',
          } : {}),
          fainted: ev.hpAfter <= 0 || ev.status === 'fnt',
        });
        const healInfo = this._infoForSide(ev.target?.side);
        if (healInfo?.tweenHpTo) {
          await healInfo.tweenHpTo(healPct, ev.maxHp);
        } else {
          await this._delay(300);
        }
        break;
      }

      // ── BA-1: Faint ──────────────────────────────────────────────────────
      case 'faint': {
        const faintName = this._slotName(ev.side, ev.slot ?? 0);
        const prevInfo = this._slotInfoFor(ev.side, ev.slot ?? 0);
        const maxHp = Number(prevInfo?.maxHp || 0);
        this._updateSlotInfo(ev.side, ev.slot ?? 0, {
          hp: 0,
          maxHp,
          hpPercent: 0,
          hpLabel: `0/${maxHp || 0}`,
          fainted: true,
          statusEffect: '',
          statusLabel: '',
        });
        this._showMsg(`${faintName} 기절!`);
        this._playAudio('se/faint');
        const scene = this._scene();
        if (scene?.faintBattler) {
          await scene.faintBattler(ev.side);
        } else {
          await this._delay(500);
        }
        await this._delay(300);
        break;
      }

      // ── BA-3: Ability bar ────────────────────────────────────────────────
      case 'ability_show': {
        const abilityOwner = this._slotName(ev.side, ev.slot ?? 0);
        this._showMsg(`${abilityOwner}의 특성: ${ev.ability}!`);
        const ui = this._ui;
        if (ui?.abilityBar) {
          ui.abilityBar.update({
            visible: true,
            text: ev.ability,
            side: ev.side === this._playerSide ? 'player' : 'enemy',
          });
        }
        await this._delay(1200);
        // Hide bar; renderBattle() will restore final state on onComplete.
        if (ui?.abilityBar) {
          ui.abilityBar.update({ visible: false, text: '' });
        }
        break;
      }

      // ── BA-3: Weather ────────────────────────────────────────────────────
      case 'weather_start': {
        const wLabel = WEATHER_LABELS[toId(ev.weather)] ?? `날씨 변화: ${ev.weather}`;
        this._showMsg(wLabel);
        await this._delay(800);
        break;
      }

      case 'weather_end': {
        this._showMsg('날씨가 원래대로 돌아왔다.');
        await this._delay(600);
        break;
      }

      // BA-3: weather_tick is intentionally silent — avoid spamming messages every turn.

      // ── BA-3: Terrain ────────────────────────────────────────────────────
      case 'terrain_start': {
        const effectId = toId(ev.effect || ev.raw || '');
        const tLabel = TERRAIN_LABELS[effectId] ?? `필드 효과 시작: ${ev.effect}`;
        this._showMsg(tLabel);
        await this._delay(700);
        break;
      }

      case 'terrain_end': {
        this._showMsg('필드 효과가 사라졌다.');
        await this._delay(600);
        break;
      }

      // ── BA-4: Status apply ───────────────────────────────────────────────
      case 'status_apply': {
        this._applyInfoForSlot(ev.target?.side, ev.target?.slot ?? 0, {
          statusEffect: ev.status || '',
          statusLabel: ev.status || '',
        });
        const statusName = this._slotName(ev.target?.side, ev.target?.slot ?? 0);
        const statusLabel = STATUS_LABELS[toId(ev.status)] ?? `${ev.status} 상태`;
        this._showMsg(`${statusName}은(는) ${statusLabel}`);
        await this._delay(700);
        break;
      }

      case 'status_cure': {
        this._applyInfoForSlot(ev.target?.side, ev.target?.slot ?? 0, {
          statusEffect: '',
          statusLabel: '',
        });
        break;
      }

      // ── BA-4: Stat boost / unboost ───────────────────────────────────────
      case 'boost': {
        const boostName = this._slotName(ev.target?.side, ev.target?.slot ?? 0);
        const statLabel = STAT_LABELS[toId(ev.stat)] ?? ev.stat;
        const amount = Number(ev.amount) || 1;
        const suffix = amount >= 2 ? ' 크게 올랐다!' : ' 올랐다!';
        this._showMsg(`${boostName}의 ${statLabel}이${suffix}`);
        this._playAudio('se/stat_up');
        await this._delay(600);
        break;
      }

      case 'unboost': {
        const unboostName = this._slotName(ev.target?.side, ev.target?.slot ?? 0);
        const unstatLabel = STAT_LABELS[toId(ev.stat)] ?? ev.stat;
        const uamount = Number(ev.amount) || 1;
        const usuffix = uamount >= 2 ? ' 크게 내려갔다!' : ' 내려갔다!';
        this._showMsg(`${unboostName}의 ${unstatLabel}이${usuffix}`);
        this._playAudio('se/stat_down');
        await this._delay(600);
        break;
      }

      // ── BA-4: Miss ───────────────────────────────────────────────────────
      case 'miss': {
        // In Showdown protocol, miss/−miss stores the ATTACKER as ev.target (field is misnamed).
        // The attacker's move missed, so message: "X의 공격이 빗나갔다!"
        const missName = this._slotName(ev.target?.side, ev.target?.slot ?? 0);
        this._showMsg(`${missName}의 공격이 빗나갔다!`);
        await this._delay(500);
        break;
      }

      // ── BA-4: Can't move ─────────────────────────────────────────────────
      case 'cant_move': {
        const cantName = this._slotName(ev.actor?.side, ev.actor?.slot ?? 0);
        this._showMsg(`${cantName}은(는) 움직일 수 없다.`);
        await this._delay(600);
        break;
      }

      // ── BA-5a: Immune / fail ─────────────────────────────────────────────
      case 'immune': {
        // "X에게는 효과가 없는 것 같다…"
        const immuneName = this._slotName(ev.target?.side, ev.target?.slot ?? 0);
        this._showMsg(`${immuneName}에게는\n효과가 없는 것 같다…`);
        await this._delay(700);
        break;
      }

      case 'move_fail': {
        // "그러나 실패하고 말았다!!"
        this._showMsg('그러나 실패하고 말았다!!');
        await this._delay(600);
        break;
      }

      // ── BA-19: Form change immediate update ──────────────────────────────
      case 'forme_change': {
        const side = ev.target?.side;
        const slot = ev.target?.slot ?? 0;
        const isMegaPairMarker = ev.mechanism === '-mega' && !String(ev.toSpecies || '').trim();
        if (isMegaPairMarker) break;
        const slotInfoBefore = this._slotInfoFor(side, slot);
        const preName = this._slotName(side, slot);
        const toSpecies = String(ev.toSpecies || ev.to || '').trim();
        const visual = await this._resolveVisual(ev);
        const formPresentation = this._resolveFormChangePresentation(
          visual?.formChangePresentation || null,
          ev,
          slotInfoBefore,
        );
        if (visual?.spriteUrl) {
          const shouldShowSprite = formPresentation.isVisible !== false;
          await this._setBattlerSprite(side, visual.spriteUrl, { visible: shouldShowSprite });
        }
        let nextName = toSpecies;
        if (!nextName && visual?.infoPatch?.displayName) {
          nextName = String(visual.infoPatch.displayName || '').trim();
        }
        if (nextName) this._slotNames.set(this._slotKey(side, slot), nextName);
        if (toSpecies || visual?.infoPatch) {
          const formPatch = {
            ...(visual?.infoPatch || {}),
          };
          if (toSpecies) formPatch.displayName = toSpecies;
          else if (nextName && !formPatch.displayName) formPatch.displayName = nextName;
          this._applyInfoForSlot(side, slot, {
            ...formPatch,
          });
        }
        await this._playFormChangePresentation(side, formPresentation);
        const changed = nextName && toId(nextName) !== toId(preName);
        const shouldShowFallback = ev.mechanism === '-formechange' && !nextName;
        const hpBefore = Number(slotInfoBefore?.hp);
        const suppressMessageByFaint = Boolean(slotInfoBefore?.fainted)
          || (Number.isFinite(hpBefore) && hpBefore <= 0);
        if (!suppressMessageByFaint && !ev.silent && (changed || shouldShowFallback)) {
          const msg = this._buildFormChangeMessage(preName, nextName, ev.mechanism);
          if (msg) {
            this._showMsg(msg);
            await this._delay(700);
          }
        }
        break;
      }

      // ── 5-C: Battle end ─────────────────────────────────────────────────
      case 'battle_end': {
        // ev.winner is the Showdown player name of the winner.
        if (ev.winner) {
          this._showMsg(`${ev.winner} 승리!`);
          this._playAudio('se/level_up');
          await this._delay(1500);
        }
        break;
      }

      // ── no-op events ──────────────────────────────────────────────────────
      case 'weather_tick':
      case 'turn_end':
      case 'side_start':
      case 'side_end':
      case 'effect_activate':
      case 'single_turn_effect':
      case 'engine_error':
        break;

      // ── 5-C: Forced switch gate ──────────────────────────────────────────
      case 'callback_event': {
        // Show "교체할 포켓몬을 선택해 주세요!" then pause for player input.
        this._showMsg('교체할 포켓몬을 선택해 주세요!');
        await this._delay(600);
        // Pause the timeline and notify caller to show the party/switch UI.
        // The UI system (app.js) will pick up request.forceSwitch and surface party mode.
        this.running = false;
        this.onInputRequired(ev.requestType ?? 'switch');
        return;  // do not continue; the next turn's events will play after the switch choice
      }

      case 'raw_event':
      default:
        break;
    }
  }
}
