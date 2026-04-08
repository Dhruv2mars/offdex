import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const assets = join(root, "assets");
const source = join(assets, "offdex-mark.svg");
const white = { r: 255, g: 255, b: 255, alpha: 1 };
const transparent = { r: 255, g: 255, b: 255, alpha: 0 };

async function renderPng(output, size, background) {
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background,
    },
  })
    .composite([
      {
        input: await sharp(source)
          .resize(Math.round(size * 0.84), Math.round(size * 0.84), {
            fit: "contain",
          })
          .png()
          .toBuffer(),
        gravity: "center",
      },
    ])
    .png()
    .toFile(join(assets, output));
}

await Promise.all([
  renderPng("icon.png", 1024, white),
  renderPng("splash-icon.png", 1024, white),
  renderPng("android-icon-background.png", 512, white),
  renderPng("android-icon-foreground.png", 512, transparent),
  renderPng("android-icon-monochrome.png", 432, transparent),
  renderPng("favicon.png", 48, white),
]);
