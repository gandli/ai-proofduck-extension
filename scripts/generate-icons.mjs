import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Resvg } from '@resvg/resvg-js';

const rootDir = process.cwd();
const iconDir = path.join(rootDir, 'public', 'icons');
const svgPath = path.join(iconDir, 'icon.svg');
const sizes = [16, 32, 48, 128];

function normalizeSvg(svg) {
  return svg
    .replace(/<svg\b([^>]*?)\swidth="[^"]*"/, '<svg$1')
    .replace(/<svg\b([^>]*?)\sheight="[^"]*"/, '<svg$1')
    .replace(/<svg\b([^>]*?)\spreserveAspectRatio="[^"]*"/, '<svg$1')
    .replace(
      /<svg\b/,
      '<svg width="512" height="512" preserveAspectRatio="xMidYMid meet"',
    );
}

async function main() {
  await mkdir(iconDir, { recursive: true });
  const rawSvg = await readFile(svgPath, 'utf8');
  const svg = normalizeSvg(rawSvg);

  for (const size of sizes) {
    const resvg = new Resvg(svg, {
      fitTo: {
        mode: 'width',
        value: size,
      },
      background: 'rgba(0,0,0,0)',
    });

    const pngData = resvg.render().asPng();
    await writeFile(path.join(iconDir, `icon-${size}.png`), pngData);
  }

  console.log(`Generated icons: ${sizes.join(', ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
