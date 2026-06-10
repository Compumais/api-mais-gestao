"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useEmpresa } from "@/hooks/use-empresa";
import { useContaContabil } from "@/hooks/use-conta-contabil";
import { PageContainer } from "../components/page-container";

export default function ContaContabilPage() {
	const router = useRouter();
	const { localStorageEmpresa } = useEmpresa();
	const [descricao, setDescricao] = useState("");
	const [page, setPage] = useState(1);

	const { data, isLoading } = useContaContabil({
		idempresa: localStorageEmpresa?.id,
		descricao: descricao || undefined,
		page,
		limit: 10,
	});

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const isInputFocused =
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement ||
				event.target instanceof HTMLSelectElement;

			if (isInputFocused) return;

			if (event.key === "F2") {
				event.preventDefault();
				router.push("/conta-contabil/novo");
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [router]);

	const naturezaLabel = (natureza: string | null) => {
		if (natureza === "D") return "Devedora";
		if (natureza === "C") return "Credora";
		return "-";
	};

	const tipoLabel = (tipo: string | null) => {
		if (tipo === "S") return "Sintética";
		if (tipo === "A") return "Analítica";
		return "-";
	};

	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				<div className="flex items-center justify-between p-4">
					<h1 className="text-2xl font-bold">Contas Contábeis</h1>

					<Button asChild>
						<Link href="/conta-contabil/novo">
							<PlusIcon className="h-4 w-4" />
							Incluir (F2)
						</Link>
					</Button>
				</div>

				<div className="rounded-lg border bg-card p-4 mx-4">
					<div className="mb-4">
						<Input
							placeholder="Buscar por descrição..."
							value={descricao}
							onChange={(e) => {
								setDescricao(e.target.value);
								setPage(1);
							}}
						/>
					</div>

					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
						</div>
					) : (
						<>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Código Reduzido</TableHead>
										<TableHead>Descrição</TableHead>
										<TableHead>Natureza</TableHead>
										<TableHead>Tipo</TableHead>
										<TableHead>Nível</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data?.data && data.data.length > 0 ? (
										data.data.map((conta) => (
											<TableRow
												key={conta.id}
												className="cursor-pointer hover:bg-muted/50"
												onClick={() =>
													router.push(`/conta-contabil/${conta.id}`)
												}
											>
												<TableCell>{conta.codigoreduzido ?? "-"}</TableCell>
												<TableCell>{conta.descricao}</TableCell>
												<TableCell>{naturezaLabel(conta.natureza)}</TableCell>
												<TableCell>
													{tipoLabel(conta.tipocontacontabil)}
												</TableCell>
												<TableCell>{conta.nivelconta ?? "-"}</TableCell>
											</TableRow>
										))
									) : (
										<TableRow>
											<TableCell colSpan={5} className="text-center py-8">
												Nenhuma conta contábil encontrada
											</TableCell>
										</TableRow>
									)}
								</TableBody>
							</Table>

							{data?.paginacao && data.paginacao.totalPages > 1 && (
								<div className="flex items-center justify-between mt-4">
									<p className="text-sm text-muted-foreground">
										Página {data.paginacao.page} de {data.paginacao.totalPages}{" "}
										({data.paginacao.total} registros)
									</p>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											disabled={page <= 1}
											onClick={() => setPage((p) => p - 1)}
										>
											Anterior
										</Button>
										<Button
											variant="outline"
											size="sm"
											disabled={page >= data.paginacao.totalPages}
											onClick={() => setPage((p) => p + 1)}
										>
											Próxima
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</PageContainer>
	);
}
