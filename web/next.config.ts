import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

const origensDevPermitidas =
	process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",")
		.map((origem) => origem.trim())
		.filter(Boolean) ?? [
		"http://localhost:3000",
		"http://127.0.0.1:3000",
	];

const nextConfig: NextConfig = {
	distDir: process.env.NEXT_DIST_DIR || ".next",
	turbopack: {
		root,
	},
	allowedDevOrigins: origensDevPermitidas,
	reactCompiler: true,
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
