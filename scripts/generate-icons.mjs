import fs from "fs";
import { PNG } from "pngjs";

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function drawIcon(size) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (size * y + x) << 2;
      const t = (x + y) / (size * 2);
      png.data[idx] = lerp(219, 232, t);
      png.data[idx + 1] = lerp(39, 121, t);
      png.data[idx + 2] = lerp(119, 249, t);
      png.data[idx + 3] = 255;
    }
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.28;
  const stroke = size * 0.08;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inRing = dist > radius - stroke && dist < radius + stroke;
      const openRight = x > cx && y > cy - stroke * 1.5 && y < cy + stroke * 1.5;
      const bar = x > cx && x < cx + radius && y > cy && y < cy + stroke;
      if ((inRing && !openRight) || bar) {
        const idx = (size * y + x) << 2;
        png.data[idx] = 255;
        png.data[idx + 1] = 255;
        png.data[idx + 2] = 255;
      }
    }
  }

  fs.writeFileSync(`public/icon-${size}.png`, PNG.sync.write(png));
}

drawIcon(192);
drawIcon(512);
