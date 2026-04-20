import { addTextObject } from '../helpers/text.js';
import { addWindow } from '../helpers/ui-theme.js';

const EFF_HEIGHT = 48;
const EFF_WIDTH = 82;
const DESC_HEIGHT = 48;
const BORDER = 8;

function parseMoveValue(value) {
  if (value === null || value === undefined) return '---';
  const text = String(value).trim();
  if (!text || text === '—' || text === '0') return '---';
  return text;
}

export class MoveInfoOverlay {
  constructor(ui, options = {}) {
    const normalized = { ...options };
    if (normalized.onSide) normalized.top = false;

    this.ui = ui;
    this.scene = ui.scene;
    this.options = normalized;
    this.active = false;
    this.descScroll = null;
    this.descMaskGraphics = null;
    this.container = this.scene.add.container(normalized.x || 0, normalized.y || 0);

    const width = normalized.width || MoveInfoOverlay.getWidth(ui);
    const descX = normalized.onSide && !normalized.right ? EFF_WIDTH : 0;
    const descY = normalized.top ? EFF_HEIGHT : 0;
    const descPanelWidth = width - (normalized.onSide ? EFF_WIDTH : 0);
    const clipX = descX + BORDER;
    const clipY = descY + BORDER - 2;
    const clipWidth = Math.max(1, descPanelWidth - (BORDER - 2) * 2);
    const clipHeight = Math.max(1, DESC_HEIGHT - (BORDER - 2) * 2);

    this.descBaseY = descY + BORDER - 2;

    this.descBg = addWindow(
      this.ui,
      descX,
      descY,
      descPanelWidth,
      DESC_HEIGHT,
    ).setOrigin(0, 0);
    this.container.add(this.descBg);

    this.desc = addTextObject(
      this.ui,
      clipX,
      this.descBaseY,
      '',
      'BATTLE_INFO',
      {
        wordWrap: {
          width: clipWidth,
          useAdvancedWrap: true,
        },
      },
    ).setOrigin(0, 0);
    this.container.add(this.desc);

    this.descMaskGraphics = this.scene.add.graphics();
    this.descMaskGraphics.fillStyle(0xffffff, 1);
    const maskPointOrigin = {
      x: Number.isFinite(normalized.x) ? normalized.x : 0,
      y: Number.isFinite(normalized.y) ? normalized.y : 0,
    };
    if (maskPointOrigin.x < 0) maskPointOrigin.x += this.ui?.env?.LOGICAL_WIDTH || 320;
    if (maskPointOrigin.y < 0) maskPointOrigin.y += this.ui?.env?.LOGICAL_HEIGHT || 180;
    this.descMaskGraphics.fillRect(
      maskPointOrigin.x + clipX,
      maskPointOrigin.y + clipY,
      clipWidth,
      clipHeight,
    );
    this.descMaskGraphics.setVisible(false);
    this.desc.setMask(this.descMaskGraphics.createGeometryMask());

    this.val = this.scene.add.container(
      normalized.right ? width - EFF_WIDTH : 0,
      normalized.top || normalized.onSide ? 0 : DESC_HEIGHT,
    );
    this.container.add(this.val);

    const valuesBg = addWindow(this.ui, 0, 0, EFF_WIDTH, EFF_HEIGHT).setOrigin(0, 0);
    this.val.add(valuesBg);

    const { env } = this.ui;
    this.typeIcon = env.textureExists(this.scene, env.UI_ASSETS.typesAtlas.key, 'unknown')
      ? this.scene.add.sprite(25, EFF_HEIGHT - 35, env.UI_ASSETS.typesAtlas.key, 'unknown').setScale(0.8)
      : addTextObject(this.ui, 25, EFF_HEIGHT - 35, '', 'MOVE_INFO_CONTENT');
    this.val.add(this.typeIcon);

    this.categoryIcon = env.textureExists(this.scene, env.UI_ASSETS.categoriesAtlas.key, 'status')
      ? this.scene.add.sprite(57, EFF_HEIGHT - 35, env.UI_ASSETS.categoriesAtlas.key, 'status')
      : addTextObject(this.ui, 57, EFF_HEIGHT - 35, '', 'MOVE_INFO_CONTENT');
    this.val.add(this.categoryIcon);

    const ppLabel = addTextObject(this.ui, 12, EFF_HEIGHT - 25, 'PP', 'MOVE_INFO_CONTENT').setOrigin(0, 0.5);
    this.ppText = addTextObject(this.ui, 70, EFF_HEIGHT - 25, '--', 'MOVE_INFO_CONTENT').setOrigin(1, 0.5);
    const powerLabel = addTextObject(this.ui, 12, EFF_HEIGHT - 17, this.ui.uiLanguage === 'ko' ? '위력' : 'Power', 'MOVE_INFO_CONTENT').setOrigin(0, 0.5);
    this.powerText = addTextObject(this.ui, 70, EFF_HEIGHT - 17, '---', 'MOVE_INFO_CONTENT').setOrigin(1, 0.5);
    const accLabel = addTextObject(this.ui, 12, EFF_HEIGHT - 9, this.ui.uiLanguage === 'ko' ? '명중률' : 'Accuracy', 'MOVE_INFO_CONTENT').setOrigin(0, 0.5);
    this.accuracyText = addTextObject(this.ui, 70, EFF_HEIGHT - 9, '---', 'MOVE_INFO_CONTENT').setOrigin(1, 0.5);
    this.val.add([ppLabel, this.ppText, powerLabel, this.powerText, accLabel, this.accuracyText]);

    if (normalized.hideEffectBox) this.val.setVisible(false);
    if (normalized.hideBg) this.descBg.setVisible(false);

    this.setVisible(false);
  }

