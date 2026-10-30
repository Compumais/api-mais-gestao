"use client";

import { useQuery } from "@tanstack/react-query";
import { ImageIcon } from "lucide-react";
import { useEffect, useMemo } from "react";
import { bancoImagemService } from "@/services/banco-imagem.service";

export function BancoImagemPreview({
	id,
	referencia,
	alt,
	grupo = false,
	className = "h-16 w-16",
}: {
	id: string;
	referencia?: string | null;
	alt: string;
	grupo?: boolean;
	className?: string;
}) {
	const token = bancoImagemService.versao(referencia);
	const { data } = useQuery({
		queryKey: ["banco-imagem-blob", grupo ? "grupo" : "produto", id, token],
		queryFn: () =>
			grupo
				? bancoImagemService.baixarImagemGrupo(id, token)
				: bancoImagemService.baixarImagem(id, token),
		enabled: Boolean(token),
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
	});
	const url = useMemo(() => (data ? URL.createObjectURL(data) : null), [data]);
	useEffect(
		() => () => {
			if (url) URL.revokeObjectURL(url);
		},
		[url],
	);

	return (
		<div
			className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted ${className}`}
		>
			{url ? (
				<img src={url} alt={alt} className="h-full w-full object-cover" />
			) : (
				<ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
			)}
		</div>
	);
}
