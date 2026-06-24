"use client";

import { useQuery } from "@tanstack/react-query";
import { informativosService } from "@/services/admin.service";

export function InformativosBanner() {
	const { data } = useQuery({
		queryKey: ["informativos-publicos"],
		queryFn: () => informativosService.listarPublicos(),
		staleTime: 60_000,
	});

	const ultimo = data?.informativos?.[0];
	if (!ultimo) return null;

	return (
		<div className="border-b bg-primary/10 px-4 py-2 text-sm">
			<strong>{ultimo.titulo}:</strong> {ultimo.conteudo}
		</div>
	);
}
