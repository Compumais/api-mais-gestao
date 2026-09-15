"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
	CAMPOS_CLIENTE_OS,
	CAMPOS_CLIENTE_OS_PADRAO,
	CAMPOS_DADOS_OS,
	CAMPOS_VEICULO_OS,
	LABELS_BLOCO_MODELO_IMPRESSAO_OS,
	OPCOES_COLUNA_BLOCO,
} from "@/constants/modelo-impressao-os";
import type {
	BlocoModeloImpressaoOs,
	ColunaBlocoModeloImpressao,
	LayoutModeloImpressaoOs,
	TipoBlocoModeloImpressaoOs,
} from "@/schemas/modelo-impressao-os.schema";
import { TIPOS_BLOCO_MODELO_IMPRESSAO_OS } from "@/schemas/modelo-impressao-os.schema";
import { PaletaBlocosImpressao } from "@/components/modelo-impressao/paleta-blocos-impressao";
import { EditorCamposPersonalizadosOs } from "@/components/modelo-impressao/editor-campos-personalizados-os";
import { PreviewModeloImpressaoOs } from "./preview-modelo-impressao-os";

function novoId() {
	return crypto.randomUUID();
}

function criarBloco(
	tipo: TipoBlocoModeloImpressaoOs,
	campos?: string[],
): BlocoModeloImpressaoOs {
	const base: BlocoModeloImpressaoOs = { id: novoId(), tipo, coluna: "cheia" };
	switch (tipo) {
		case "titulo":
			return { ...base, props: { titulo: "Ordem de Serviço" } };
		case "textoLivre":
			return { ...base, props: { texto: "" } };
		case "dadosOs":
			return {
				...base,
				props: {
					campos: campos ?? CAMPOS_DADOS_OS.map((c) => c.value),
				},
			};
		case "cliente":
			return {
				...base,
				props: {
					campos: campos ?? CAMPOS_CLIENTE_OS.map((c) => c.value),
				},
			};
		case "veiculo":
			return {
				...base,
				props: {
					campos: campos ?? CAMPOS_VEICULO_OS.map((c) => c.value),
				},
			};
		case "servicoRealizado":
			return base;
		case "itens":
			return base;
		case "personalizado":
			return { ...base, props: { camposPersonalizados: [] } };
		case "rodape":
			return {
				...base,
				props: { texto: "Documento gerado pelo Mais Gestão" },
			};
		default:
			return base;
	}
}

function BlocoSortable({
	bloco,
	selecionado,
	onSelect,
	onRemove,
}: {
	bloco: BlocoModeloImpressaoOs;
	selecionado: boolean;
	onSelect: () => void;
	onRemove: () => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id: bloco.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const coluna = bloco.coluna ?? "cheia";
	const rotuloColuna =
		OPCOES_COLUNA_BLOCO.find((o) => o.value === coluna)?.label ?? "Largura total";
	const qtdCamposPersonalizados =
		bloco.tipo === "personalizado"
			? (bloco.props?.camposPersonalizados?.length ?? 0)
			: 0;

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={`flex items-center gap-2 rounded-md border px-2 py-2 bg-background ${
				selecionado ? "border-primary ring-1 ring-primary" : ""
			}`}
		>
			<button
				type="button"
				className="cursor-grab text-muted-foreground"
				aria-label="Arrastar bloco"
				{...attributes}
				{...listeners}
			>
				<GripVertical className="h-4 w-4" />
			</button>
			<button
				type="button"
				className="flex-1 text-left text-sm"
				onClick={onSelect}
			>
				<span className="block">{LABELS_BLOCO_MODELO_IMPRESSAO_OS[bloco.tipo]}</span>
				<span className="block text-xs text-muted-foreground">
					{bloco.tipo === "personalizado"
						? `${qtdCamposPersonalizados} campo${qtdCamposPersonalizados === 1 ? "" : "s"} · ${rotuloColuna}`
						: rotuloColuna}
				</span>
			</button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="h-7 w-7"
				onClick={onRemove}
			>
				<Trash2 className="h-3.5 w-3.5" />
			</Button>
		</div>
	);
}

type EditorModeloImpressaoOsProps = {
	nome: string;
	descricao: string;
	primario: boolean;
	layout: LayoutModeloImpressaoOs;
	onNomeChange: (v: string) => void;
	onDescricaoChange: (v: string) => void;
	onPrimarioChange: (v: boolean) => void;
	onLayoutChange: (layout: LayoutModeloImpressaoOs) => void;
	somenteLeitura?: boolean;
};

