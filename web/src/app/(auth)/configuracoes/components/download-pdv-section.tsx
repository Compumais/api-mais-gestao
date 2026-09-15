"use client";

import { useQuery } from "@tanstack/react-query";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { formatDateTimeBrasilia } from "@/lib/date";
import {
	pdvUpdatesService,
	urlDownloadPdv,
} from "@/services/pdv-updates.service";

export function DownloadPdvSection() {
	const { data, isLoading, isError, error } = useQuery({
		queryKey: ["pdv-updates", "manifesto"],
		queryFn: () => pdvUpdatesService.obterManifesto(),
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>PDV desktop</CardTitle>
				<CardDescription>
					Baixe o instalador do PDV para Windows. Após instalar, o aplicativo
					atualiza sozinho quando houver versão nova.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="text-sm text-muted-foreground">
					{isLoading && <p>Consultando a versão publicada…</p>}
					{isError && (
						<p>
							{error instanceof Error
								? error.message
								: "Instalador do PDV ainda não publicado."}
						</p>
					)}
					{data && (
						<>
							<p>
								Versão{" "}
								<span className="font-medium text-foreground">
									{data.version}
								</span>
							</p>
							{data.releasedAt && (
								<p>Publicada em {formatDateTimeBrasilia(data.releasedAt)}</p>
							)}
						</>
					)}
				</div>
				{data ? (
					<Button asChild>
						<a href={urlDownloadPdv(data)} download={data.artifact}>
							<DownloadIcon className="h-4 w-4" />
							Baixar PDV
						</a>
					</Button>
				) : (
					<Button type="button" disabled>
						<DownloadIcon className="h-4 w-4" />
						Baixar PDV
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
