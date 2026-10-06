"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const VERSAO_CARREGADA = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
const CHAVE_TENTATIVA = "versao-web:reload";

export function AtualizarVersao() {
	const pathname = usePathname();

	useEffect(() => {
		if (VERSAO_CARREGADA === "dev") return;

		let cancelado = false;

		async function checar() {
			try {
				const resposta = await fetch(
					`/versao?rota=${encodeURIComponent(pathname)}`,
					{ cache: "no-store" },
				);
				if (!resposta.ok) return;
				const atual = (await resposta.text()).trim();
				if (
					cancelado ||
					!atual ||
					atual === "dev" ||
					atual === VERSAO_CARREGADA
				) {
					return;
				}

				const tentativa = `${VERSAO_CARREGADA}->${atual}`;
				if (sessionStorage.getItem(CHAVE_TENTATIVA) === tentativa) return;
				sessionStorage.setItem(CHAVE_TENTATIVA, tentativa);
				window.location.reload();
			} catch {
				// Sem rede a tela atual permanece; a próxima navegação tenta de novo.
			}
		}

		void checar();
		const timer = window.setInterval(() => void checar(), 30_000);
		const aoFocar = () => void checar();
		const aoVisivel = () => {
			if (document.visibilityState === "visible") void checar();
		};

		window.addEventListener("focus", aoFocar);
		document.addEventListener("visibilitychange", aoVisivel);

		return () => {
			cancelado = true;
			window.clearInterval(timer);
			window.removeEventListener("focus", aoFocar);
			document.removeEventListener("visibilitychange", aoVisivel);
		};
	}, [pathname]);

	return null;
}
