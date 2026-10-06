import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const root = path.dirname(fileURLToPath(import.meta.url));

const origensDevPermitidas = process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
	.map((origem) => origem.trim())
	.filter(Boolean) ?? ["http://localhost:3000", "http://127.0.0.1:3000"];

/** Id do build, gravado no cliente e em .next/BUILD_ID. */
const versaoWeb = process.env.WEB_BUILD_ID || "dev";

const nextConfig: NextConfig = {
	distDir: process.env.NEXT_DIST_DIR || ".next",
	env: {
		NEXT_PUBLIC_BUILD_ID: versaoWeb,
	},
	generateBuildId: async () => versaoWeb,
	experimental: {
		staleTimes: {
			dynamic: 0,
			static: 30,
		},
	},
	turbopack: {
		root,
	},
	allowedDevOrigins: origensDevPermitidas,
	async headers() {
		return [
			{
				source: "/serwist/sw.js",
				headers: [
					{
						key: "Cache-Control",
						value: "no-cache, no-store, must-revalidate",
					},
					{
						key: "Service-Worker-Allowed",
						value: "/",
					},
				],
			},
		];
	},
	async redirects() {
		return [
			{
				source: "/agendamento",
				destination: "/agendamentos",
				permanent: false,
			},
			{
				source: "/gourmet/venda-rapida",
				destination: "/pdv",
				permanent: true,
			},
			{
				source: "/nota-fiscal-compra/relatorio",
				destination: "/relatorios/fiscais/compras",
				permanent: true,
			},
			{
				source: "/nota-fiscal-venda/relatorio",
				destination: "/relatorios/fiscais/vendas",
				permanent: true,
			},
			{
				source: "/contabilidade/relatorios",
				destination: "/relatorios/fiscais",
				permanent: true,
			},
			{
				source: "/contabilidade/relatorios/compras",
				destination: "/relatorios/fiscais/compras",
				permanent: true,
			},
			{
				source: "/contabilidade/relatorios/vendas",
				destination: "/relatorios/fiscais/vendas",
				permanent: true,
			},
		];
	},
};

export default nextConfig;
