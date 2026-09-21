"use client";

import { ImageIcon, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Props = {
	titulo: string;
	referencia?: string | null;
	arquivo: File | null;
	remover: boolean;
	onArquivo: (arquivo: File | null) => void;
	onRemover: (remover: boolean) => void;
};

export function CardapioDeliveryImagemCampo(props: Props) {
	const preview = useMemo(() => {
		if (props.arquivo) return URL.createObjectURL(props.arquivo);
		if (props.remover || !props.referencia) return null;
		const base = process.env.NEXT_PUBLIC_API_URL ?? "";
		return `${base}${props.referencia}`;
	}, [props.arquivo, props.referencia, props.remover]);

	return (
		<Field>
			<FieldLabel>{props.titulo}</FieldLabel>
			{preview ? (
				<img
					src={preview}
					alt={props.titulo}
					className="mb-2 h-28 w-full rounded-md object-cover"
				/>
			) : (
				<div className="mb-2 flex h-28 items-center justify-center rounded-md border border-dashed text-muted-foreground">
					<ImageIcon className="size-6" />
				</div>
			)}
			<div className="flex gap-2">
				<Input
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onChange={(event) => {
						props.onRemover(false);
						props.onArquivo(event.target.files?.[0] ?? null);
					}}
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={() => {
						props.onArquivo(null);
						props.onRemover(true);
					}}
				>
					<Trash2 className="size-4" />
				</Button>
			</div>
		</Field>
	);
}
