"use client";

import { IconFileUpload } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { contaCorrenteLancamentoService } from "@/services/conta-corrente-lancamento.service";
import type { ContaCorrenteListItem } from "@/services/contas-correntes.service";
import type { LinhaImportacaoOfx } from "@/util/ofx-importacao";

interface FormImportarOfxProps {
	idcontacorrente: string;
	onIdContaCorrenteChange: (id: string) => void;
	contasCorrentes: ContaCorrenteListItem[];
	onPreview: (linhas: LinhaImportacaoOfx[]) => void;
}

export function FormImportarOfx({
	idcontacorrente,
	onIdContaCorrenteChange,
	contasCorrentes,
	onPreview,
}: FormImportarOfxProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);
	const [conteudoOfx, setConteudoOfx] = useState<string>("");

	const { mutate: carregarPreview, isPending } = useMutation({
		mutationFn: async () => {
			if (!idcontacorrente) {
				throw new Error("Selecione uma conta corrente");
			}
			if (!conteudoOfx) {
				throw new Error("Selecione um arquivo OFX");
			}

			return contaCorrenteLancamentoService.previewImportacaoOfx({
				idcontacorrente,
				conteudoOfx,
			});
		},
		onSuccess: (linhas) => {
			const linhasComStatus: LinhaImportacaoOfx[] = linhas.map((linha) => ({
				...linha,
				status: linha.status,
				idLancamentoExistente: linha.idLancamentoExistente,
				idplanocontasSelecionado: linha.idplanocontasExistente ?? undefined,
			}));
			onPreview(linhasComStatus);
			toast.success(`${linhasComStatus.length} transações carregadas`);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao processar arquivo OFX");
		},
	});

	const handleArquivo = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const arquivo = event.target.files?.[0];
		if (!arquivo) return;

		const extensao = arquivo.name.toLowerCase();
		if (!extensao.endsWith(".ofx") && !extensao.endsWith(".ofc")) {
			toast.error("Selecione um arquivo .ofx ou .ofc válido");
			return;
		}

		const texto = await arquivo.text();
		setConteudoOfx(texto);
		setNomeArquivo(arquivo.name);
	};

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h2 className="text-lg font-semibold">Conta corrente</h2>
				<Select value={idcontacorrente} onValueChange={onIdContaCorrenteChange}>
					<SelectTrigger className="w-full max-w-md">
						<SelectValue placeholder="Selecione a conta corrente" />
					</SelectTrigger>
					<SelectContent>
						{contasCorrentes.map((conta) => (
							<SelectItem key={conta.id} value={conta.id}>
								{conta.descricao || conta.id}
								{conta.agencia ? ` — Ag. ${conta.agencia}` : ""}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-2">
				<h2 className="text-lg font-semibold">Arquivo OFX</h2>
				<p className="text-sm text-muted-foreground">
					Selecione o extrato bancário no formato OFX. As transações serão
					exibidas para associação individual de plano de contas.
				</p>

				<input
					ref={inputRef}
					type="file"
					accept=".ofx,.ofc"
					className="hidden"
					onChange={handleArquivo}
				/>

				<div className="flex flex-wrap items-center gap-3">
					<Button
						type="button"
						variant="outline"
						className="gap-2"
						onClick={() => inputRef.current?.click()}
					>
						<IconFileUpload className="size-4" />
						Selecionar arquivo
					</Button>
					{nomeArquivo && (
						<span className="text-sm text-muted-foreground">{nomeArquivo}</span>
					)}
				</div>
			</div>

			<Button
				type="button"
				onClick={() => carregarPreview()}
				disabled={isPending || !idcontacorrente || !conteudoOfx}
			>
				{isPending ? "Processando..." : "Carregar prévia"}
			</Button>
		</div>
	);
}