export function EditorModeloImpressaoOs({
	nome,
	descricao,
	primario,
	layout,
	onNomeChange,
	onDescricaoChange,
	onPrimarioChange,
	onLayoutChange,
	somenteLeitura = false,
}: EditorModeloImpressaoOsProps) {
	const [blocoSelecionadoId, setBlocoSelecionadoId] = useState<string | null>(
		null,
	);
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const blocoSelecionado = useMemo(
		() => layout.find((b) => b.id === blocoSelecionadoId) ?? null,
		[layout, blocoSelecionadoId],
	);

	function atualizarBloco(
		id: string,
		patch: Partial<BlocoModeloImpressaoOs>,
	) {
		onLayoutChange(
			layout.map((b) => (b.id === id ? { ...b, ...patch } : b)),
		);
	}

	function onDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (!over || active.id === over.id) return;
		const oldIndex = layout.findIndex((b) => b.id === active.id);
		const newIndex = layout.findIndex((b) => b.id === over.id);
		if (oldIndex < 0 || newIndex < 0) return;
		onLayoutChange(arrayMove(layout, oldIndex, newIndex));
	}

	function toggleCampo(campo: string, lista: string[]) {
		if (!blocoSelecionado) return;
		const atual = blocoSelecionado.props?.campos ?? lista;
		const existe = atual.includes(campo);
		const campos = existe
			? atual.filter((c) => c !== campo)
			: [...atual, campo];
		atualizarBloco(blocoSelecionado.id, {
			props: { ...blocoSelecionado.props, campos },
		});
	}

	return (
		<div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_minmax(280px,360px)]">
			<PaletaBlocosImpressao
				tipos={TIPOS_BLOCO_MODELO_IMPRESSAO_OS}
				labels={LABELS_BLOCO_MODELO_IMPRESSAO_OS}
				camposPorTipo={{
					dadosOs: CAMPOS_DADOS_OS,
					cliente: CAMPOS_CLIENTE_OS,
					veiculo: CAMPOS_VEICULO_OS,
				}}
				criarBloco={criarBloco}
				onAdicionar={(bloco) => {
					onLayoutChange([...layout, bloco]);
					setBlocoSelecionadoId(bloco.id);
				}}
				somenteLeitura={somenteLeitura}
			/>

			{/* Canvas + meta */}
			<div className="space-y-4">
				<div className="rounded-lg border p-4 space-y-3">
					<div className="space-y-1">
						<Label htmlFor="nome-modelo">Nome</Label>
						<Input
							id="nome-modelo"
							value={nome}
							disabled={somenteLeitura}
							onChange={(e) => onNomeChange(e.target.value)}
							placeholder="Nome do modelo"
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="desc-modelo">Descrição</Label>
						<Input
							id="desc-modelo"
							value={descricao}
							disabled={somenteLeitura}
							onChange={(e) => onDescricaoChange(e.target.value)}
							placeholder="Opcional"
						/>
					</div>
					<label className="flex items-center gap-2 text-sm">
						<Checkbox
							checked={primario}
							disabled={somenteLeitura}
							onCheckedChange={(v) => onPrimarioChange(v === true)}
						/>
						Definir como modelo primário
					</label>
				</div>

				<div className="rounded-lg border p-3 space-y-2">
					<p className="text-sm font-medium">Layout</p>
					<p className="text-xs text-muted-foreground">
						Use colunas para colocar blocos lado a lado e caber em uma folha A4.
					</p>
					{layout.length === 0 ? (
						<p className="text-sm text-muted-foreground py-6 text-center">
							Adicione blocos pela paleta à esquerda
						</p>
					) : (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={somenteLeitura ? undefined : onDragEnd}
						>
							<SortableContext
								items={layout.map((b) => b.id)}
								strategy={verticalListSortingStrategy}
							>
								<div className="space-y-2">
									{layout.map((bloco) => (
										<BlocoSortable
											key={bloco.id}
											bloco={bloco}
											selecionado={bloco.id === blocoSelecionadoId}
											onSelect={() => setBlocoSelecionadoId(bloco.id)}
											onRemove={() => {
												if (somenteLeitura) return;
												onLayoutChange(
													layout.filter((b) => b.id !== bloco.id),
												);
												if (blocoSelecionadoId === bloco.id) {
													setBlocoSelecionadoId(null);
												}
											}}
										/>
									))}
								</div>
							</SortableContext>
						</DndContext>
					)}
				</div>

				{blocoSelecionado && !somenteLeitura && (
					<div className="rounded-lg border p-4 space-y-3">
						<p className="text-sm font-medium">
							Propriedades —{" "}
							{LABELS_BLOCO_MODELO_IMPRESSAO_OS[blocoSelecionado.tipo]}
						</p>
						<div className="space-y-1">
							<Label>Coluna no layout</Label>
							<Select
								value={blocoSelecionado.coluna ?? "cheia"}
								onValueChange={(v) =>
									atualizarBloco(blocoSelecionado.id, {
										coluna: v as ColunaBlocoModeloImpressao,
									})
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{OPCOES_COLUNA_BLOCO.map((opcao) => (
										<SelectItem key={opcao.value} value={opcao.value}>
											{opcao.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						{(blocoSelecionado.tipo === "titulo" ||
							blocoSelecionado.tipo === "rodape") && (
							<div className="space-y-1">
								<Label>
									{blocoSelecionado.tipo === "titulo" ? "Título" : "Texto"}
								</Label>
								{blocoSelecionado.tipo === "titulo" ? (
									<Input
										value={blocoSelecionado.props?.titulo ?? ""}
										onChange={(e) =>
											atualizarBloco(blocoSelecionado.id, {
												props: {
													...blocoSelecionado.props,
													titulo: e.target.value,
												},
											})
										}
									/>
								) : (
									<Textarea
										value={blocoSelecionado.props?.texto ?? ""}
										onChange={(e) =>
											atualizarBloco(blocoSelecionado.id, {
												props: {
													...blocoSelecionado.props,
													texto: e.target.value,
												},
											})
										}
									/>
								)}
							</div>
						)}
						{blocoSelecionado.tipo === "textoLivre" && (
							<div className="space-y-1">
								<Label>Texto</Label>
								<Textarea
									rows={4}
									value={blocoSelecionado.props?.texto ?? ""}
									onChange={(e) =>
										atualizarBloco(blocoSelecionado.id, {
											props: {
												...blocoSelecionado.props,
												texto: e.target.value,
											},
										})
									}
								/>
							</div>
						)}
						{blocoSelecionado.tipo === "dadosOs" && (
							<div className="space-y-2">
								{CAMPOS_DADOS_OS.map((campo) => (
									<label
										key={campo.value}
										className="flex items-center gap-2 text-sm"
									>
										<Checkbox
											checked={(
												blocoSelecionado.props?.campos ?? []
											).includes(campo.value)}
											onCheckedChange={() =>
												toggleCampo(
													campo.value,
													CAMPOS_DADOS_OS.map((c) => c.value),
												)
											}
										/>
										{campo.label}
									</label>
								))}
							</div>
						)}
						{blocoSelecionado.tipo === "cliente" && (
							<div className="space-y-2">
								{CAMPOS_CLIENTE_OS.map((campo) => (
									<label
										key={campo.value}
										className="flex items-center gap-2 text-sm"
									>
										<Checkbox
											checked={(
												blocoSelecionado.props?.campos ??
												CAMPOS_CLIENTE_OS_PADRAO
											).includes(campo.value)}
											onCheckedChange={() =>
												toggleCampo(campo.value, [...CAMPOS_CLIENTE_OS_PADRAO])
											}
										/>
										{campo.label}
									</label>
								))}
							</div>
						)}
						{blocoSelecionado.tipo === "veiculo" && (
							<div className="space-y-2">
								{CAMPOS_VEICULO_OS.map((campo) => (
									<label
										key={campo.value}
										className="flex items-center gap-2 text-sm"
									>
										<Checkbox
											checked={(
												blocoSelecionado.props?.campos ?? []
											).includes(campo.value)}
											onCheckedChange={() =>
												toggleCampo(
													campo.value,
													CAMPOS_VEICULO_OS.map((c) => c.value),
												)
											}
										/>
										{campo.label}
									</label>
								))}
							</div>
						)}
						{blocoSelecionado.tipo === "servicoRealizado" && (
							<p className="text-sm text-muted-foreground">
								Lista os serviços da aba Serviço da OS, com o técnico
								responsável na primeira coluna.
							</p>
						)}
						{blocoSelecionado.tipo === "itens" && (
							<p className="text-sm text-muted-foreground">
								Lista apenas os produtos da aba Itens (sem serviços).
							</p>
						)}
						{blocoSelecionado.tipo === "personalizado" && (
							<EditorCamposPersonalizadosOs
								tituloSecao={blocoSelecionado.props?.tituloSecao ?? ""}
								campos={blocoSelecionado.props?.camposPersonalizados ?? []}
								onTituloSecaoChange={(tituloSecao) =>
									atualizarBloco(blocoSelecionado.id, {
										props: {
											...blocoSelecionado.props,
											tituloSecao,
										},
									})
								}
								onCamposChange={(camposPersonalizados) =>
									atualizarBloco(blocoSelecionado.id, {
										props: {
											...blocoSelecionado.props,
											camposPersonalizados,
										},
									})
								}
							/>
						)}
					</div>
				)}
			</div>

			{/* Preview */}
			<div className="rounded-lg border bg-muted/30 p-3 overflow-auto max-h-[80vh]">
				<p className="text-sm font-medium mb-3">Preview (1 folha A4)</p>
				<PreviewModeloImpressaoOs layout={layout} mostrarLimiteFolha />
			</div>
		</div>
	);
}
