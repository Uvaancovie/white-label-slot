import { Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import type { SymbolId } from "@sa-slot/shared";

export const ASSET_URLS = {
  wild: "https://vydleiyxfqrhxoddbcpi.supabase.co/storage/v1/object/public/gambling-symbols/springbok-rush/wild-symbol-removebg.png",
  cheetah: "https://vydleiyxfqrhxoddbcpi.supabase.co/storage/v1/object/public/gambling-symbols/springbok-rush/cheetah-symbol-bg-removebg-preview.png",
  diamond: "https://vydleiyxfqrhxoddbcpi.supabase.co/storage/v1/object/public/gambling-symbols/springbok-rush/diamond-symbol-bg-removebg-preview.png",
  scatter: "https://vydleiyxfqrhxoddbcpi.supabase.co/storage/v1/object/public/gambling-symbols/springbok-rush/diamond-symbol-bg-removebg-preview.png",
  springbok: "https://vydleiyxfqrhxoddbcpi.supabase.co/storage/v1/object/public/gambling-symbols/springbok-rush/springbok-symbol-bg-removebg-preview.png",
  gold: "https://vydleiyxfqrhxoddbcpi.supabase.co/storage/v1/object/public/gambling-symbols/springbok-rush/gold-symbol-remove-bg.png",
  protea: "https://vydleiyxfqrhxoddbcpi.supabase.co/storage/v1/object/public/gambling-symbols/springbok-rush/protea-symbol-removebg.png",
  drum: "https://vydleiyxfqrhxoddbcpi.supabase.co/storage/v1/object/public/gambling-symbols/springbok-rush/african-drum-remove-bg.png",
};

export const loadedTextures: {
  wild?: Texture;
  cheetah?: Texture;
  diamond?: Texture;
  springbok?: Texture;
  gold?: Texture;
  protea?: Texture;
  drum?: Texture;
} = {};

let assetsLoadingPromise: Promise<void> | null = null;

export async function preloadSymbolTextures(): Promise<void> {
  if (assetsLoadingPromise) return assetsLoadingPromise;
  assetsLoadingPromise = (async () => {
    try {
      const [wildTex, cheetahTex, diamondTex, springbokTex, goldTex, proteaTex, drumTex] = await Promise.all([
        Assets.load(ASSET_URLS.wild).catch((err) => {
          console.warn("Failed to load wild texture, fallback to vector", err);
          return undefined;
        }),
        Assets.load(ASSET_URLS.cheetah).catch((err) => {
          console.warn("Failed to load cheetah texture, fallback to vector", err);
          return undefined;
        }),
        Assets.load(ASSET_URLS.diamond).catch((err) => {
          console.warn("Failed to load diamond texture, fallback to vector", err);
          return undefined;
        }),
        Assets.load(ASSET_URLS.springbok).catch((err) => {
          console.warn("Failed to load springbok texture, fallback to vector", err);
          return undefined;
        }),
        Assets.load(ASSET_URLS.gold).catch((err) => {
          console.warn("Failed to load gold texture, fallback to vector", err);
          return undefined;
        }),
        Assets.load(ASSET_URLS.protea).catch((err) => {
          console.warn("Failed to load protea texture, fallback to vector", err);
          return undefined;
        }),
        Assets.load(ASSET_URLS.drum).catch((err) => {
          console.warn("Failed to load drum texture, fallback to vector", err);
          return undefined;
        }),
      ]);
      if (wildTex) loadedTextures.wild = wildTex;
      if (cheetahTex) loadedTextures.cheetah = cheetahTex;
      if (diamondTex) loadedTextures.diamond = diamondTex;
      if (springbokTex) loadedTextures.springbok = springbokTex;
      if (goldTex) loadedTextures.gold = goldTex;
      if (proteaTex) loadedTextures.protea = proteaTex;
      if (drumTex) loadedTextures.drum = drumTex;
    } catch (e) {
      console.warn("Error in symbol asset preloader:", e);
    }
  })();
  return assetsLoadingPromise;
}

export const SYMBOL_COLORS: Record<
  SymbolId,
  { bg: number; bg2: number; border: number; fg: number; label: string }
> = {
  wild: { bg: 0x0d0103, bg2: 0x2d0208, border: 0xff2a3b, fg: 0xffffff, label: "WILD" },
  scatter: { bg: 0x0f0103, bg2: 0x330209, border: 0xff2a3b, fg: 0xff3344, label: "DIAMOND" },
  springbok: { bg: 0x080102, bg2: 0x240206, border: 0xff4d5e, fg: 0xffffff, label: "SPRINGBOK" },
  cheetah: { bg: 0x140700, bg2: 0x3d1702, border: 0xff8c00, fg: 0xffd700, label: "CHEETAH" },
  protea: { bg: 0x0a0103, bg2: 0x280207, border: 0xff5c7a, fg: 0xffffff, label: "PROTEA" },
  gold: { bg: 0x0d0801, bg2: 0x2b1c02, border: 0xffb300, fg: 0xffffff, label: "GOLD" },
  drum: { bg: 0x080102, bg2: 0x240206, border: 0xd61c24, fg: 0xffffff, label: "DRUM" },
  A: { bg: 0x050001, bg2: 0x1f0105, border: 0xff2a3b, fg: 0xff2a3b, label: "A" },
  K: { bg: 0x050001, bg2: 0x1f0105, border: 0xd61c24, fg: 0xff3b4a, label: "K" },
  Q: { bg: 0x050001, bg2: 0x1f0105, border: 0xc42533, fg: 0xff4d5d, label: "Q" },
  J: { bg: 0x050001, bg2: 0x1f0105, border: 0xa81c28, fg: 0xff5f6e, label: "J" },
  "10": { bg: 0x050001, bg2: 0x1f0105, border: 0x8c1520, fg: 0xff707f, label: "10" },
};

export const SYMBOL_GLOW_COLORS: Record<SymbolId, { core: number; outer: number }> = {
  scatter: { core: 0x00ffff, outer: 0x00d2ff },
  wild: { core: 0xff3b4a, outer: 0xff1744 },
  cheetah: { core: 0xffd700, outer: 0xff8c00 },
  springbok: { core: 0x00ffaa, outer: 0x00e676 },
  gold: { core: 0xffea00, outer: 0xffb300 },
  protea: { core: 0xff80ab, outer: 0xff4081 },
  drum: { core: 0xffab40, outer: 0xff6d00 },
  A: { core: 0xff5252, outer: 0xd61c24 },
  K: { core: 0xff5252, outer: 0xd61c24 },
  Q: { core: 0xff4081, outer: 0xc42533 },
  J: { core: 0xff7080, outer: 0xa81c28 },
  "10": { core: 0xff7080, outer: 0x8c1520 },
};

export interface SymbolContainer extends Container {
  symbolId: SymbolId;
  iconWrapper: Container;
  spinGlowGfx: Graphics;
  setSpinningState: (isSpinning: boolean, intensity?: number) => void;
  updateSpinAnimation: (time: number) => void;
}

export function createSymbolSprite(
  id: SymbolId,
  width: number,
  height: number,
): SymbolContainer {
  const root = new Container() as SymbolContainer;
  root.symbolId = id;

  const meta = SYMBOL_COLORS[id] || SYMBOL_COLORS["10"];
  const glowMeta = SYMBOL_GLOW_COLORS[id] || SYMBOL_GLOW_COLORS["10"];

  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const x = pad;
  const y = pad;
  const r = 10;

  // 1. Dedicated Spin Glow Aura Layer (Behind card)
  const spinGlow = new Graphics();
  spinGlow.visible = false;
  root.addChild(spinGlow);
  root.spinGlowGfx = spinGlow;

  // 2. Base Card Background & Frame
  const cardBg = new Graphics();

  // Drop shadow
  cardBg.roundRect(x + 1, y + 3, w, h, r);
  cardBg.fill({ color: 0x000000, alpha: 0.65 });

  // Outer frame metallic gradient emulation
  cardBg.roundRect(x, y, w, h, r);
  cardBg.fill({ color: meta.border, alpha: 0.95 });

  // Inner card background
  cardBg.roundRect(x + 2, y + 2, w - 4, h - 4, r - 2);
  cardBg.fill({ color: meta.bg, alpha: 0.98 });

  // Top gloss gradient reflection
  cardBg.roundRect(x + 3, y + 3, w - 6, (h - 6) * 0.45, r - 3);
  cardBg.fill({ color: meta.bg2, alpha: 0.75 });

  // Curved glass specular arc
  cardBg.ellipse(x + w / 2, y + 2, w * 0.42, h * 0.22);
  cardBg.fill({ color: 0xffffff, alpha: 0.15 });

  // Bevel border highlight
  cardBg.roundRect(x + 2, y + 2, w - 4, h - 4, r - 2);
  cardBg.stroke({ width: 1.5, color: 0xffffff, alpha: 0.25 });

  root.addChild(cardBg);

  // 3. Icon and Artwork Wrapper (Receives high-frequency spin shake & jitter)
  const iconWrapper = new Container();
  root.addChild(iconWrapper);
  root.iconWrapper = iconWrapper;

  const cx = width / 2;
  const cy = height * 0.44;

  const artGfx = new Graphics();

  // Check if image texture is available for PNG assets
  let hasImageSprite = false;

  if (id === "wild" && loadedTextures.wild) {
    const spr = new Sprite(loadedTextures.wild);
    spr.anchor.set(0.5);
    spr.x = cx;
    spr.y = cy;
    const maxDim = Math.min(w * 0.94, h * 0.78);
    const aspect = spr.texture.width / (spr.texture.height || 1);
    if (aspect > 1) {
      spr.width = maxDim;
      spr.height = maxDim / aspect;
    } else {
      spr.height = maxDim;
      spr.width = maxDim * aspect;
    }
    // Radiant Golden Crimson Wild Aura
    artGfx.circle(cx, cy, Math.min(w, h) * 0.36);
    artGfx.fill({ color: 0xff1744, alpha: 0.45 });
    iconWrapper.addChild(artGfx);
    iconWrapper.addChild(spr);
    hasImageSprite = true;
  } else if (id === "cheetah" && loadedTextures.cheetah) {
    const spr = new Sprite(loadedTextures.cheetah);
    spr.anchor.set(0.5);
    spr.x = cx;
    spr.y = cy;
    const maxDim = Math.min(w * 0.94, h * 0.78);
    const aspect = spr.texture.width / (spr.texture.height || 1);
    if (aspect > 1) {
      spr.width = maxDim;
      spr.height = maxDim / aspect;
    } else {
      spr.height = maxDim;
      spr.width = maxDim * aspect;
    }
    // Background cheetah warm golden glow aura
    artGfx.circle(cx, cy, Math.min(w, h) * 0.36);
    artGfx.fill({ color: 0xff8c00, alpha: 0.4 });
    iconWrapper.addChild(artGfx);
    iconWrapper.addChild(spr);
    hasImageSprite = true;
  } else if (id === "scatter" && loadedTextures.diamond) {
    const spr = new Sprite(loadedTextures.diamond);
    spr.anchor.set(0.5);
    spr.x = cx;
    spr.y = cy;
    const maxDim = Math.min(w * 0.92, h * 0.76);
    const aspect = spr.texture.width / (spr.texture.height || 1);
    if (aspect > 1) {
      spr.width = maxDim;
      spr.height = maxDim / aspect;
    } else {
      spr.height = maxDim;
      spr.width = maxDim * aspect;
    }
    // Diamond sparkle aura
    artGfx.circle(cx, cy, Math.min(w, h) * 0.35);
    artGfx.fill({ color: 0x00d2ff, alpha: 0.38 });
    iconWrapper.addChild(artGfx);
    iconWrapper.addChild(spr);
    hasImageSprite = true;
  } else if (id === "springbok" && loadedTextures.springbok) {
    const spr = new Sprite(loadedTextures.springbok);
    spr.anchor.set(0.5);
    spr.x = cx;
    spr.y = cy;
    const maxDim = Math.min(w * 0.94, h * 0.78);
    const aspect = spr.texture.width / (spr.texture.height || 1);
    if (aspect > 1) {
      spr.width = maxDim;
      spr.height = maxDim / aspect;
    } else {
      spr.height = maxDim;
      spr.width = maxDim * aspect;
    }
    // Emerald / gold glow aura
    artGfx.circle(cx, cy, Math.min(w, h) * 0.35);
    artGfx.fill({ color: 0x00e676, alpha: 0.38 });
    iconWrapper.addChild(artGfx);
    iconWrapper.addChild(spr);
    hasImageSprite = true;
  } else if (id === "gold" && loadedTextures.gold) {
    const spr = new Sprite(loadedTextures.gold);
    spr.anchor.set(0.5);
    spr.x = cx;
    spr.y = cy;
    const maxDim = Math.min(w * 0.92, h * 0.76);
    const aspect = spr.texture.width / (spr.texture.height || 1);
    if (aspect > 1) {
      spr.width = maxDim;
      spr.height = maxDim / aspect;
    } else {
      spr.height = maxDim;
      spr.width = maxDim * aspect;
    }
    // Radiant Golden Aura
    artGfx.circle(cx, cy, Math.min(w, h) * 0.35);
    artGfx.fill({ color: 0xffd700, alpha: 0.42 });
    iconWrapper.addChild(artGfx);
    iconWrapper.addChild(spr);
    hasImageSprite = true;
  } else if (id === "protea" && loadedTextures.protea) {
    const spr = new Sprite(loadedTextures.protea);
    spr.anchor.set(0.5);
    spr.x = cx;
    spr.y = cy;
    const maxDim = Math.min(w * 0.94, h * 0.78);
    const aspect = spr.texture.width / (spr.texture.height || 1);
    if (aspect > 1) {
      spr.width = maxDim;
      spr.height = maxDim / aspect;
    } else {
      spr.height = maxDim;
      spr.width = maxDim * aspect;
    }
    // Pink Protea Blossom Aura
    artGfx.circle(cx, cy, Math.min(w, h) * 0.35);
    artGfx.fill({ color: 0xff4081, alpha: 0.4 });
    iconWrapper.addChild(artGfx);
    iconWrapper.addChild(spr);
    hasImageSprite = true;
  } else if (id === "drum" && loadedTextures.drum) {
    const spr = new Sprite(loadedTextures.drum);
    spr.anchor.set(0.5);
    spr.x = cx;
    spr.y = cy;
    const maxDim = Math.min(w * 0.92, h * 0.76);
    const aspect = spr.texture.width / (spr.texture.height || 1);
    if (aspect > 1) {
      spr.width = maxDim;
      spr.height = maxDim / aspect;
    } else {
      spr.height = maxDim;
      spr.width = maxDim * aspect;
    }
    // Warm African Amber & Crimson Aura
    artGfx.circle(cx, cy, Math.min(w, h) * 0.35);
    artGfx.fill({ color: 0xff6d00, alpha: 0.4 });
    iconWrapper.addChild(artGfx);
    iconWrapper.addChild(spr);
    hasImageSprite = true;
  }

  if (!hasImageSprite) {
    // Render high-definition vector icons
    if (id === "cheetah") {
      // Cheetah vector face & golden rosettes
      artGfx.circle(cx, cy, Math.min(w, h) * 0.34);
      artGfx.fill({ color: 0x4a2105, alpha: 0.75 });
      artGfx.stroke({ width: 2.5, color: 0xffaa00, alpha: 0.95 });

      // Cheetah muzzle & ears
      artGfx.moveTo(cx - 18, cy - 10);
      artGfx.lineTo(cx - 22, cy - 24);
      artGfx.lineTo(cx - 10, cy - 16);
      artGfx.closePath();
      artGfx.fill({ color: 0xff9900, alpha: 0.98 });
      artGfx.stroke({ width: 2, color: 0xffe680 });

      artGfx.moveTo(cx + 18, cy - 10);
      artGfx.lineTo(cx + 22, cy - 24);
      artGfx.lineTo(cx + 10, cy - 16);
      artGfx.closePath();
      artGfx.fill({ color: 0xff9900, alpha: 0.98 });
      artGfx.stroke({ width: 2, color: 0xffe680 });

      // Snout
      artGfx.ellipse(cx, cy + 5, 14, 10);
      artGfx.fill({ color: 0xffe0b2, alpha: 0.98 });

      // Nose & eyes
      artGfx.moveTo(cx - 5, cy + 3);
      artGfx.lineTo(cx + 5, cy + 3);
      artGfx.lineTo(cx, cy + 8);
      artGfx.closePath();
      artGfx.fill({ color: 0x212121, alpha: 1 });

      // Distinctive cheetah tear lines
      artGfx.moveTo(cx - 10, cy - 4);
      artGfx.lineTo(cx - 7, cy + 6);
      artGfx.stroke({ width: 2.5, color: 0x000000 });
      artGfx.moveTo(cx + 10, cy - 4);
      artGfx.lineTo(cx + 7, cy + 6);
      artGfx.stroke({ width: 2.5, color: 0x000000 });

      // Eyes
      artGfx.circle(cx - 10, cy - 5, 4);
      artGfx.fill(0xffd700);
      artGfx.circle(cx + 10, cy - 5, 4);
      artGfx.fill(0xffd700);
    } else if (id === "springbok") {
      // Springbok Head & Golden Horns
      artGfx.circle(cx, cy, Math.min(w, h) * 0.34);
      artGfx.fill({ color: 0x004d33, alpha: 0.65 });
      artGfx.stroke({ width: 2, color: 0x00ffaa, alpha: 0.85 });

      artGfx.moveTo(cx - 20, cy + 12);
      artGfx.quadraticCurveTo(cx - 26, cy - 20, cx - 17, cy - 28);
      artGfx.quadraticCurveTo(cx - 10, cy - 17, cx, cy - 3);
      artGfx.quadraticCurveTo(cx + 10, cy - 17, cx + 17, cy - 28);
      artGfx.quadraticCurveTo(cx + 26, cy - 20, cx + 20, cy + 12);
      artGfx.lineTo(cx + 12, cy + 19);
      artGfx.lineTo(cx, cy + 14);
      artGfx.lineTo(cx - 12, cy + 19);
      artGfx.closePath();
      artGfx.fill({ color: 0xffd700, alpha: 0.98 });
      artGfx.stroke({ width: 2.5, color: 0xffffff, alpha: 0.9 });

      // Horn ribbed ridges
      artGfx.moveTo(cx - 14, cy - 3);
      artGfx.quadraticCurveTo(cx - 21, cy - 12, cx - 17, cy - 25);
      artGfx.stroke({ width: 2.5, color: 0xcc8800 });
      artGfx.moveTo(cx + 14, cy - 3);
      artGfx.quadraticCurveTo(cx + 21, cy - 12, cx + 17, cy - 25);
      artGfx.stroke({ width: 2.5, color: 0xcc8800 });
    } else if (id === "wild") {
      // Glowing 8-Point Golden Star Medallion
      const outerR = Math.min(w, h) * 0.38;
      const innerR = Math.min(w, h) * 0.19;

      // Ambient glow ring
      artGfx.circle(cx, cy, outerR + 6);
      artGfx.fill({ color: 0xffaa00, alpha: 0.4 });

      artGfx.star(cx, cy, 8, outerR, innerR);
      artGfx.fill({ color: 0xffd700, alpha: 0.98 });
      artGfx.stroke({ width: 2.5, color: 0xffffff });

      artGfx.circle(cx, cy, innerR * 1.15);
      artGfx.fill({ color: 0xff6600, alpha: 0.95 });
      artGfx.stroke({ width: 2, color: 0xffe680 });
    } else if (id === "scatter") {
      // Glowing Diamond Gem
      const rR = Math.min(w, h) * 0.35;

      artGfx.circle(cx, cy, rR + 6);
      artGfx.fill({ color: 0x00d2ff, alpha: 0.45 });

      // Diamond polygon
      artGfx.moveTo(cx, cy - rR);
      artGfx.lineTo(cx + rR * 1.15, cy);
      artGfx.lineTo(cx, cy + rR);
      artGfx.lineTo(cx - rR * 1.15, cy);
      artGfx.closePath();
      artGfx.fill({ color: 0x00b4d8, alpha: 0.98 });
      artGfx.stroke({ width: 3, color: 0xffffff });

      // Inner diamond facet lines
      artGfx.moveTo(cx, cy - rR);
      artGfx.lineTo(cx, cy + rR);
      artGfx.stroke({ width: 2, color: 0xe0f7fa, alpha: 0.9 });
      artGfx.moveTo(cx - rR * 1.15, cy);
      artGfx.lineTo(cx + rR * 1.15, cy);
      artGfx.stroke({ width: 2, color: 0xe0f7fa, alpha: 0.9 });

      // Specular shine on gem
      artGfx.circle(cx - rR * 0.32, cy - rR * 0.32, rR * 0.28);
      artGfx.fill({ color: 0xffffff, alpha: 0.95 });
    } else if (id === "protea") {
      // Blooming Protea Petals
      const pR = Math.min(w, h) * 0.32;
      artGfx.circle(cx, cy, pR + 4);
      artGfx.fill({ color: 0xff0088, alpha: 0.35 });

      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const px = cx + Math.cos(angle) * 14;
        const py = cy + Math.sin(angle) * 14;
        artGfx.ellipse(px, py, 10, 18);
        artGfx.fill({ color: 0xff44aa, alpha: 0.9 });
        artGfx.stroke({ width: 1.5, color: 0xffccf0 });
      }
      artGfx.circle(cx, cy, 12);
      artGfx.fill({ color: 0xffe066, alpha: 0.98 });
    } else if (id === "gold") {
      // Stacked Gold Bullion Bars
      artGfx.roundRect(cx - 22, cy - 14, 44, 22, 5);
      artGfx.fill({ color: 0xffca28, alpha: 0.98 });
      artGfx.stroke({ width: 2, color: 0xffffff, alpha: 0.85 });

      artGfx.roundRect(cx - 26, cy + 2, 44, 22, 5);
      artGfx.fill({ color: 0xffa000, alpha: 0.98 });
      artGfx.stroke({ width: 2, color: 0xffe082 });
    } else if (id === "drum") {
      // Zulu Ceremonial Drum
      artGfx.ellipse(cx, cy - 12, 24, 11);
      artGfx.fill({ color: 0xffd180, alpha: 0.98 });
      artGfx.stroke({ width: 2, color: 0x5d4037 });

      artGfx.moveTo(cx - 24, cy - 12);
      artGfx.lineTo(cx - 15, cy + 20);
      artGfx.lineTo(cx + 15, cy + 20);
      artGfx.lineTo(cx + 24, cy - 12);
      artGfx.closePath();
      artGfx.fill({ color: 0x795548, alpha: 0.98 });

      artGfx.moveTo(cx - 22, cy - 10);
      artGfx.lineTo(cx, cy + 18);
      artGfx.lineTo(cx + 22, cy - 10);
      artGfx.stroke({ width: 2, color: 0xffecb3 });
    }

    iconWrapper.addChild(artGfx);
  }

  // Label formatting
  const isRoyals = ["A", "K", "Q", "J", "10"].includes(id);
  const fontSize = isRoyals
    ? Math.floor(height * 0.52)
    : Math.floor(height * 0.16);

  const fgHex = `#${meta.fg.toString(16).padStart(6, "0")}`;
  const label = new Text({
    text: meta.label,
    style: {
      fontFamily: "Rajdhani, Inter, Arial, sans-serif",
      fontSize,
      fontWeight: "700",
      fill: fgHex,
      stroke: { color: 0x000000, width: isRoyals ? 5.5 : 3.5 },
      dropShadow: {
        alpha: 0.9,
        blur: 4,
        color: 0x000000,
        distance: 2,
      },
      align: "center",
    },
  });
  label.anchor.set(0.5);
  label.x = width / 2;
  label.y = isRoyals ? height * 0.5 : height * 0.85;
  iconWrapper.addChild(label);

  // Dynamic Random Seed for unique vibration jitter per symbol
  const jitterSeed = Math.random() * 100;
  let currentSpinIntensity = 1.0;
  let isSpinningActive = false;

  root.setSpinningState = (isSpinning: boolean, intensity = 1.0) => {
    isSpinningActive = isSpinning;
    currentSpinIntensity = intensity;
    spinGlow.visible = isSpinning;

    if (!isSpinning) {
      spinGlow.clear();
      iconWrapper.x = 0;
      iconWrapper.y = 0;
      iconWrapper.rotation = 0;
      iconWrapper.scale.set(1.0);
    }
  };

  root.updateSpinAnimation = (time: number) => {
    if (!isSpinningActive) return;

    // 1. High-Frequency Micro-Shake / Jitter on the symbol icon & artwork
    const shakeFreq = 48;
    const shakeMagX = 3.6 * currentSpinIntensity;
    const shakeMagY = 2.2 * currentSpinIntensity;
    const shakeRotMag = 0.045 * currentSpinIntensity;

    iconWrapper.x = Math.sin(time * shakeFreq + jitterSeed) * shakeMagX;
    iconWrapper.y = Math.cos(time * (shakeFreq * 1.1) + jitterSeed) * shakeMagY;
    iconWrapper.rotation = Math.sin(time * (shakeFreq * 0.7) + jitterSeed) * shakeRotMag;

    // Subtle elastic squash/stretch during spin rumble
    const squash = 1.0 + 0.04 * Math.sin(time * 30 + jitterSeed);
    iconWrapper.scale.set(1 / Math.sqrt(squash), squash);

    // 2. Radiant Neon Spin Glow Aura & Electric Corona
    spinGlow.clear();

    const pulse = 0.65 + 0.35 * Math.sin(time * 12 + jitterSeed);
    const expand = 3 + 3 * pulse;

    // Outer diffuse neon halo
    spinGlow.roundRect(x - expand - 4, y - expand - 4, w + (expand + 4) * 2, h + (expand + 4) * 2, r + 4);
    spinGlow.fill({ color: glowMeta.outer, alpha: 0.38 * pulse });

    // Core bright electric aura
    spinGlow.roundRect(x - expand, y - expand, w + expand * 2, h + expand * 2, r + 2);
    spinGlow.fill({ color: glowMeta.core, alpha: 0.48 * pulse });
    spinGlow.stroke({ width: 3.0, color: 0xffffff, alpha: 0.85 * pulse });

    // Rotating diamond corner sparkles on spinning symbols
    const cornerRadius = 5 + pulse * 3;
    const starRot = time * 8 + jitterSeed;
    const corners = [
      [x - expand / 2, y - expand / 2],
      [x + w + expand / 2, y - expand / 2],
      [x - expand / 2, y + h + expand / 2],
      [x + w + expand / 2, y + h + expand / 2],
    ];

    corners.forEach(([cxPos, cyPos], cIdx) => {
      const angle = starRot + (cIdx * Math.PI) / 2;
      const spX = cxPos + Math.cos(angle) * 3;
      const spY = cyPos + Math.sin(angle) * 3;
      spinGlow.star(spX, spY, 4, cornerRadius, cornerRadius * 0.45);
      spinGlow.fill({ color: 0xffffff, alpha: 0.9 * pulse });
    });
  };

  root.label = id;
  return root;
}

