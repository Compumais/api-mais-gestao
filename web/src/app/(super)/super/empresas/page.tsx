"use client";

import { IconLayoutGrid, IconList } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useEmpresa } from "@/hooks/use-empresa";
import { marcarAcessoBaseAtivo } from "@/lib/acesso-base";
import { setSessionToken } from "@/lib/auth-token";
import { acessoBaseService } from "@/services/acesso-base.service";
import { type AdminEmpresa, adminService } from "@/services/admin.service";
import { DialogEntitlementProprietario } from "../components/dialog-entitlement-proprietario";

type ModoVisualizacao = "cards" | "tabela";

function rotuloPlano(empresa: AdminEmpresa) {
	return empresa.planoNome ?? empresa.planoCodigo ?? "Sem plano";
}

function rotuloProprietario(empresa: AdminEmpresa) {
	if (empresa.proprietarioNome && empresa.proprietarioEmail) {
		return `${empresa.proprietarioNome} · ${empresa.proprietarioEmail}`;
	}
	return empresa.proprietarioNome ?? empresa.proprietarioEmail ?? "—";
}

export default function SuperEmpresasPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { selecionarEmpresa } = useEmpresa();
	const [modo, setModo] = useState<ModoVisualizacao>("cards");
	const [busca, setBusca] = useState("");
	const [empresaEntitlement, setEmpresaEntitlement] =
		useState<AdminEmpresa | null>(null);
	const [empresaAcessandoId, setEmpresaAcessandoId] = useState<string | null>(
		null,
	);

	const { mutate: acessarBase } = useMutation({
		mutationFn: (empresa: AdminEmpresa) => acessoBaseService.acessar(empresa.id),
		onMutate: (empresa) => {
			setEmpresaAcessandoId(empresa.id);
		},
		onSuccess: (resposta) => {
			setSessionToken(resposta.token);
			marcarAcessoBaseAtivo();
			selecionarEmpresa(resposta.empresa);
			queryClient.clear();
			router.push("/dashboard");
		},
		onError: (erro: Error) => {
			toast.error("Não foi possível acessar a base", {
				description: erro.message,
			});
			setEmpresaAcessandoId(null);
		},
	});

	const { data, isLoading } = useQuery({
		queryKey: ["admin-empresas"],
		queryFn: adminService.listarEmpresas,
	});

	const empresasFiltradas = useMemo(() => {
		const empresas = data?.empresas ?? [];
		const termo = busca.trim().toLowerCase();
		if (!termo) return empresas;
		return empresas.filter((empresa) => {
			const nome = empresa.nome?.toLowerCase() ?? "";
			const cnpj = empresa.cnpj?.toLowerCase() ?? "";
			return nome.includes(termo) || cnpj.includes(termo);
		});
	}, [busca, data?.empresas]);

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold">Empresas</h1>
					<p className="text-muted-foreground">
						Listagem das empresas da plataforma e atalho para plano/módulos do
						proprietário
					</p>
				</div>
				<ToggleGroup
					type="single"
					variant="outline"
					value={modo}
					onValueChange={(value) => {
						if (value === "cards" || value === "tabela") setModo(value);
					}}
					aria-label="Modo de visualização"
				>
					<ToggleGroupItem value="cards" aria-label="Cards">
						<IconLayoutGrid className="size-4" />
					</ToggleGroupItem>
					<ToggleGroupItem value="tabela" aria-label="Tabela">
						<IconList className="size-4" />
					</ToggleGroupItem>
				</ToggleGroup>
			</div>

			<Input
				placeholder="Buscar por nome ou CNPJ..."
				value={busca}
				onChange={(e) => setBusca(e.target.value)}
				className="max-w-md"
			/>

			{isLoading ? (
				<p>Carregando...</p>
			) : empresasFiltradas.length === 0 ? (
				<p className="text-muted-foreground">Nenhuma empresa encontrada.</p>
			) : modo === "tabela" ? (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nome</TableHead>
							<TableHead>CNPJ</TableHead>
							<TableHead>Proprietário</TableHead>
							<TableHead>Plano</TableHead>
							<TableHead className="text-right">Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{empresasFiltradas.map((empresa) => (
							<TableRow key={empresa.id}>
								<TableCell className="font-medium">{empresa.nome}</TableCell>
								<TableCell>{empresa.cnpj || "—"}</TableCell>
								<TableCell>
									<div className="flex flex-col">
										<span>{empresa.proprietarioNome ?? "—"}</span>
										{empresa.proprietarioEmail && (
											<span className="text-xs text-muted-foreground">
												{empresa.proprietarioEmail}
											</span>
										)}
									</div>
								</TableCell>
								<TableCell>{rotuloPlano(empresa)}</TableCell>
								<TableCell className="text-right">
									<div className="flex justify-end gap-2">
										<Button
											size="sm"
											disabled={empresaAcessandoId === empresa.id}
											onClick={() => acessarBase(empresa)}
										>
											{empresaAcessandoId === empresa.id
												? "Acessando..."
												: "Acessar base"}
										</Button>
										<Button
											size="sm"
											variant="outline"
											disabled={!empresa.idproprietario}
											onClick={() => setEmpresaEntitlement(empresa)}
										>
											Plano e módulos
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{empresasFiltradas.map((empresa) => (
						<Card key={empresa.id}>
							<CardHeader>
								<CardTitle className="text-base">{empresa.nome}</CardTitle>
								<p className="text-sm text-muted-foreground">
									{empresa.cnpj || "Sem CNPJ"}
								</p>
							</CardHeader>
							<CardContent className="space-y-2 text-sm">
								<div>
									<p className="text-muted-foreground">Proprietário</p>
									<p>{rotuloProprietario(empresa)}</p>
								</div>
								<div>
									<p className="text-muted-foreground">Plano</p>
									<p>{rotuloPlano(empresa)}</p>
								</div>
							</CardContent>
							<CardFooter className="flex flex-col gap-2">
								<Button
									size="sm"
									className="w-full"
									disabled={empresaAcessandoId === empresa.id}
									onClick={() => acessarBase(empresa)}
								>
									{empresaAcessandoId === empresa.id
										? "Acessando..."
										: "Acessar base"}
								</Button>
								<Button
									size="sm"
									variant="outline"
									className="w-full"
									disabled={!empresa.idproprietario}
									onClick={() => setEmpresaEntitlement(empresa)}
								>
									Plano e módulos
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			)}

			<DialogEntitlementProprietario
				userId={empresaEntitlement?.idproprietario ?? null}
				open={!!empresaEntitlement}
				onOpenChange={(open) => {
					if (!open) setEmpresaEntitlement(null);
				}}
				tituloNome={
					empresaEntitlement?.proprietarioNome ?? empresaEntitlement?.nome
				}
			/>
		</div>
	);
}