  show(detail = {}) {
    const description = String(detail.description || detail.effect || '').trim();
    this.desc.setText(description);

    if (this.typeIcon?.setTexture) {
      const typeKey = this.ui.uiLanguage === 'ko' && this.ui.env.textureExists(this.scene, this.ui.env.UI_ASSETS.typesKoAtlas.key, detail.type || 'unknown')
        ? this.ui.env.UI_ASSETS.typesKoAtlas.key
        : this.ui.env.UI_ASSETS.typesAtlas.key;
      if (this.ui.env.textureExists(this.scene, typeKey, detail.type || 'unknown')) {
        this.typeIcon.setTexture(typeKey, detail.type || 'unknown');
      }
    } else if (this.typeIcon?.setText) {
      this.typeIcon.setText(detail.typeLabel || detail.type || '');
    }

    if (this.categoryIcon?.setTexture) {
      if (this.ui.env.textureExists(this.scene, this.ui.env.UI_ASSETS.categoriesAtlas.key, detail.category || 'status')) {
        this.categoryIcon.setTexture(this.ui.env.UI_ASSETS.categoriesAtlas.key, detail.category || 'status');
      }
    } else if (this.categoryIcon?.setText) {
      this.categoryIcon.setText(detail.category || '');
    }

    this.ppText.setText(parseMoveValue(detail.ppLabel || detail.pp));
    this.powerText.setText(parseMoveValue(detail.powerLabel || detail.power));
    this.accuracyText.setText(parseMoveValue(detail.accuracyLabel || detail.accuracy));

    if (this.descScroll) {
      this.descScroll.remove();
      this.descScroll = null;
    }
    this.desc.setY(this.descBaseY);

    const wrapped = this.desc.getWrappedText ? this.desc.getWrappedText(this.desc.text || '') : [];
    const lineCount = Array.isArray(wrapped) ? wrapped.length : 0;
    if (lineCount > 3) {
      const lineHeight = this.desc.displayHeight / Math.max(1, lineCount);
      const distance = lineHeight * (lineCount - 3);
      this.descScroll = this.scene.tweens.add({
        targets: this.desc,
        delay: 2000,
        hold: 2000,
        duration: (lineCount - 3) * 2000,
        y: this.descBaseY - distance,
        repeat: -1,
      });
    }

    if (!this.options.delayVisibility) this.setVisible(true);
    this.active = true;
    return true;
  }

  clear() {
    if (this.descScroll) {
      this.descScroll.remove();
      this.descScroll = null;
    }
    this.desc.setY(this.descBaseY);
    this.desc.setAlpha(1);
    this.setVisible(false);
    this.active = false;
  }

  toggleInfo(visible) {
    if (visible) this.setVisible(true);
    this.scene.tweens?.add?.({
      targets: this.desc,
      duration: 125,
      ease: 'Sine.easeInOut',
      alpha: visible ? 1 : 0,
    });
    if (!visible) this.setVisible(false);
  }

  isActive() {
    return this.active;
  }

  setVisible(visible) {
    this.container.setVisible(Boolean(visible));
    return this;
  }

  destroy(fromScene = false) {
    if (this.descScroll) {
      this.descScroll.remove();
      this.descScroll = null;
    }
    if (this.descMaskGraphics) {
      this.descMaskGraphics.destroy();
      this.descMaskGraphics = null;
    }
    this.container.destroy(fromScene);
  }

  static getWidth(ui) {
    return (ui?.env?.LOGICAL_WIDTH || 320) / 2;
  }

  static getHeight(onSide = false) {
    return onSide ? Math.max(EFF_HEIGHT, DESC_HEIGHT) : EFF_HEIGHT + DESC_HEIGHT;
  }
}
