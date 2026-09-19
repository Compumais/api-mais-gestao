"use client";

import { useQuery } from "@tanstack/react-query";
import { ImageIcon, Trash2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { gruposGourmetService } from "@/services/grupos-gourmet.service";

type Props = {
	grupoId?: string;
	nome: string;
	referencia?: string | null;
	arquivo: File | null;
	remover: boolean;
	erro?: string | null;
	onArquivo: (arquivo: File | null) => void;
	onRemover: (remover: boolean) => void;
};

function versao(referencia?: string | null): string | null {
	try {
		return referencia
			? new URL(referencia, "http://local").searchParams.get("v")
			: null;
	} catch {
		return null;
	}
}

export function GrupoGourmetImagemCampo(props: Props) {
	const token = versao(props.referencia);
	const { data } = useQuery({
		queryKey: ["grupo-gourmet-imagem", props.grupoId, token],
		queryFn: () =>
			gruposGourmetService.baixarImagem(props.grupoId ?? "", token),
		enabled: Boolean(
			props.grupoId && token && !props.arquivo && !props.remover,
		),
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
	});
	const previewArquivo = useMemo(
		() => (props.arquivo ? URL.createObjectURL(props.arquivo) : null),
		[props.arquivo],
	);
	const previewAtual = useMemo(
		() => (data ? URL.createObjectURL(data) : null),
		[data],
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
	const preview = props.remover ? null : (previewArquivo ?? previewAtual);

	return (
		<Field className="md:col-span-2" data-invalid={Boolean(props.erro)}>
			<FieldLabel htmlFor="imagem-grupo-gourmet">Imagem do grupo</FieldLabel>
			<div className="flex gap-4 rounded-lg border p-4">
				<div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
					{preview ? (
						<img
							src={preview}
							alt={`Pré-visualização de ${props.nome || "grupo"}`}
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
						id="imagem-grupo-gourmet"
						type="file"
						accept="image/jpeg,image/png,image/webp"
						onChange={(evento) => {
							props.onArquivo(evento.target.files?.[0] ?? null);
							props.onRemover(false);
						}}
					/>
					<p className="text-sm text-muted-foreground">
						JPEG, PNG ou WebP, até 5 MB.
					</p>
					{props.erro ? (
						<p className="text-sm text-destructive">{props.erro}</p>
					) : null}
					{props.arquivo || (token && !props.remover) ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => {
								props.onArquivo(null);
								props.onRemover(Boolean(props.referencia));
							}}
						>
							<Trash2 className="mr-2 h-4 w-4" /> Remover imagem
						</Button>
					) : null}
				</div>
			</div>
		</Field>
	);
}
