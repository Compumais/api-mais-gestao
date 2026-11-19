"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Button } from "@/components/ui/button";
import { useEmpresa } from "@/hooks/use-empresa";
import { googleMapsDisponivel } from "@/lib/google-maps";
import { locacaoService } from "@/services/locacao.service";
import { MapaGoogle } from "../components/mapa-google";

function MapaLocacoesConteudo() {
	const { empresa } = useEmpresa();
	const focar = useSearchParams().get("focar");
	const [selecionado, setSelecionado] = useState<string | null>(focar);
	const { data, isLoading } = useQuery({
		queryKey: ["locacoes-mapa", empresa?.id],
		enabled: Boolean(empresa?.id),
		queryFn: () => locacaoService.listarMapa(empresa!.id),
	});

	const comPonto = data?.comPonto ?? [];
	const semPonto = data?.semPonto ?? [];
	const marcadores = comPonto.map((locacao) => ({
		id: locacao.id,
		latitude: Number(locacao.latitude),
		longitude: Number(locacao.longitude),
		titulo: `Locação ${locacao.codigo} · ${locacao.nomecliente}`,
		detalhe: [
			locacao.equipamentos
				.map((item) => `${item.codigo} - ${item.descricao}`)
				.join("\n"),
			[locacao.endereco, locacao.numeroendereco, locacao.bairro]
				.filter(Boolean)
				.join(", "),
		]
			.filter(Boolean)
			.join("\n"),
	}));

	return (
		<PageContainer>
			<div className="flex items-center justify-between p-4 gap-4 flex-wrap">
				<div>
					<h1 className="text-2xl font-bold">Equipamentos locados</h1>
					<p className="text-sm text-muted-foreground">
						Locações abertas com ponto marcado no mapa.
					</p>
				</div>
				<Button asChild variant="outline">
					<Link href="/locacoes">Lista</Link>
				</Button>
			</div>
			<div className="grid gap-4 px-4 pb-4 lg:grid-cols-[320px_1fr]">
				<div className="rounded-lg border bg-card max-h-[calc(100vh-220px)] overflow-auto">
					{isLoading && <p className="p-4 text-sm">Carregando...</p>}
					{!isLoading && comPonto.length === 0 && semPonto.length === 0 && (
						<p className="p-4 text-sm text-muted-foreground">
							Nenhum equipamento locado.
						</p>
					)}
					{comPonto.flatMap((locacao) =>
						locacao.equipamentos.map((equipamento) => (
							<button
								key={`${locacao.id}-${equipamento.codigo}`}
								type="button"
								className="block w-full border-b px-4 py-3 text-left hover:bg-muted"
								onClick={() => setSelecionado(locacao.id)}
							>
								<p className="font-medium">
									{equipamento.codigo} - {equipamento.descricao}
								</p>
								<p className="text-sm text-muted-foreground">
									Locação {locacao.codigo} · {locacao.nomecliente}
								</p>
							</button>
						)),
					)}
					{semPonto.length > 0 && (
						<div className="p-4 text-sm text-muted-foreground">
							<p className="mb-2 font-medium text-foreground">Sem ponto no mapa</p>
							{semPonto.map((locacao) => (
								<p key={locacao.id}>
									<Link className="underline" href={`/locacoes/${locacao.id}/editar`}>
										Locação {locacao.codigo}
									</Link>
									{" · "}
									{locacao.equipamentos
										.map((item) => item.descricao)
										.join(", ")}
								</p>
							))}
						</div>
					)}
				</div>
				{googleMapsDisponivel() ? (
					<MapaGoogle
						className="h-[calc(100vh-220px)] min-h-[420px]"
						marcadores={marcadores}
						ajustarEnquadramento
						focarId={selecionado}
					/>
				) : (
					<p className="text-sm text-muted-foreground">
						Configure a chave do Google Maps para exibir o mapa.
					</p>
				)}
			</div>
		</PageContainer>
	);
}

export default function MapaLocacoesPage() {
	return (
		<Suspense fallback={<PageContainer><p className="p-4">Carregando...</p></PageContainer>}>
			<MapaLocacoesConteudo />
		</Suspense>
	);
}
