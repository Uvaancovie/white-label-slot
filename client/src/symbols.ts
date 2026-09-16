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

export function createSymbolSprite(
  id: SymbolId,
  width: number,
  height: number,
): Container {
  const root = new Container();
  const meta = SYMBOL_COLORS[id] || SYMBOL_COLORS["10"];
  const g = new Graphics();

  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const x = pad;
  const y = pad;
  const r = 10;

  // Drop shadow
  g.roundRect(x + 1, y + 3, w, h, r);
  g.fill({ color: 0x000000, alpha: 0.65 });

  // Outer frame metallic gradient emulation
  g.roundRect(x, y, w, h, r);
  g.fill({ color: meta.border, alpha: 0.95 });

  // Inner card background
  g.roundRect(x + 2, y + 2, w - 4, h - 4, r - 2);
  g.fill({ color: meta.bg, alpha: 0.98 });

  // Top gloss gradient reflection
  g.roundRect(x + 3, y + 3, w - 6, (h - 6) * 0.45, r - 3);
  g.fill({ color: meta.bg2, alpha: 0.75 });

  // Curved glass specular arc
  g.ellipse(x + w / 2, y + 2, w * 0.42, h * 0.22);
  g.fill({ color: 0xffffff, alpha: 0.15 });

  // Bevel border highlight
  g.roundRect(x + 2, y + 2, w - 4, h - 4, r - 2);
  g.stroke({ width: 1.5, color: 0xffffff, alpha: 0.25 });

  const cx = width / 2;
  const cy = height * 0.44;

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
    g.circle(cx, cy, Math.min(w, h) * 0.36);
    g.fill({ color: 0xff1744, alpha: 0.45 });
    root.addChild(g);
    root.addChild(spr);
    hasImageSprite = true;
  } else if (id === "cheetah" && loadedTextures.cheetah) {
    const spr = new Sprite(loadedTextures.cheetah);
    spr.anchor.set(0.5);
    spr.x = cx;
    spr.y = cy;
    // Maximize scale for crystal clear, prominent visibility
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
    g.circle(cx, cy, Math.min(w, h) * 0.36);
    g.fill({ color: 0xff8c00, alpha: 0.4 });
    root.addChild(g);
    root.addChild(spr);
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
    g.circle(cx, cy, Math.min(w, h) * 0.35);
    g.fill({ color: 0x00d2ff, alpha: 0.38 });
    root.addChild(g);
    root.addChild(spr);
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
    g.circle(cx, cy, Math.min(w, h) * 0.35);
    g.fill({ color: 0x00e676, alpha: 0.38 });
    root.addChild(g);
    root.addChild(spr);
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
    g.circle(cx, cy, Math.min(w, h) * 0.35);
    g.fill({ color: 0xffd700, alpha: 0.42 });
    root.addChild(g);
    root.addChild(spr);
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
    g.circle(cx, cy, Math.min(w, h) * 0.35);
    g.fill({ color: 0xff4081, alpha: 0.4 });
    root.addChild(g);
    root.addChild(spr);
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
    g.circle(cx, cy, Math.min(w, h) * 0.35);
    g.fill({ color: 0xff6d00, alpha: 0.4 });
    root.addChild(g);
    root.addChild(spr);
    hasImageSprite = true;
  }

  if (!hasImageSprite) {
    // Render high-definition vector icons
    if (id === "cheetah") {
      // Cheetah vector face & golden rosettes
      g.circle(cx, cy, Math.min(w, h) * 0.34);
      g.fill({ color: 0x4a2105, alpha: 0.75 });
      g.stroke({ width: 2.5, color: 0xffaa00, alpha: 0.95 });

      // Cheetah muzzle & ears
      g.moveTo(cx - 18, cy - 10);
      g.lineTo(cx - 22, cy - 24);
      g.lineTo(cx - 10, cy - 16);
      g.closePath();
      g.fill({ color: 0xff9900, alpha: 0.98 });
      g.stroke({ width: 2, color: 0xffe680 });

      g.moveTo(cx + 18, cy - 10);
      g.lineTo(cx + 22, cy - 24);
      g.lineTo(cx + 10, cy - 16);
      g.closePath();
      g.fill({ color: 0xff9900, alpha: 0.98 });
      g.stroke({ width: 2, color: 0xffe680 });

      // Snout
      g.ellipse(cx, cy + 5, 14, 10);
      g.fill({ color: 0xffe0b2, alpha: 0.98 });

      // Nose & eyes
      g.moveTo(cx - 5, cy + 3);
      g.lineTo(cx + 5, cy + 3);
      g.lineTo(cx, cy + 8);
      g.closePath();
      g.fill({ color: 0x212121, alpha: 1 });

      // Distinctive cheetah tear lines
      g.moveTo(cx - 10, cy - 4);
      g.lineTo(cx - 7, cy + 6);
      g.stroke({ width: 2.5, color: 0x000000 });
      g.moveTo(cx + 10, cy - 4);
      g.lineTo(cx + 7, cy + 6);
      g.stroke({ width: 2.5, color: 0x000000 });

      // Eyes
      g.circle(cx - 10, cy - 5, 4);
      g.fill(0xffd700);
      g.circle(cx + 10, cy - 5, 4);
      g.fill(0xffd700);
    } else if (id === "springbok") {
      // Springbok Head & Golden Horns
      g.circle(cx, cy, Math.min(w, h) * 0.34);
      g.fill({ color: 0x004d33, alpha: 0.65 });
      g.stroke({ width: 2, color: 0x00ffaa, alpha: 0.85 });

      g.moveTo(cx - 20, cy + 12);
      g.quadraticCurveTo(cx - 26, cy - 20, cx - 17, cy - 28);
      g.quadraticCurveTo(cx - 10, cy - 17, cx, cy - 3);
      g.quadraticCurveTo(cx + 10, cy - 17, cx + 17, cy - 28);
      g.quadraticCurveTo(cx + 26, cy - 20, cx + 20, cy + 12);
      g.lineTo(cx + 12, cy + 19);
      g.lineTo(cx, cy + 14);
      g.lineTo(cx - 12, cy + 19);
      g.closePath();
      g.fill({ color: 0xffd700, alpha: 0.98 });
      g.stroke({ width: 2.5, color: 0xffffff, alpha: 0.9 });

      // Horn ribbed ridges
      g.moveTo(cx - 14, cy - 3);
      g.quadraticCurveTo(cx - 21, cy - 12, cx - 17, cy - 25);
      g.stroke({ width: 2.5, color: 0xcc8800 });
      g.moveTo(cx + 14, cy - 3);
      g.quadraticCurveTo(cx + 21, cy - 12, cx + 17, cy - 25);
      g.stroke({ width: 2.5, color: 0xcc8800 });
    } else if (id === "wild") {
      // Glowing 8-Point Golden Star Medallion
      const outerR = Math.min(w, h) * 0.38;
      const innerR = Math.min(w, h) * 0.19;

      // Ambient glow ring
      g.circle(cx, cy, outerR + 6);
      g.fill({ color: 0xffaa00, alpha: 0.4 });

      g.star(cx, cy, 8, outerR, innerR);
      g.fill({ color: 0xffd700, alpha: 0.98 });
      g.stroke({ width: 2.5, color: 0xffffff });

      g.circle(cx, cy, innerR * 1.15);
      g.fill({ color: 0xff6600, alpha: 0.95 });
      g.stroke({ width: 2, color: 0xffe680 });
    } else if (id === "scatter") {
      // Glowing Diamond Gem
      const rR = Math.min(w, h) * 0.35;

      g.circle(cx, cy, rR + 6);
      g.fill({ color: 0x00d2ff, alpha: 0.45 });

      // Diamond polygon
      g.moveTo(cx, cy - rR);
      g.lineTo(cx + rR * 1.15, cy);
      g.lineTo(cx, cy + rR);
      g.lineTo(cx - rR * 1.15, cy);
      g.closePath();
      g.fill({ color: 0x00b4d8, alpha: 0.98 });
      g.stroke({ width: 3, color: 0xffffff });

      // Inner diamond facet lines
      g.moveTo(cx, cy - rR);
      g.lineTo(cx, cy + rR);
      g.stroke({ width: 2, color: 0xe0f7fa, alpha: 0.9 });
      g.moveTo(cx - rR * 1.15, cy);
      g.lineTo(cx + rR * 1.15, cy);
      g.stroke({ width: 2, color: 0xe0f7fa, alpha: 0.9 });

      // Specular shine on gem
      g.circle(cx - rR * 0.32, cy - rR * 0.32, rR * 0.28);
      g.fill({ color: 0xffffff, alpha: 0.95 });
    } else if (id === "protea") {
      // Blooming Protea Petals
      const pR = Math.min(w, h) * 0.32;
      g.circle(cx, cy, pR + 4);
      g.fill({ color: 0xff0088, alpha: 0.35 });

      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const px = cx + Math.cos(angle) * 14;
        const py = cy + Math.sin(angle) * 14;
        g.ellipse(px, py, 10, 18);
        g.fill({ color: 0xff44aa, alpha: 0.9 });
        g.stroke({ width: 1.5, color: 0xffccf0 });
      }
      g.circle(cx, cy, 12);
      g.fill({ color: 0xffe066, alpha: 0.98 });
    } else if (id === "gold") {
      // Stacked Gold Bullion Bars
      g.roundRect(cx - 22, cy - 14, 44, 22, 5);
      g.fill({ color: 0xffca28, alpha: 0.98 });
      g.stroke({ width: 2, color: 0xffffff, alpha: 0.85 });

      g.roundRect(cx - 26, cy + 2, 44, 22, 5);
      g.fill({ color: 0xffa000, alpha: 0.98 });
      g.stroke({ width: 2, color: 0xffe082 });
    } else if (id === "drum") {
      // Zulu Ceremonial Drum
      g.ellipse(cx, cy - 12, 24, 11);
      g.fill({ color: 0xffd180, alpha: 0.98 });
      g.stroke({ width: 2, color: 0x5d4037 });

      g.moveTo(cx - 24, cy - 12);
      g.lineTo(cx - 15, cy + 20);
      g.lineTo(cx + 15, cy + 20);
      g.lineTo(cx + 24, cy - 12);
      g.closePath();
      g.fill({ color: 0x795548, alpha: 0.98 });

      g.moveTo(cx - 22, cy - 10);
      g.lineTo(cx, cy + 18);
      g.lineTo(cx + 22, cy - 10);
      g.stroke({ width: 2, color: 0xffecb3 });
    }

    root.addChild(g);
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
  root.addChild(label);

  root.label = id;
  return root;
}

