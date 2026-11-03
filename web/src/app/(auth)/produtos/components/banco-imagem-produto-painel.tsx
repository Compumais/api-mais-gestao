"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BancoImagemPreview } from "@/app/(auth)/produtos/components/banco-imagem-preview";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	type BancoImagemProduto,
	bancoImagemService,
} from "@/services/banco-imagem.service";
import { produtosService } from "@/services/produtos.service";

function digitos(valor: number | string | null | undefined): string {
	if (valor == null || (typeof valor === "number" && Number.isNaN(valor))) {
		return "";
	}
	return String(valor).replace(/\D/g, "");
}

type BancoImagemProdutoPainelProps = {
	produtoId?: string;
	ean: number | string | null | undefined;
	temFotoPropria: boolean;
	bancoSelecionadoId: string | null;
	ignorarBanco: boolean;
	onBancoSelecionado: (id: string | null) => void;
	onIgnorarBanco: (ignorar: boolean) => void;
};

export function BancoImagemProdutoPainel({
	produtoId,
	ean,
	temFotoPropria,
	bancoSelecionadoId,
	ignorarBanco,
	onBancoSelecionado,
	onIgnorarBanco,
}: BancoImagemProdutoPainelProps) {
	const queryClient = useQueryClient();
	const codigo = digitos(ean);
	const [buscaAberta, setBuscaAberta] = useState(false);
	const [texto, setTexto] = useState("");
	const [grupoFiltro, setGrupoFiltro] = useState("");
	const [consulta, setConsulta] = useState("");

	const { data: produto } = useQuery({
		queryKey: ["produto", produtoId],
		queryFn: () => produtosService.buscar(produtoId ?? ""),
		enabled: Boolean(produtoId),
	});
	const vinculoId = produtoId
		? (produto?.idbancoimagem ?? null)
		: bancoSelecionadoId;

	const { data: vinculados } = useQuery({
		queryKey: ["banco-imagem-produto", vinculoId],
		queryFn: () => bancoImagemService.buscarProduto(vinculoId ?? ""),
		enabled: Boolean(vinculoId),
	});

	const { data: sugestoes = [] } = useQuery({
		queryKey: ["banco-imagens-match", codigo],
		queryFn: () => bancoImagemService.buscar({ codigo, limit: 5 }),
		enabled: codigo.length >= 8 && !temFotoPropria && !ignorarBanco,
	});
	const sugestao =
		sugestoes.find((item) =>
			item.codigos.some((itemCodigo) => itemCodigo.codigo === codigo),
		) ?? sugestoes[0];

	const { data: grupos = [] } = useQuery({
		queryKey: ["banco-imagens-grupos"],
		queryFn: () => bancoImagemService.listarGrupos(),
		enabled: buscaAberta,
	});
	const { data: resultados = [], isFetching } = useQuery({
		queryKey: ["banco-imagens-busca", consulta, grupoFiltro],
		queryFn: () =>
			bancoImagemService.buscar({
				q: consulta || undefined,
				idgrupo: grupoFiltro || undefined,
				limit: 20,
			}),
		enabled: buscaAberta && (consulta.trim().length > 0 || Boolean(grupoFiltro)),
	});

	const codigoAnterior = useRef(codigo);
	useEffect(() => {
		if (codigoAnterior.current === codigo) return;
		codigoAnterior.current = codigo;
		onIgnorarBanco(false);
		onBancoSelecionado(null);
	}, [codigo, onBancoSelecionado, onIgnorarBanco]);

	const vincular = useMutation({
		mutationFn: (idbancoimagem: string | null) =>
			produtosService.vincularBancoImagem(produtoId ?? "", idbancoimagem),
		onSuccess: async (atualizado) => {
			if (produtoId) {
				queryClient.setQueryData(["produto", produtoId], atualizado);
				await queryClient.invalidateQueries({ queryKey: ["produtos"] });
			}
			toast.success(
				atualizado.idbancoimagem
					? "Imagem do banco vinculada"
					: "Vínculo com o banco removido",
			);
		},
		onError: (erro: Error) => toast.error(erro.message),
	});

	const escolher = (item: BancoImagemProduto) => {
		onIgnorarBanco(false);
		setBuscaAberta(false);
		if (produtoId) {
			vincular.mutate(item.id);
			return;
		}
		onBancoSelecionado(item.id);
	};

	const recusar = () => {
		if (produtoId) {
			vincular.mutate(null);
			return;
		}
		onBancoSelecionado(null);
		onIgnorarBanco(true);
	};

	const mostraSugestao =
		!temFotoPropria &&
		!ignorarBanco &&
		sugestao &&
		sugestao.id !== vinculoId;

	return (
		<div className="space-y-3 rounded-lg border p-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div>
					<h3 className="text-sm font-medium">Banco de imagens</h3>
					<p className="text-sm text-muted-foreground">
						Se o código de barras existir no banco, a foto é compartilhada e
						não é copiada para este produto.
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					onClick={() => setBuscaAberta(true)}
					disabled={temFotoPropria || vincular.isPending}
				>
					<Search className="mr-1 h-4 w-4" aria-hidden="true" />
					Buscar no banco
				</Button>
			</div>

			{temFotoPropria ? (
				<p className="text-sm text-muted-foreground">
					A foto enviada neste produto tem prioridade. Remova as imagens para
					usar o banco.
				</p>
			) : null}

			{vinculoId && vinculados && !temFotoPropria ? (
				<div className="flex items-center gap-3">
					<BancoImagemPreview
						id={vinculados.id}
						referencia={vinculados.referencia}
						alt={vinculados.nome}
					/>
					<div className="min-w-0">
						<p className="text-sm font-medium">
							Usando imagem do banco: {vinculados.nome}
						</p>
						<p className="text-xs text-muted-foreground">{vinculados.grupo}</p>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="mt-1"
							disabled={vincular.isPending}
							onClick={recusar}
						>
							Não usar esta imagem
						</Button>
					</div>
				</div>
			) : null}

			{mostraSugestao ? (
				<div className="flex items-center gap-3 rounded-md bg-muted/60 p-3">
					<BancoImagemPreview
						id={sugestao.id}
						referencia={sugestao.referencia}
						alt={sugestao.nome}
					/>
					<div className="min-w-0">
						<p className="text-sm">
							Código encontrado no banco: <strong>{sugestao.nome}</strong>
						</p>
						<p className="text-xs text-muted-foreground">
							{produtoId
								? "Você pode usar agora ou deixar que o salvamento faça o vínculo."
								: "Ao cadastrar, esta imagem será usada se você não enviar uma foto."}
						</p>
						<Button
							type="button"
							size="sm"
							className="mt-2"
							disabled={vincular.isPending}
							onClick={() => escolher(sugestao)}
						>
							Usar esta imagem
						</Button>
					</div>
				</div>
			) : null}

			<Dialog open={buscaAberta} onOpenChange={setBuscaAberta}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Buscar no banco de imagens</DialogTitle>
						<DialogDescription>
							Pesquise por nome, grupo ou código de barras. A imagem fica no
							banco e o produto só aponta para ela.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3">
						<div className="space-y-1">
							<Label htmlFor="busca-banco">Nome ou código</Label>
							<Input
								id="busca-banco"
								value={texto}
								onChange={(evento) => setTexto(evento.target.value)}
								onKeyDown={(evento) => {
									if (evento.key === "Enter") {
										evento.preventDefault();
										setConsulta(texto.trim());
									}
								}}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="grupo-banco">Grupo</Label>
							<select
								id="grupo-banco"
								className="h-8 w-full rounded-md border bg-background px-2 text-sm"
								value={grupoFiltro}
								onChange={(evento) => setGrupoFiltro(evento.target.value)}
							>
								<option value="">Todos</option>
								{grupos
									.filter((grupo) => grupo.ativo)
									.map((grupo) => (
										<option key={grupo.id} value={grupo.id}>
											{grupo.nome}
										</option>
									))}
							</select>
						</div>
						<Button type="button" onClick={() => setConsulta(texto.trim())}>
							Buscar
						</Button>
						<ul className="max-h-72 space-y-2 overflow-y-auto">
							{isFetching ? (
								<li className="text-sm text-muted-foreground">Buscando...</li>
							) : null}
							{resultados.map((item) => (
								<li key={item.id}>
									<button
										type="button"
										className="flex w-full items-center gap-3 rounded-md border p-2 text-left hover:bg-muted"
										onClick={() => escolher(item)}
									>
										<BancoImagemPreview
											id={item.id}
											referencia={item.referencia}
											alt={item.nome}
										/>
										<span className="min-w-0">
											<span className="block truncate text-sm font-medium">
												{item.nome}
											</span>
											<span className="block truncate text-xs text-muted-foreground">
												{item.grupo}
												{item.codigos.length > 0
													? ` · ${item.codigos.map((itemCodigo) => itemCodigo.codigo).join(", ")}`
													: ""}
											</span>
										</span>
									</button>
								</li>
							))}
						</ul>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
