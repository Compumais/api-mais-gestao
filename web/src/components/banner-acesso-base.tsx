"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	acessoBaseEstaAtivo,
	limparAcessoBaseAtivo,
} from "@/lib/acesso-base";
import { setSessionToken } from "@/lib/auth-token";
import { limparEmpresaSelecionada } from "@/provider/empresa-provider";
import { acessoBaseService } from "@/services/acesso-base.service";

export function BannerAcessoBase() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [visivel, setVisivel] = useState(false);
	const [saindo, setSaindo] = useState(false);

	useEffect(() => {
		setVisivel(acessoBaseEstaAtivo());
	}, []);

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
		<div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-950">
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
