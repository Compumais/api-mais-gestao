"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	acessoBaseEstaAtivo,
	limparAcessoBaseAtivo,
} from "@/lib/acesso-base";
import { setSessionToken } from "@/lib/auth-token";
import { limparEmpresaSelecionada } from "@/provider/empresa-provider";
import { acessoBaseService } from "@/services/acesso-base.service";

const CSS_VAR_ALTURA_BANNER = "--banner-acesso-base-height";

export function BannerAcessoBase() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const bannerRef = useRef<HTMLDivElement>(null);
	const [visivel, setVisivel] = useState(false);
	const [saindo, setSaindo] = useState(false);

	useEffect(() => {
		setVisivel(acessoBaseEstaAtivo());
	}, []);

	useEffect(() => {
		const root = document.documentElement;
		if (!visivel) {
			root.style.removeProperty(CSS_VAR_ALTURA_BANNER);
			return;
		}
		const el = bannerRef.current;
		if (!el) return;

		const atualizarAltura = () => {
			root.style.setProperty(CSS_VAR_ALTURA_BANNER, `${el.offsetHeight}px`);
		};

		atualizarAltura();
		const observer = new ResizeObserver(atualizarAltura);
		observer.observe(el);

		return () => {
			observer.disconnect();
			root.style.removeProperty(CSS_VAR_ALTURA_BANNER);
		};
	}, [visivel]);

	if (!visivel) return null;

	async function voltarAoSuper() {
		setSaindo(true);
		try {
			const resposta = await acessoBaseService.encerrar();
			setSessionToken(resposta.token);
			limparAcessoBaseAtivo();
			limparEmpresaSelecionada();
			queryClient.clear();
			router.push("/super/empresas");
		} catch (erro) {
			toast.error("Não foi possível voltar ao super", {
				description: erro instanceof Error ? erro.message : "Erro desconhecido",
			});
			setSaindo(false);
		}
	}

	return (
		<div
			ref={bannerRef}
			className="sticky top-0 z-[45] flex w-full flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950"
		>
			<p>Você está acessando esta base como administrador.</p>
			<Button
				type="button"
				size="sm"
				variant="outline"
				disabled={saindo}
				onClick={() => void voltarAoSuper()}
			>
				{saindo ? "Voltando..." : "Voltar ao super"}
			</Button>
		</div>
	);
}
