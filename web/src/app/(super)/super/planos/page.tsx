"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	type AdminModuloSaas,
	type AdminPlanoSaas,
	adminService,
} from "@/services/admin.service";

function slugifyCodigo(valor: string) {
	return valor
		.trim()
		.toUpperCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^A-Z0-9_]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

function PlanoEditor({
	plano,
	features,
}: {
	plano: AdminPlanoSaas;
	features: Array<{ id: string; nome: string }>;
}) {
	const queryClient = useQueryClient();
	const [valor, setValor] = useState(plano.valormensal);
	const [maxEmpresas, setMaxEmpresas] = useState(String(plano.maxempresas));
	const [maxUsuarios, setMaxUsuarios] = useState(String(plano.maxusuarios));
	const [ativo, setAtivo] = useState(plano.ativo);
	const [idsFeatures, setIdsFeatures] = useState(
		plano.features.map((item) => item.id),
	);

	const mutation = useMutation({
		mutationFn: () =>
			adminService.atualizarPlanoSaas(plano.id, {
				valormensal: valor,
				maxempresas: Number(maxEmpresas),
				maxusuarios: Number(maxUsuarios),
				ativo,
				idfeatures: idsFeatures,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-planos-saas"] });
			toast.success("Plano atualizado");
		},
		onError: () => toast.error("Não foi possível atualizar o plano"),
	});

	return (
		<div className="rounded-lg border p-4 space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-semibold">{plano.nome}</h2>
					<p className="text-sm text-muted-foreground">
						{plano.codigo} · {plano.descricao}
					</p>
				</div>
				<Badge variant={ativo ? "default" : "secondary"}>
					{ativo ? "Ativo" : "Inativo"}
				</Badge>
			</div>
			<div className="grid gap-3 md:grid-cols-4">
				<div className="space-y-1">
					<Label htmlFor={`valor-${plano.id}`}>Valor mensal</Label>
					<Input
						id={`valor-${plano.id}`}
						inputMode="decimal"
						value={valor}
						onChange={(event) => setValor(event.target.value)}
					/>
				</div>
				<div className="space-y-1">
					<Label htmlFor={`empresas-${plano.id}`}>Máx. empresas</Label>
					<Input
						id={`empresas-${plano.id}`}
						type="number"
						min={0}
						value={maxEmpresas}
						onChange={(event) => setMaxEmpresas(event.target.value)}
					/>
				</div>
				<div className="space-y-1">
					<Label htmlFor={`usuarios-${plano.id}`}>Máx. usuários</Label>
					<Input
						id={`usuarios-${plano.id}`}
						type="number"
						min={0}
						value={maxUsuarios}
						onChange={(event) => setMaxUsuarios(event.target.value)}
					/>
				</div>
				<div className="flex items-end gap-2 pb-2 text-sm">
					<Checkbox
						aria-label="Ativo para contratação"
						checked={ativo}
						onCheckedChange={(checked) => setAtivo(checked === true)}
					/>
					Ativo para contratação
				</div>
			</div>
			<div className="space-y-2">
				<Label>Funcionalidades incluídas</Label>
				<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{features.map((feature) => {
						const selecionada = idsFeatures.includes(feature.id);
						return (
							<div key={feature.id} className="flex items-center gap-2 text-sm">
								<Checkbox
									aria-label={feature.nome}
									checked={selecionada}
									onCheckedChange={(checked) =>
										setIdsFeatures((atual) =>
											checked === true
												? [...atual, feature.id]
												: atual.filter((id) => id !== feature.id),
										)
									}
								/>
								{feature.nome}
							</div>
						);
					})}
				</div>
			</div>
			<Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
				{mutation.isPending ? "Salvando..." : "Salvar plano"}
			</Button>
		</div>
	);
}

function ModuloEditor({ modulo }: { modulo: AdminModuloSaas }) {
	const queryClient = useQueryClient();
	const [valor, setValor] = useState(modulo.valormensal);
	const [ativo, setAtivo] = useState(modulo.ativo);
	const mutation = useMutation({
		mutationFn: () =>
			adminService.atualizarModuloSaas(modulo.id, {
				valormensal: valor,
				ativo,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-planos-saas"] });
			toast.success("Módulo atualizado");
		},
		onError: () => toast.error("Não foi possível atualizar o módulo"),
	});

	return (
		<TableRow>
			<TableCell>
				<div className="font-medium">{modulo.nome}</div>
				<div className="text-sm text-muted-foreground">{modulo.descricao}</div>
			</TableCell>
			<TableCell>{modulo.codigo}</TableCell>
			<TableCell>
				<Input
					className="w-28"
					inputMode="decimal"
					value={valor}
					onChange={(event) => setValor(event.target.value)}
				/>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-2">
					<Checkbox
						checked={ativo}
						onCheckedChange={(checked) => setAtivo(checked === true)}
					/>
					{ativo ? "Ativo" : "Inativo"}
				</div>
			</TableCell>
			<TableCell className="text-right">
				<Button
					size="sm"
					onClick={() => mutation.mutate()}
					disabled={mutation.isPending}
				>
					Salvar
				</Button>
			</TableCell>
		</TableRow>
	);
}

function NovoPlanoDialog({
	open,
	onOpenChange,
	features,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	features: Array<{ id: string; nome: string }>;
}) {
	const queryClient = useQueryClient();
	const [nome, setNome] = useState("");
	const [codigo, setCodigo] = useState("");
	const [codigoEditado, setCodigoEditado] = useState(false);
	const [descricao, setDescricao] = useState("");
	const [valor, setValor] = useState("0");
	const [maxEmpresas, setMaxEmpresas] = useState("1");
	const [maxUsuarios, setMaxUsuarios] = useState("3");
	const [ordem, setOrdem] = useState("0");
	const [idsFeatures, setIdsFeatures] = useState<string[]>([]);

	const reset = () => {
		setNome("");
		setCodigo("");
		setCodigoEditado(false);
		setDescricao("");
		setValor("0");
		setMaxEmpresas("1");
		setMaxUsuarios("3");
		setOrdem("0");
		setIdsFeatures([]);
	};

	const mutation = useMutation({
		mutationFn: () =>
			adminService.criarPlanoSaas({
				codigo,
				nome,
				descricao: descricao || null,
				valormensal: valor,
				maxempresas: Number(maxEmpresas),
				maxusuarios: Number(maxUsuarios),
				ordem: Number(ordem),
				ativo: true,
				idfeatures: idsFeatures,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-planos-saas"] });
			toast.success("Plano criado");
			reset();
			onOpenChange(false);
		},
		onError: () => toast.error("Não foi possível criar o plano"),
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Novo plano</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-1">
						<Label htmlFor="novo-plano-nome">Nome</Label>
						<Input
							id="novo-plano-nome"
							value={nome}
							onChange={(event) => {
								const value = event.target.value;
								setNome(value);
								if (!codigoEditado) setCodigo(slugifyCodigo(value));
							}}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="novo-plano-codigo">Código</Label>
						<Input
							id="novo-plano-codigo"
							value={codigo}
							onChange={(event) => {
								setCodigoEditado(true);
								setCodigo(slugifyCodigo(event.target.value));
							}}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="novo-plano-descricao">Descrição</Label>
						<Input
							id="novo-plano-descricao"
							value={descricao}
							onChange={(event) => setDescricao(event.target.value)}
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-2">
						<div className="space-y-1">
							<Label htmlFor="novo-plano-valor">Valor mensal</Label>
							<Input
								id="novo-plano-valor"
								inputMode="decimal"
								value={valor}
								onChange={(event) => setValor(event.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="novo-plano-ordem">Ordem</Label>
							<Input
								id="novo-plano-ordem"
								type="number"
								value={ordem}
								onChange={(event) => setOrdem(event.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="novo-plano-empresas">Máx. empresas</Label>
							<Input
								id="novo-plano-empresas"
								type="number"
								min={0}
								value={maxEmpresas}
								onChange={(event) => setMaxEmpresas(event.target.value)}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="novo-plano-usuarios">Máx. usuários</Label>
							<Input
								id="novo-plano-usuarios"
								type="number"
								min={0}
								value={maxUsuarios}
								onChange={(event) => setMaxUsuarios(event.target.value)}
							/>
						</div>
					</div>
					<div className="space-y-2">
						<Label>Funcionalidades</Label>
						<div className="grid gap-2 sm:grid-cols-2">
							{features.map((feature) => {
								const selecionada = idsFeatures.includes(feature.id);
								return (
									<div
										key={feature.id}
										className="flex items-center gap-2 text-sm"
									>
										<Checkbox
											aria-label={feature.nome}
											checked={selecionada}
											onCheckedChange={(checked) =>
												setIdsFeatures((atual) =>
													checked === true
														? [...atual, feature.id]
														: atual.filter((id) => id !== feature.id),
												)
											}
										/>
										{feature.nome}
									</div>
								);
							})}
						</div>
					</div>
					<Button
						className="w-full"
						disabled={!nome || !codigo || mutation.isPending}
						onClick={() => mutation.mutate()}
					>
						{mutation.isPending ? "Criando..." : "Criar plano"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function NovoModuloDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const queryClient = useQueryClient();
	const [nome, setNome] = useState("");
	const [codigo, setCodigo] = useState("");
	const [codigoEditado, setCodigoEditado] = useState(false);
	const [descricao, setDescricao] = useState("");
	const [valor, setValor] = useState("0");

	const reset = () => {
		setNome("");
		setCodigo("");
		setCodigoEditado(false);
		setDescricao("");
		setValor("0");
	};

	const mutation = useMutation({
		mutationFn: () =>
			adminService.criarModuloSaas({
				codigo: codigo.toLowerCase(),
				nome,
				descricao: descricao || null,
				valormensal: valor,
				ativo: true,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["admin-planos-saas"] });
			toast.success("Módulo criado");
			reset();
			onOpenChange(false);
		},
		onError: () => toast.error("Não foi possível criar o módulo"),
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Novo módulo</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-1">
						<Label htmlFor="novo-modulo-nome">Nome</Label>
						<Input
							id="novo-modulo-nome"
							value={nome}
							onChange={(event) => {
								const value = event.target.value;
								setNome(value);
								if (!codigoEditado) {
									setCodigo(slugifyCodigo(value).toLowerCase());
								}
							}}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="novo-modulo-codigo">Código</Label>
						<Input
							id="novo-modulo-codigo"
							value={codigo}
							onChange={(event) => {
								setCodigoEditado(true);
								setCodigo(slugifyCodigo(event.target.value).toLowerCase());
							}}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="novo-modulo-descricao">Descrição</Label>
						<Input
							id="novo-modulo-descricao"
							value={descricao}
							onChange={(event) => setDescricao(event.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="novo-modulo-valor">Valor mensal</Label>
						<Input
							id="novo-modulo-valor"
							inputMode="decimal"
							value={valor}
							onChange={(event) => setValor(event.target.value)}
						/>
					</div>
					<Button
						className="w-full"
						disabled={!nome || !codigo || mutation.isPending}
						onClick={() => mutation.mutate()}
					>
						{mutation.isPending ? "Criando..." : "Criar módulo"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export default function SuperPlanosPage() {
	const [novoPlanoAberto, setNovoPlanoAberto] = useState(false);
	const [novoModuloAberto, setNovoModuloAberto] = useState(false);
	const { data, isLoading } = useQuery({
		queryKey: ["admin-planos-saas"],
		queryFn: adminService.listarPlanosSaas,
	});

	if (isLoading) return <p>Carregando catálogo...</p>;

	return (
		<div className="space-y-8">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold">Planos e módulos</h1>
					<p className="text-muted-foreground">
						Gerencie preços, limites e funcionalidades do catálogo SaaS.
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => setNovoModuloAberto(true)}>
						Novo módulo
					</Button>
					<Button onClick={() => setNovoPlanoAberto(true)}>Novo plano</Button>
				</div>
			</div>
			<section className="space-y-4">
				<h2 className="text-lg font-semibold">Planos</h2>
				{data?.planos.map((plano) => (
					<PlanoEditor key={plano.id} plano={plano} features={data.features} />
				))}
			</section>
			<section className="space-y-4">
				<h2 className="text-lg font-semibold">Módulos adicionais</h2>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Módulo</TableHead>
							<TableHead>Código</TableHead>
							<TableHead>Valor mensal</TableHead>
							<TableHead>Status</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{data?.modulos.map((modulo) => (
							<ModuloEditor key={modulo.id} modulo={modulo} />
						))}
					</TableBody>
				</Table>
			</section>

			<NovoPlanoDialog
				open={novoPlanoAberto}
				onOpenChange={setNovoPlanoAberto}
				features={data?.features ?? []}
			/>
			<NovoModuloDialog
				open={novoModuloAberto}
				onOpenChange={setNovoModuloAberto}
			/>
		</div>
	);
}
