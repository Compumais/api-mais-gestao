"use client";

import { useQuery } from "@tanstack/react-query";
import { ImageIcon, ImageOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { produtosService } from "@/services/produtos.service";

type ProdutoImagemMiniaturaProps = {
	produtoId: string;
	nomeProduto: string;
	referencia?: string | null;
	imagemLegada?: string | null;
};

function obterVersao(referencia?: string | null): string | null {
	if (!referencia) return null;
	try {
		return new URL(referencia, "http://local").searchParams.get("v");
	} catch {
		return null;
	}
}

function normalizarImagemLegada(
	imagem?: string | null,
	referencia?: string | null,
): string | null {
	for (const valor of [imagem, referencia]) {
		const texto = valor?.trim();
		if (!texto) continue;
		if (
			texto.startsWith("data:image/") ||
			texto.startsWith("https://") ||
			texto.startsWith("http://")
		) {
			return texto;
		}
		if (texto.length > 100 && /^[A-Za-z0-9+/=\s]+$/.test(texto)) {
			return `data:image/jpeg;base64,${texto.replace(/\s/g, "")}`;
		}
	}
	return null;
}

function ehImagemGerenciada(referencia?: string | null): boolean {
	if (!referencia) return false;
	try {
		const url = new URL(referencia, "http://local");
		return /^\/produtos\/[^/]+\/imagem$/.test(url.pathname);
	} catch {
		return false;
	}
}

export function ProdutoImagemMiniatura({
	produtoId,
	nomeProduto,
	referencia,
	imagemLegada,
}: ProdutoImagemMiniaturaProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [estaVisivel, setEstaVisivel] = useState(false);
	const [origemComFalha, setOrigemComFalha] = useState<string | null>(null);
	const gerenciada = ehImagemGerenciada(referencia);
	const versao = obterVersao(referencia);
	const imagemLegadaNormalizada = normalizarImagemLegada(
		imagemLegada,
		referencia,
	);

	useEffect(() => {
		const elemento = containerRef.current;
		if (!elemento || estaVisivel) return;
		if (!("IntersectionObserver" in window)) {
			setEstaVisivel(true);
			return;
		}

		const observer = new IntersectionObserver(
			([entrada]) => {
				if (entrada?.isIntersecting) {
					setEstaVisivel(true);
					observer.disconnect();
				}
			},
			{ rootMargin: "160px" },
		);
		observer.observe(elemento);
		return () => observer.disconnect();
	}, [estaVisivel]);

	const { data: imagemAtual, isError } = useQuery({
		queryKey: ["produto-imagem", produtoId, versao],
		queryFn: () => produtosService.baixarImagem(produtoId, versao),
		enabled: gerenciada && estaVisivel,
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: 30 * 60 * 1000,
		retry: false,
	});

	const urlImagemAtual = useMemo(
		() => (imagemAtual ? URL.createObjectURL(imagemAtual) : null),
		[imagemAtual],
	);

	useEffect(
		() => () => {
			if (urlImagemAtual) URL.revokeObjectURL(urlImagemAtual);
		},
		[urlImagemAtual],
	);

	const origem = gerenciada ? urlImagemAtual : imagemLegadaNormalizada;
	const possuiReferencia = gerenciada || Boolean(imagemLegadaNormalizada);
	const exibirErro = isError || (origem !== null && origemComFalha === origem);

	return (
		<div
			ref={containerRef}
			className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted"
		>
			{origem && !exibirErro ? (
				<img
					src={origem}
					alt={`Imagem de ${nomeProduto}`}
					className="h-full w-full object-cover"
					loading="lazy"
					decoding="async"
					onError={() => setOrigemComFalha(origem)}
				/>
			) : exibirErro ? (
				<ImageOff
					className="h-5 w-5 text-muted-foreground"
					aria-label={`Não foi possível carregar a imagem de ${nomeProduto}`}
				/>
			) : possuiReferencia ? (
				<div
					className="h-full w-full animate-pulse bg-muted-foreground/15"
					role="img"
					aria-label={`Imagem de ${nomeProduto} aguardando carregamento`}
				/>
			) : (
				<ImageIcon
					className="h-5 w-5 text-muted-foreground"
					aria-label={`Produto ${nomeProduto} sem imagem`}
				/>
			)}
		</div>
	);
}
