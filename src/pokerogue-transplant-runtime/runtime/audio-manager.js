/**
 * BattleAudioManager (M4 — Sprint 2a)
 *
 * Handles loading and playback of PokeRogue-compatible audio assets.
 * Key conventions match PokeRogue's playSound() channel split:
 *   ui/      → UI sound effects (select, error, menu_open)
 *   se/      → Battle sound effects (hit, faint, pb_rel, ...)
 *   cry/     → Pokémon cries (lazy-loaded per species)
 *   battle_anims/ → Move animation sounds
 *   bgm/     → Background music
 *
 * Volume routing mirrors PokeRogue's channel structure:
 *   masterVol × { uiVol | seVol | fieldVol | bgmVol }
 */
export class BattleAudioManager {
  constructor(scene) {
    this.scene = scene;
    this.masterVol = 0.7;
    this.bgmVol   = 1.0;
    this.fieldVol = 1.0;
    this.seVol    = 1.0;
    this.uiVol    = 1.0;
    this._loadingCries = new Set();
  }

  /**
   * Preload basic SE/UI sounds during the scene's preload phase.
   * Call from scene.preload() — these load with the normal asset pipeline.
   */
  preloadBasic() {
    this._queueLoad('ui/select',     'ui/select.wav');
    this._queueLoad('ui/error',      'ui/error.wav');
    this._queueLoad('ui/menu_open',  'ui/menu_open.wav');
    this._queueLoad('se/hit',        'se/hit.wav');
    this._queueLoad('se/hit_strong', 'se/hit_strong.wav');
    this._queueLoad('se/hit_weak',   'se/hit_weak.wav');
    this._queueLoad('se/pb_rel',     'se/pb_rel.wav');
    this._queueLoad('se/faint',      'se/faint.wav');
  }

  /**
   * Play a loaded audio key.
   * Returns the Phaser Sound instance, or null on failure (missing key, audio context locked, etc.)
   * @param {string} key  e.g. 'ui/select', 'se/hit', 'cry/PIKACHU'
   * @param {number} [volume=1]  multiplier on top of routed channel volume
   */
  play(key, volume = 1) {
    try {
      if (!this.scene.cache.audio.has(key)) {
        console.warn(`[BattleAudio] not loaded: ${key}`);
        return null;
      }
      const vol = this._routeVolume(key) * volume;
      return this.scene.sound.play(key, {volume: vol});
    } catch (err) {
      // AudioContext not yet started (browser autoplay policy) or other transient error.
      console.warn(`[BattleAudio] play failed (${key}):`, err.message ?? err);
      return null;
    }
  }

  /**
   * Play the hit SE appropriate for the hitResult from a damage event.
   * @param {'super'|'not_very'|'effective'|'indirect'|'ohko'} hitResult
   */
  playHitByResult(hitResult) {
    if (hitResult === 'super')     return this.play('se/hit_strong');
    if (hitResult === 'not_very')  return this.play('se/hit_weak');
    return this.play('se/hit');
  }

  /**
   * Lazy-load and play a Pokémon cry.
   * spriteId matches the cry filename stem (e.g. 'PIKACHU', 'CHARIZARD').
   * Safe to call before load completes — cry plays when ready.
   * @param {string} spriteId
   */
  async playCry(spriteId) {
    if (!spriteId) return;
    const key = `cry/${spriteId}`;
    if (this.scene.cache.audio.has(key)) {
      this.play(key);
      return;
    }
    if (this._loadingCries.has(key)) return; // already in-flight
    this._loadingCries.add(key);
    try {
      await this._loadAudioRuntime(key, `cry/${spriteId}.wav`);
      this.play(key);
    } catch {
      // Missing cry file — silent fallback, battle continues.
    } finally {
      this._loadingCries.delete(key);
    }
  }

  // ─── private ──────────────────────────────────────────────────────────────

  /** Queue a load during preload phase. No-op if key is already cached. */
  _queueLoad(key, relativePath) {
    if (this.scene.cache.audio.has(key)) return;
    this.scene.load.audio(key, `./assets/pokerogue/audio/${relativePath}`);
  }

  /** Load an audio file at runtime (after preload phase) and return a Promise. */
  _loadAudioRuntime(key, relativePath) {
    return new Promise((resolve, reject) => {
      if (this.scene.cache.audio.has(key)) { resolve(); return; }
      const url = `./assets/pokerogue/audio/${relativePath}`;
      this.scene.load.audio(key, url);
      this.scene.load.once('complete', resolve);
      this.scene.load.once('loaderror', (file) => {
        if (file?.key === key) reject(new Error(`cry load error: ${key}`));
      });
      this.scene.load.start();
    });
  }

  /** Map audio key prefix to effective volume (channel routing). */
  _routeVolume(key) {
    if (key.startsWith('ui/'))                                   return this.masterVol * this.uiVol;
    if (key.startsWith('bgm/'))                                  return this.masterVol * this.bgmVol;
    if (key.startsWith('cry/') || key.startsWith('battle_anims/')) return this.masterVol * this.fieldVol;
    return this.masterVol * this.seVol; // se/ and anything else
  }
}
