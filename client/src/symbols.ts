import { Container, Graphics, Text } from "pixi.js";
import type { SymbolId } from "@sa-slot/shared";

export const SYMBOL_COLORS: Record<
  SymbolId,
  { bg: number; fg: number; label: string }
> = {
  wild: { bg: 0xffb612, fg: 0x1a1200, label: "WILD" },
  scatter: { bg: 0xde3831, fg: 0xffffff, label: "SCAT" },
  springbok: { bg: 0x007a4d, fg: 0xfff6d0, label: "BOK" },
  protea: { bg: 0x8b1e5a, fg: 0xffd6ec, label: "PRO" },
  gold: { bg: 0xc9a227, fg: 0x2a1d00, label: "GOLD" },
  drum: { bg: 0x8b4513, fg: 0xffe7c2, label: "DRM" },
  A: { bg: 0x1e3a5f, fg: 0xffffff, label: "A" },
  K: { bg: 0x2c3e50, fg: 0xffffff, label: "K" },
  Q: { bg: 0x34495e, fg: 0xffffff, label: "Q" },
  J: { bg: 0x3d566e, fg: 0xffffff, label: "J" },
  "10": { bg: 0x465c70, fg: 0xffffff, label: "10" },
};

export function createSymbolSprite(
  id: SymbolId,
  width: number,
  height: number,
): Container {
  const root = new Container();
  const meta = SYMBOL_COLORS[id];
  const g = new Graphics();

  const w = width - 8;
  const h = height - 8;
  const x = 4;
  const y = 4;
  const r = 12;

  g.roundRect(x, y, w, h, r);
  g.fill({ color: meta.bg, alpha: 0.95 });
  g.stroke({ width: 2, color: 0xffffff, alpha: 0.18 });

  // Decorative motif
  if (id === "springbok") {
    g.moveTo(width * 0.5, height * 0.28);
    g.lineTo(width * 0.68, height * 0.55);
    g.lineTo(width * 0.5, height * 0.48);
    g.lineTo(width * 0.32, height * 0.55);
    g.closePath();
    g.fill({ color: 0xffb612, alpha: 0.9 });
  } else if (id === "wild") {
    g.star(width / 2, height / 2, 5, Math.min(w, h) * 0.22, Math.min(w, h) * 0.1);
    g.fill({ color: 0xffffff, alpha: 0.35 });
  } else if (id === "scatter") {
    g.circle(width / 2, height / 2, Math.min(w, h) * 0.18);
    g.fill({ color: 0xffb612, alpha: 0.85 });
  } else if (id === "protea") {
    g.circle(width / 2, height * 0.42, Math.min(w, h) * 0.12);
    g.fill({ color: 0xff8dc7, alpha: 0.9 });
  } else if (id === "gold") {
    g.roundRect(width * 0.32, height * 0.3, width * 0.36, height * 0.28, 4);
    g.fill({ color: 0xfff1a8, alpha: 0.9 });
  } else if (id === "drum") {
    g.ellipse(width / 2, height * 0.45, width * 0.22, height * 0.14);
    g.fill({ color: 0xffd9a0, alpha: 0.85 });
  }

  root.addChild(g);

  const label = new Text({
    text: meta.label,
    style: {
      fontFamily: "Rajdhani, Arial, sans-serif",
      fontSize: id.length <= 2 ? 34 : 20,
      fontWeight: "700",
      fill: meta.fg,
      align: "center",
    },
  });
  label.anchor.set(0.5);
  label.x = width / 2;
  label.y = height * (id.length <= 2 ? 0.52 : 0.72);
  root.addChild(label);

  root.label = id;
  return root;
}
