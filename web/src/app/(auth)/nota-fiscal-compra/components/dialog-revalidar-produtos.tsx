"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	notaFiscalService,
	type AplicacaoRevalidacaoProdutosNota,
	type ResultadoEstoqueRevalidacao,
} from "@/services/nota-fiscal.service";

type DialogRevalidarProdutosProps = {
	idNota: string;
	idempresa: string;
	numero: string | null;
};

function textoEstoque(situacao: ResultadoEstoqueRevalidacao): string {
	if (situacao === "lancado") return "Estoque lançado";
	if (situacao === "ja_inserido") return "Quantidade já inserida";
	return "Estoque não corrigido";
}

function tomEstoque(situacao: ResultadoEstoqueRevalidacao): "ok" | "atencao" | "pendente" {
	if (situacao === "lancado" || situacao === "ja_inserido") return "ok";
	return "atencao";
}

function classeTom(tom: "ok" | "atencao" | "pendente" | "neutro"): string {
	if (tom === "ok") return "border-green-600 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300";
	if (tom === "atencao") {
		return "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
	}
	if (tom === "pendente") return "border-red-600 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300";
	return "border-border bg-muted text-muted-foreground";
}

function formatarQuantidade(valor: number | null): string {
	if (valor == null || Number.isNaN(valor)) return "—";
	return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 }).format(valor);
}

export function DialogRevalidarProdutos({
	idNota,
	idempresa,
	numero,
}: DialogRevalidarProdutosProps) {
	const [aberto, setAberto] = useState(false);
	const [relatorio, setRelatorio] = useState<AplicacaoRevalidacaoProdutosNota | null>(null);

	const { mutate, isPending } = useMutation({
		mutationFn: () => notaFiscalService.aplicarRevalidacaoProdutos(idNota, idempresa),
		onSuccess: (resultado) => {
			setRelatorio(resultado);
			setAberto(true);
			toast.success(
				`Cadastro atualizado em ${resultado.resumo.cadastrosAtualizados} produto(s). Estoque lançado em ${resultado.resumo.estoquesLancados} item(ns).`,
			);
			if (resultado.resumo.estoquesNaoCorrigidos > 0) {
				toast.warning(
					`${resultado.resumo.estoquesNaoCorrigidos} item(ns) ficaram sem correção automática de estoque.`,
				);
			}
		},
		onError: (error: Error) => {
			toast.error(error.message || "Não foi possível revalidar os produtos");
		},
	});

	const resumo = relatorio?.resumo;

	return (
		<>
			<Button
				type="button"
				variant="outline"
				disabled={isPending}
				onClick={() => mutate()}
			>
				{isPending ? "Revalidando..." : "Revalidar produtos"}
			</Button>
			<Dialog open={aberto} onOpenChange={setAberto}>
				<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
					<DialogHeader>
						<DialogTitle>
							Revalidação dos produtos
							{numero ? ` — NF ${numero}` : ""}
						</DialogTitle>
						<DialogDescription>
							{relatorio?.aviso ??
								"Atualiza o cadastro de entrada desta nota e lança estoque só quando o item ainda não tinha movimento."}
						</DialogDescription>
					</DialogHeader>
					{resumo ? (
						<div className="grid gap-2 sm:grid-cols-2">
							<p className={`rounded-md border px-3 py-2 text-sm ${classeTom("ok")}`}>
								Cadastros atualizados: {resumo.cadastrosAtualizados}
							</p>
							<p className={`rounded-md border px-3 py-2 text-sm ${classeTom("neutro")}`}>
								Cadastros já ok: {resumo.cadastrosJaOk}
							</p>
							<p className={`rounded-md border px-3 py-2 text-sm ${classeTom("ok")}`}>
								Estoque lançado: {resumo.estoquesLancados}
							</p>
							<p className={`rounded-md border px-3 py-2 text-sm ${classeTom("ok")}`}>
								Quantidade já inserida: {resumo.estoquesJaInseridos}
							</p>
							<p className={`rounded-md border px-3 py-2 text-sm sm:col-span-2 ${classeTom(resumo.estoquesNaoCorrigidos ? "atencao" : "neutro")}`}>
								Estoque não corrigido: {resumo.estoquesNaoCorrigidos} de {resumo.itensComProduto} itens com produto
							</p>
						</div>
					) : null}
					{relatorio?.avisos.length ? (
						<ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
							{relatorio.avisos.map((aviso) => (
								<li key={aviso}>{aviso}</li>
							))}
						</ul>
					) : null}
					<div className="space-y-3">
						{relatorio?.itens.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Nenhum item desta nota está vinculado a um produto.
							</p>
						) : null}
						{relatorio?.itens.map((item) => (
							<article key={item.iditem} className="rounded-md border p-3 text-sm">
								<p className="font-medium">
									{item.contador != null ? `#${item.contador} ` : ""}
									{item.descricao}
								</p>
								{item.nomeProduto ? (
									<p className="text-muted-foreground">Produto: {item.nomeProduto}</p>
								) : null}
								<div className="mt-2 flex flex-wrap gap-2">
									<Badge
										variant="outline"
										className={classeTom(item.cadastro === "atualizado" ? "ok" : "neutro")}
									>
										{item.cadastro === "atualizado"
											? "Cadastro atualizado"
											: "Cadastro já estava ok"}
									</Badge>
									<Badge variant="outline" className={classeTom(tomEstoque(item.estoque))}>
										{textoEstoque(item.estoque)}
									</Badge>
								</div>
								<p className="mt-2 text-muted-foreground">
									Quantidade da entrada: {formatarQuantidade(item.quantidadeEsperada)}
									{" · "}
									Movimento do item: {formatarQuantidade(item.quantidadeMovimento)}
								</p>
								{item.camposAtualizados.length > 0 ? (
									<p className="mt-1">
										Gravado no produto: {item.camposAtualizados.join(", ")}.
									</p>
								) : null}
								<p className="mt-1">{item.motivoEstoque}</p>
							</article>
						))}
					</div>
					<p className="text-xs text-muted-foreground">
						CST de saída válido não é substituído. Quantidade divergente ou movimento sem vínculo do item não gera nova entrada de estoque.
					</p>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setAberto(false)}>
							Fechar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
