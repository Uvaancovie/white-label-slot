import { Container, Graphics, Text } from "pixi.js";
import type { SymbolId } from "@sa-slot/shared";

export const SYMBOL_COLORS: Record<
  SymbolId,
  { bg: number; bg2: number; border: number; fg: number; label: string }
> = {
  wild: { bg: 0x0d0103, bg2: 0x2d0208, border: 0xff2a3b, fg: 0xffffff, label: "WILD" },
  scatter: { bg: 0x0f0103, bg2: 0x330209, border: 0xff2a3b, fg: 0xff3344, label: "DIAMOND" },
  springbok: { bg: 0x080102, bg2: 0x240206, border: 0xff4d5e, fg: 0xffffff, label: "SPRINGBOK" },
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
  const cy = height * 0.42;

  // Render high-definition vector icons
  if (id === "springbok") {
    // Springbok Head & Golden Horns
    g.circle(cx, cy, Math.min(w, h) * 0.28);
    g.fill({ color: 0x004d33, alpha: 0.6 });
    g.stroke({ width: 1.5, color: 0x00ffaa, alpha: 0.8 });

    g.moveTo(cx - 16, cy + 10);
    g.quadraticCurveTo(cx - 22, cy - 16, cx - 14, cy - 22);
    g.quadraticCurveTo(cx - 8, cy - 14, cx, cy - 2);
    g.quadraticCurveTo(cx + 8, cy - 14, cx + 14, cy - 22);
    g.quadraticCurveTo(cx + 22, cy - 16, cx + 16, cy + 10);
    g.lineTo(cx + 10, cy + 16);
    g.lineTo(cx, cy + 12);
    g.lineTo(cx - 10, cy + 16);
    g.closePath();
    g.fill({ color: 0xffd700, alpha: 0.98 });
    g.stroke({ width: 2, color: 0xffffff, alpha: 0.9 });

    // Horn ribbed ridges
    g.moveTo(cx - 11, cy - 2);
    g.quadraticCurveTo(cx - 17, cy - 10, cx - 14, cy - 20);
    g.stroke({ width: 2, color: 0xcc8800 });
    g.moveTo(cx + 11, cy - 2);
    g.quadraticCurveTo(cx + 17, cy - 10, cx + 14, cy - 20);
    g.stroke({ width: 2, color: 0xcc8800 });
  } else if (id === "wild") {
    // Glowing 8-Point Golden Star Medallion
    const outerR = Math.min(w, h) * 0.32;
    const innerR = Math.min(w, h) * 0.16;

    // Ambient glow ring
    g.circle(cx, cy, outerR + 4);
    g.fill({ color: 0xffaa00, alpha: 0.35 });

    g.star(cx, cy, 8, outerR, innerR);
    g.fill({ color: 0xffd700, alpha: 0.98 });
    g.stroke({ width: 2, color: 0xffffff });

    g.circle(cx, cy, innerR * 1.1);
    g.fill({ color: 0xff6600, alpha: 0.95 });
    g.stroke({ width: 1.5, color: 0xffe680 });
  } else if (id === "scatter") {
    // Glowing Ruby Diamond Orb
    const rR = Math.min(w, h) * 0.26;

    g.circle(cx, cy, rR + 5);
    g.fill({ color: 0xff0044, alpha: 0.4 });

    g.circle(cx, cy, rR);
    g.fill({ color: 0xde1131, alpha: 0.98 });
    g.stroke({ width: 2.5, color: 0xffd700 });

    // Specular shine on gem
    g.ellipse(cx - rR * 0.35, cy - rR * 0.35, rR * 0.4, rR * 0.22);
    g.fill({ color: 0xffffff, alpha: 0.8 });
  } else if (id === "protea") {
    // Blooming Protea Petals
    const pR = Math.min(w, h) * 0.24;
    g.circle(cx, cy, pR + 2);
    g.fill({ color: 0xff0088, alpha: 0.3 });

    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      const px = cx + Math.cos(angle) * 11;
      const py = cy + Math.sin(angle) * 11;
      g.ellipse(px, py, 8, 14);
      g.fill({ color: 0xff44aa, alpha: 0.85 });
      g.stroke({ width: 1, color: 0xffccf0 });
    }
    g.circle(cx, cy, 9);
    g.fill({ color: 0xffe066, alpha: 0.98 });
  } else if (id === "gold") {
    // Stacked Gold Bullion Bars
    g.roundRect(cx - 16, cy - 10, 32, 16, 4);
    g.fill({ color: 0xffca28, alpha: 0.98 });
    g.stroke({ width: 1.5, color: 0xffffff, alpha: 0.8 });

    g.roundRect(cx - 20, cy + 2, 32, 16, 4);
    g.fill({ color: 0xffa000, alpha: 0.98 });
    g.stroke({ width: 1.5, color: 0xffe082 });
  } else if (id === "drum") {
    // Zulu Ceremonial Drum
    g.ellipse(cx, cy - 8, 18, 8);
    g.fill({ color: 0xffd180, alpha: 0.98 });
    g.stroke({ width: 1.5, color: 0x5d4037 });

    g.moveTo(cx - 18, cy - 8);
    g.lineTo(cx - 11, cy + 15);
    g.lineTo(cx + 11, cy + 15);
    g.lineTo(cx + 18, cy - 8);
    g.closePath();
    g.fill({ color: 0x795548, alpha: 0.98 });

    g.moveTo(cx - 16, cy - 7);
    g.lineTo(cx, cy + 13);
    g.lineTo(cx + 16, cy - 7);
    g.stroke({ width: 1.5, color: 0xffecb3 });
  }

  root.addChild(g);

  // Label formatting
  const isRoyals = ["A", "K", "Q", "J", "10"].includes(id);
  const fontSize = isRoyals ? Math.floor(height * 0.48) : (id === "scatter" || id === "springbok" ? Math.floor(height * 0.18) : Math.floor(height * 0.22));

  const fgHex = `#${meta.fg.toString(16).padStart(6, "0")}`;
  const label = new Text({
    text: meta.label,
    style: {
      fontFamily: "Rajdhani, Inter, Arial, sans-serif",
      fontSize,
      fontWeight: "700",
      fill: fgHex,
      stroke: { color: 0x000000, width: isRoyals ? 5 : 3.5 },
      dropShadow: {
        alpha: 0.85,
        blur: 4,
        color: 0x000000,
        distance: 2,
      },
      align: "center",
    },
  });
  label.anchor.set(0.5);
  label.x = width / 2;
  label.y = isRoyals ? height * 0.5 : height * 0.81;
  root.addChild(label);

  root.label = id;
  return root;
}

