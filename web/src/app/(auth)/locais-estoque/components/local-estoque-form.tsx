"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useEmpresa } from "@/hooks/use-empresa";
import {
	type CriarLocalEstoqueForm,
	criarLocalEstoqueSchema,
} from "@/schemas/local-estoque.schema";
import {
	type LocalEstoque,
	localEstoqueService,
} from "@/services/local-estoque.service";

type LocalEstoqueFormProps = {
	modo: "criar" | "editar";
	localId?: string;
	valoresIniciais?: Partial<LocalEstoque>;
};

export function LocalEstoqueForm({
	modo,
	localId,
	valoresIniciais,
}: LocalEstoqueFormProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { idempresa } = useEmpresa();

	const form = useForm<CriarLocalEstoqueForm>({
		resolver: zodResolver(criarLocalEstoqueSchema),
		defaultValues: {
			idempresa: valoresIniciais?.idempresa ?? idempresa ?? "",
			codigo: valoresIniciais?.codigo ?? "",
			descricao: valoresIniciais?.descricao ?? "",
			posse: valoresIniciais?.posse ?? "P",
			tipo: valoresIniciais?.tipo ?? 0,
			inativo: valoresIniciais?.inativo ?? 0,
			padrao: valoresIniciais?.padrao ?? 0,
		},
	});

	const criarMutation = useMutation({
		mutationFn: (dados: CriarLocalEstoqueForm) =>
			localEstoqueService.criar({
				...dados,
				idempresa: dados.idempresa || idempresa || "",
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["locais-estoque"] });
			toast.success("Local de estoque criado com sucesso!");
			router.push("/locais-estoque");
		},
		onError: (err: unknown) => {
			const msg =
				err &&
				typeof err === "object" &&
				"response" in err &&
				err.response &&
				typeof err.response === "object" &&
				"data" in err.response &&
				err.response.data &&
				typeof err.response.data === "object" &&
				"error" in err.response.data
					? String(err.response.data.error)
					: "Erro ao criar local de estoque";
			toast.error(msg);
		},
	});

	const atualizarMutation = useMutation({
		mutationFn: (dados: CriarLocalEstoqueForm) =>
			localEstoqueService.atualizar(localId as string, dados),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["locais-estoque"] });
			toast.success("Local de estoque atualizado com sucesso!");
			router.push("/locais-estoque");
		},
		onError: (err: unknown) => {
			const msg =
				err &&
				typeof err === "object" &&
				"response" in err &&
				err.response &&
				typeof err.response === "object" &&
				"data" in err.response &&
				err.response.data &&
				typeof err.response.data === "object" &&
				"error" in err.response.data
					? String(err.response.data.error)
					: "Erro ao atualizar local de estoque";
			toast.error(msg);
		},
	});

	function onSubmit(dados: CriarLocalEstoqueForm) {
		if (!dados.descricao?.trim() && !dados.codigo?.trim()) {
			toast.error("Informe ao menos o código ou a descrição do local de estoque");
			return;
		}
		if (modo === "criar") {
			criarMutation.mutate({
				...dados,
				idempresa: dados.idempresa || idempresa || "",
			});
		} else {
			atualizarMutation.mutate(dados);
		}
	}

	const isLoading = criarMutation.isPending || atualizarMutation.isPending;

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
					<FormField
						control={form.control}
						name="codigo"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Código</FormLabel>
								<FormControl>
									<Input
										placeholder="Ex: EST-01"
										maxLength={15}
										{...field}
										value={field.value ?? ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="descricao"
						render={({ field }) => (
							<FormItem className="md:col-span-2">
								<FormLabel>Descrição *</FormLabel>
								<FormControl>
									<Input
										placeholder="Ex: Estoque Principal, Depósito, Loja..."
										maxLength={30}
										{...field}
										value={field.value ?? ""}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="posse"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Posse</FormLabel>
								<Select
									onValueChange={(value) => field.onChange(value)}
									value={field.value ?? "P"}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Selecione" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="P">Próprio</SelectItem>
										<SelectItem value="T">De terceiros</SelectItem>
										<SelectItem value="E">Em terceiros</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="inativo"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Situação</FormLabel>
								<Select
									onValueChange={(value) => field.onChange(Number(value))}
									value={String(field.value ?? 0)}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Selecione" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="0">Ativo</SelectItem>
										<SelectItem value="1">Inativo</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="padrao"
						render={({ field }) => (
							<FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4 md:col-span-3">
								<FormControl>
									<Checkbox
										checked={field.value === 1}
										onCheckedChange={(checked) =>
											field.onChange(checked ? 1 : 0)
										}
									/>
								</FormControl>
								<div className="space-y-1 leading-none">
									<FormLabel>Definir como local de estoque padrão</FormLabel>
									<FormDescription>
										Será utilizado automaticamente como padrão no cadastro de
										produtos, notas fiscais de compra e movimentações de estoque
										da empresa.
									</FormDescription>
								</div>
							</FormItem>
						)}
					/>
				</div>

				<div className="flex gap-2">
					<Button type="submit" disabled={isLoading}>
						{isLoading ? "Salvando..." : "Salvar"}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => router.push("/locais-estoque")}
					>
						Cancelar
					</Button>
				</div>
			</form>
		</Form>
	);
}
