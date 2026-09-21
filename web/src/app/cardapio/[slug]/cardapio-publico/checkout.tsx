"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CardapioPublico } from "@/services/cardapio-publico.service";
import { formatarMoeda, type ItemSacola } from "./tipos";

type Props = {
	data: CardapioPublico;
	sacola: ItemSacola[];
	nome: string;
	telefone: string;
	respostas: Record<string, string>;
	subtotal: number;
	taxa: number;
	total: number;
	cor: string;
	enviando: boolean;
	onVoltar: () => void;
	onNome: (valor: string) => void;
	onTelefone: (valor: string) => void;
	onRespostas: (
		atualizador:
			| Record<string, string>
			| ((atual: Record<string, string>) => Record<string, string>),
	) => void;
	onRemover: (chave: string) => void;
	onEnviar: () => void;
};

export function CardapioPublicoCheckout({
	data,
	sacola,
	nome,
	telefone,
	respostas,
	subtotal,
	taxa,
	total,
	cor,
	enviando,
	onVoltar,
	onNome,
	onTelefone,
	onRespostas,
	onRemover,
	onEnviar,
}: Props) {
	return (
		<main className="mx-auto max-w-xl px-4 py-6">
			<button
				type="button"
				className="mb-4 text-sm"
				style={{ color: cor }}
				onClick={onVoltar}
			>
				← Voltar ao cardápio
			</button>
			<h1 className="text-2xl font-bold">Finalizar pedido</h1>
			<ul className="mt-4 space-y-3">
				{sacola.map((item) => (
					<li
						key={item.chave}
						className="flex items-start justify-between rounded-xl bg-white p-3"
					>
						<div>
							<p className="font-medium">{item.nome}</p>
							<p className="text-sm text-zinc-500">
								{item.quantidade} × {formatarMoeda(item.preco)}
							</p>
						</div>
						<button
							type="button"
							className="text-sm text-zinc-500"
							onClick={() => onRemover(item.chave)}
						>
							Remover
						</button>
					</li>
				))}
			</ul>
			<div className="mt-6 space-y-4 rounded-xl bg-white p-4">
				<div>
					<Label htmlFor="nome">Nome</Label>
					<Input
						id="nome"
						value={nome}
						onChange={(event) => onNome(event.target.value)}
					/>
				</div>
				<div>
					<Label htmlFor="telefone">Telefone</Label>
					<Input
						id="telefone"
						value={telefone}
						onChange={(event) => onTelefone(event.target.value)}
					/>
				</div>
				{[...data.camposfinalizacao]
					.sort((a, b) => a.ordem - b.ordem)
					.map((campo) => {
						if (
							campo.condicao &&
							(respostas[campo.condicao.campoid] ?? "") !==
								campo.condicao.valor
						) {
							return null;
						}
						if (campo.tipo === "modalidade") {
							const opcoes = [
								data.habilitadelivery === 1
									? { id: "delivery", label: "Entrega" }
									: null,
								data.habilitaretirada === 1
									? { id: "retirada", label: "Retirada" }
									: null,
							].filter(Boolean) as Array<{ id: string; label: string }>;
							return (
								<div key={campo.id}>
									<Label>{campo.rotulo}</Label>
									<Select
										value={respostas[campo.id] || opcoes[0]?.id}
										onValueChange={(value) =>
											onRespostas((atual) => ({
												...atual,
												[campo.id]: value,
												modalidade: value,
											}))
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{opcoes.map((opcao) => (
												<SelectItem key={opcao.id} value={opcao.id}>
													{opcao.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							);
						}
						if (campo.tipo === "endereco") {
							return (
								<div key={campo.id} className="grid gap-3">
									<div>
										<Label>Endereço</Label>
										<Input
											value={respostas.endereco ?? ""}
											onChange={(event) =>
												onRespostas((atual) => ({
													...atual,
													endereco: event.target.value,
												}))
											}
										/>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<Label>Número</Label>
											<Input
												value={respostas.numero ?? ""}
												onChange={(event) =>
													onRespostas((atual) => ({
														...atual,
														numero: event.target.value,
													}))
												}
											/>
										</div>
										<div>
											<Label>Bairro</Label>
											{data.bairrosentrega.length ? (
												<Select
													value={respostas.bairro ?? ""}
													onValueChange={(value) =>
														onRespostas((atual) => ({
															...atual,
															bairro: value,
														}))
													}
												>
													<SelectTrigger>
														<SelectValue placeholder="Selecione" />
													</SelectTrigger>
													<SelectContent>
														{data.bairrosentrega.map((bairro) => (
															<SelectItem
																key={bairro.nome}
																value={bairro.nome}
															>
																{bairro.nome} · {formatarMoeda(bairro.taxa)}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											) : (
												<Input
													value={respostas.bairro ?? ""}
													onChange={(event) =>
														onRespostas((atual) => ({
															...atual,
															bairro: event.target.value,
														}))
													}
												/>
											)}
										</div>
									</div>
									<div>
										<Label>Complemento</Label>
										<Input
											value={respostas.complemento ?? ""}
											onChange={(event) =>
												onRespostas((atual) => ({
													...atual,
													complemento: event.target.value,
												}))
											}
										/>
									</div>
									<div>
										<Label>Referência</Label>
										<Input
											value={respostas.referencia ?? ""}
											onChange={(event) =>
												onRespostas((atual) => ({
													...atual,
													referencia: event.target.value,
												}))
											}
										/>
									</div>
								</div>
							);
						}
						if (campo.tipo === "pagamento") {
							return (
								<div key={campo.id}>
									<Label>{campo.rotulo}</Label>
									<Select
										value={respostas[campo.id] ?? ""}
										onValueChange={(value) =>
											onRespostas((atual) => ({
												...atual,
												[campo.id]: value,
												pagamento: value,
											}))
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Selecione" />
										</SelectTrigger>
										<SelectContent>
											{data.meiospagamento.map((meio) => (
												<SelectItem key={meio.id} value={meio.id}>
													{meio.descricao}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							);
						}
						if (campo.tipo === "observacao") {
							return (
								<div key={campo.id}>
									<Label>{campo.rotulo}</Label>
									<Textarea
										value={respostas[campo.id] ?? ""}
										onChange={(event) =>
											onRespostas((atual) => ({
												...atual,
												[campo.id]: event.target.value,
												observacao: event.target.value,
											}))
										}
									/>
								</div>
							);
						}
						if (campo.tipo === "select") {
							return (
								<div key={campo.id}>
									<Label>{campo.rotulo}</Label>
									<Select
										value={respostas[campo.id] ?? ""}
										onValueChange={(value) =>
											onRespostas((atual) => ({
												...atual,
												[campo.id]: value,
											}))
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Selecione" />
										</SelectTrigger>
										<SelectContent>
											{(campo.opcoes ?? []).map((opcao) => (
												<SelectItem key={opcao} value={opcao}>
													{opcao}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							);
						}
						return (
							<div key={campo.id}>
								<Label>{campo.rotulo}</Label>
								<Input
									value={respostas[campo.id] ?? ""}
									onChange={(event) =>
										onRespostas((atual) => ({
											...atual,
											[campo.id]: event.target.value,
											...(campo.tipo === "documento"
												? { documento: event.target.value }
												: {}),
										}))
									}
								/>
							</div>
						);
					})}
				{data.mensagemrodape ? (
					<p className="text-sm text-zinc-500">{data.mensagemrodape}</p>
				) : null}
			</div>
			<div className="mt-4 rounded-xl bg-white p-4 text-sm">
				<div className="flex justify-between">
					<span>Subtotal</span>
					<span>{formatarMoeda(subtotal)}</span>
				</div>
				<div className="mt-1 flex justify-between">
					<span>Entrega</span>
					<span>{formatarMoeda(taxa)}</span>
				</div>
				<div className="mt-2 flex justify-between font-semibold">
					<span>Total</span>
					<span>{formatarMoeda(total)}</span>
				</div>
			</div>
			<Button
				className="mt-4 w-full"
				style={{ background: cor }}
				disabled={enviando || sacola.length === 0}
				onClick={onEnviar}
			>
				{enviando ? "Enviando..." : `Enviar pedido · ${formatarMoeda(total)}`}
			</Button>
		</main>
	);
}
