import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(root, "..", "public", "icons");

const PRIMARY = "#4338CA";
const FOREGROUND = "#F8FAFC";

function buildIconSvg(size, maskable = false) {
	const padding = maskable ? Math.round(size * 0.2) : Math.round(size * 0.12);
	const inner = size - padding * 2;
	const radius = maskable ? Math.round(size * 0.2) : Math.round(size * 0.18);
	const stroke = Math.max(4, Math.round(inner * 0.09));
	const plusStroke = Math.max(3, Math.round(inner * 0.075));
	const scale = inner / 64;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${PRIMARY}"/>
  <g transform="translate(${padding} ${padding}) scale(${scale})" fill="none" stroke="${FOREGROUND}" stroke-linecap="round">
    <path d="M40 14 C30 14 22 22 22 32 C22 42 30 50 40 50" stroke-width="${stroke}"/>
    <line x1="44" y1="26" x2="44" y2="38" stroke-width="${plusStroke}"/>
    <line x1="38" y1="32" x2="50" y2="32" stroke-width="${plusStroke}"/>
  </g>
</svg>`;
}

async function writePng(filename, size, maskable = false) {
	const svg = buildIconSvg(size, maskable);
	await writeFile(
		path.join(iconsDir, filename),
		await sharp(Buffer.from(svg)).png().toBuffer(),
	);
}

await mkdir(iconsDir, { recursive: true });
await Promise.all([
	writePng("icon-192x192.png", 192),
	writePng("icon-512x512.png", 512),
	writePng("apple-touch-icon.png", 180),
	writePng("icon-maskable-512x512.png", 512, true),
]);

console.log("Ícones PWA gerados em public/icons/");
