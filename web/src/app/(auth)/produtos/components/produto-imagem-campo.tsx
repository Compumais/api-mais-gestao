"use client";

import { useQuery } from "@tanstack/react-query";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { produtosService } from "@/services/produtos.service";

type ProdutoImagemCampoProps = {
	produtoId?: string;
	nomeProduto: string;
	arquivo: File | null;
	referenciaAtual?: string | null;
	imagemLegada?: string | null;
	removerAtual: boolean;
	erro?: string | null;
	onArquivoChange: (arquivo: File | null) => void;
	onRemoverAtualChange: (remover: boolean) => void;
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
	caminho?: string | null,
): string | null {
	for (const valor of [imagem, caminho]) {
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

export function ProdutoImagemCampo({
	produtoId,
	nomeProduto,
	arquivo,
	referenciaAtual,
	imagemLegada,
	removerAtual,
	erro,
	onArquivoChange,
	onRemoverAtualChange,
}: ProdutoImagemCampoProps) {
	const versao = obterVersao(referenciaAtual);
	const possuiImagemGerenciada = Boolean(produtoId && versao && !removerAtual);
	const previewLegado = removerAtual
		? null
		: normalizarImagemLegada(imagemLegada, referenciaAtual);
	const { data: imagemAtual } = useQuery({
		queryKey: ["produto-imagem", produtoId, versao],
		queryFn: () => produtosService.baixarImagem(produtoId ?? "", versao),
		enabled: possuiImagemGerenciada && !arquivo,
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
	});

	const previewArquivo = useMemo(
		() => (arquivo ? URL.createObjectURL(arquivo) : null),
		[arquivo],
	);
	const previewAtual = useMemo(
		() => (imagemAtual ? URL.createObjectURL(imagemAtual) : null),
		[imagemAtual],
	);

	useEffect(
		() => () => {
			if (previewArquivo) URL.revokeObjectURL(previewArquivo);
		},
		[previewArquivo],
	);
	useEffect(
		() => () => {
			if (previewAtual) URL.revokeObjectURL(previewAtual);
		},
		[previewAtual],
	);

	const preview = previewArquivo ?? previewAtual ?? previewLegado;
	const possuiImagemAtual = Boolean(
		arquivo || possuiImagemGerenciada || previewLegado,
	);

	return (
		<Field data-invalid={Boolean(erro)} className="md:col-span-2">
			<FieldLabel htmlFor="imagem-produto">Imagem do produto</FieldLabel>
			<div className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
				<div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
					{preview ? (
						<img
							src={preview}
							alt={`Pré-visualização de ${nomeProduto || "produto"}`}
							className="h-full w-full object-cover"
						/>
					) : (
						<ImageIcon
							className="h-10 w-10 text-muted-foreground"
							aria-hidden="true"
						/>
					)}
				</div>
				<div className="space-y-2">
					<Input
						id="imagem-produto"
						type="file"
						accept="image/jpeg,image/png,image/webp"
						aria-invalid={Boolean(erro)}
						aria-describedby="imagem-produto-ajuda"
						onChange={(evento) => {
							onArquivoChange(evento.target.files?.[0] ?? null);
							onRemoverAtualChange(false);
						}}
					/>
					<p
						id="imagem-produto-ajuda"
						className="text-sm text-muted-foreground"
					>
						JPEG, PNG ou WebP, até 5 MB.
					</p>
					{erro ? (
						<p className="text-sm text-destructive" aria-live="polite">
							{erro}
						</p>
					) : null}
					{possuiImagemAtual && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								onArquivoChange(null);
								onRemoverAtualChange(Boolean(referenciaAtual || imagemLegada));
							}}
						>
							<Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
							Remover imagem
						</Button>
					)}
					{!preview && !erro && (
						<p className="flex items-center text-sm text-muted-foreground">
							<Upload className="mr-2 h-4 w-4" aria-hidden="true" />
							Nenhuma imagem selecionada
						</p>
					)}
				</div>
			</div>
		</Field>
	);
}
