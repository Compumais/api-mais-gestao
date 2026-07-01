"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	fatorConversaoService,
	fatoresConversaoEquivalentes,
	formatarFatorConversao,
} from "@/services/fator-conversao.service";
import { notaFiscalService } from "@/services/nota-fiscal.service";

const FATOR_PADRAO_ID = "__padrao__";
const FATOR_ORFAO_ID = "__orfao__";

type CelulaFatorConversaoImportacaoProps = {
	idempresa: string;
	idRascunho: string;
	idItem: string;
	fatorAtual: string;
	disabled?: boolean;
};

function resolverValorSelect(
	fatorAtual: string,
	fatores: { id: string; fator: string }[],
): string {
	const fatorEncontrado = fatores.find((item) =>
		fatoresConversaoEquivalentes(item.fator, fatorAtual),
	);

	if (fatorEncontrado) {
		return fatorEncontrado.id;
	}

	if (fatoresConversaoEquivalentes(fatorAtual, "1")) {
		return FATOR_PADRAO_ID;
	}

	return FATOR_ORFAO_ID;
}

export function CelulaFatorConversaoImportacao({
	idempresa,
	idRascunho,
	idItem,
	fatorAtual,
	disabled = false,
}: CelulaFatorConversaoImportacaoProps) {
	const queryClient = useQueryClient();

	const { data: fatores = [], isLoading } = useQuery({
		queryKey: ["fatores-conversao", idempresa, "importacao-nf"],
		queryFn: () => fatorConversaoService.listarTodos({ idempresa }),
		enabled: !!idempresa,
	});

	const valorSelect = useMemo(
		() => resolverValorSelect(fatorAtual || "1", fatores),
		[fatorAtual, fatores],
	);

	const { mutate: salvarFator, isPending } = useMutation({
		mutationFn: (novoFator: string) =>
			notaFiscalService.atualizarItemRascunhoImportacao(idRascunho, idItem, {
				idempresa,
				fatorConversao: novoFator,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ["rascunho-importacao-nf", idRascunho],
			});
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const handleChange = (valor: string) => {
		if (valor === "__gerenciar__") {
			window.open("/fator-conversao", "_blank", "noopener,noreferrer");
			return;
		}

		if (valor === FATOR_ORFAO_ID) {
			return;
		}

		const novoFator =
			valor === FATOR_PADRAO_ID
				? "1"
				: (fatores.find((item) => item.id === valor)?.fator ?? "1");

		if (fatoresConversaoEquivalentes(novoFator, fatorAtual)) {
			return;
		}

		salvarFator(novoFator);
	};

	return (
		<div className="relative min-w-[10rem]">
			<Select
				value={valorSelect || undefined}
				onValueChange={handleChange}
				disabled={disabled || isPending || isLoading}
			>
				<SelectTrigger className="h-8 w-full min-w-[10rem] text-xs">
					<SelectValue
						placeholder={
							isLoading ? "Carregando..." : "Selecione o fator"
						}
					/>
				</SelectTrigger>
				<SelectContent position="popper" className="z-[200]">
					<SelectItem value={FATOR_PADRAO_ID}>
						Sem conversão (fator 1)
					</SelectItem>
					{valorSelect === FATOR_ORFAO_ID ? (
						<SelectItem value={FATOR_ORFAO_ID} disabled>
							Fator atual ({formatarFatorConversao(fatorAtual)})
						</SelectItem>
					) : null}
					{fatores.map((fator) => (
						<SelectItem key={fator.id} value={fator.id}>
							{fator.nome} (fator {formatarFatorConversao(fator.fator)})
						</SelectItem>
					))}
					<SelectSeparator />
					<SelectItem value="__gerenciar__" className="text-primary">
						<span className="flex items-center gap-2">
							<ExternalLink className="size-3.5" />
							Gerenciar fatores
						</span>
					</SelectItem>
				</SelectContent>
			</Select>
			{isPending ? (
				<Loader2 className="pointer-events-none absolute right-8 top-1/2 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
			) : null}
		</div>
	);
}
