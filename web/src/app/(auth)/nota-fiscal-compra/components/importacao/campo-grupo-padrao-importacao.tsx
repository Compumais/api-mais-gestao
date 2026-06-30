"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { hierarquiasService } from "@/services/hierarquias.service";
import { notaFiscalService } from "@/services/nota-fiscal.service";

type CampoGrupoPadraoImportacaoProps = {
	idempresa: string;
	idRascunho: string;
	idgrupoPadrao?: string | null;
};

export function CampoGrupoPadraoImportacao({
	idempresa,
	idRascunho,
	idgrupoPadrao,
}: CampoGrupoPadraoImportacaoProps) {
	const queryClient = useQueryClient();

	const {
		data: grupos = [],
		isLoading: carregandoGrupos,
		isError: erroGrupos,
	} = useQuery({
		queryKey: ["hierarquias", idempresa, "grupo-padrao-nf"],
		queryFn: () => hierarquiasService.listarTodos({ idempresa }),
		enabled: Boolean(idempresa),
	});

	const { mutate: aplicarGrupo, isPending } = useMutation({
		mutationFn: (idgrupo: string) =>
			notaFiscalService.aplicarGrupoPadraoRascunhoImportacao(idRascunho, {
				idempresa,
				idgrupo,
			}),
		onSuccess: (resultado) => {
			toast.success(
				`Grupo padrão aplicado a ${resultado.quantidadeItens} item(ns)`,
			);
			void queryClient.invalidateQueries({
				queryKey: ["rascunho-importacao-nf", idRascunho],
			});
		},
		onError: (error: Error) => toast.error(error.message),
	});

	return (
		<div className="rounded-md border bg-muted/30 p-4">
			<Field>
				<FieldLabel htmlFor="grupo-padrao-importacao">
					Grupo padrão dos itens
				</FieldLabel>
				<Select
					value={idgrupoPadrao ?? undefined}
					onValueChange={(valor) => aplicarGrupo(valor)}
					disabled={carregandoGrupos || isPending}
				>
					<SelectTrigger id="grupo-padrao-importacao" className="w-full max-w-md">
						<SelectValue
							placeholder={
								carregandoGrupos
									? "Carregando grupos..."
									: "Selecione o grupo padrão"
							}
						/>
					</SelectTrigger>
					<SelectContent position="popper" className="z-[200]">
						{grupos.length === 0 ? (
							<SelectItem value="__vazio" disabled>
								{erroGrupos ? "Erro ao carregar grupos" : "Nenhum grupo cadastrado"}
							</SelectItem>
						) : (
							grupos.map((grupo) => (
								<SelectItem key={grupo.id} value={grupo.id}>
									{grupo.nome || grupo.codigo || grupo.id}
								</SelectItem>
							))
						)}
					</SelectContent>
				</Select>
				<p className="text-xs text-muted-foreground mt-2">
					Ao definir o grupo padrão, ele será repassado automaticamente para todos
					os itens desta nota em revisão.
				</p>
			</Field>
		</div>
	);
}
