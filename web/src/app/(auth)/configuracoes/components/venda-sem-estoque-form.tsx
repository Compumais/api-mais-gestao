"use client";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	useConfiguracaoPdv,
	useSalvarConfiguracaoPdv,
} from "@/hooks/use-configuracao-pdv";

type VendaSemEstoqueFormProps = {
	idempresa: string;
};

export function VendaSemEstoqueForm({ idempresa }: VendaSemEstoqueFormProps) {
	const { data, isLoading } = useConfiguracaoPdv(idempresa);
	const salvar = useSalvarConfiguracaoPdv();
	const habilitada = data?.venda_sem_estoque === "1";

	return (
		<Card>
			<CardHeader>
				<CardTitle>Venda sem estoque</CardTitle>
				<CardDescription>
					Quando habilitada, PDV, gourmet e garçom vendem mesmo com saldo zero
					ou negativo. A baixa de estoque continua e o saldo pode ficar
					negativo.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex items-center gap-3">
					<Switch
						id="venda-sem-estoque"
						checked={habilitada}
						disabled={isLoading || salvar.isPending}
						onCheckedChange={(checked) =>
							salvar.mutate({
								idempresa,
								dados: { venda_sem_estoque: checked ? "1" : "0" },
							})
						}
					/>
					<Label htmlFor="venda-sem-estoque">Permitir venda sem estoque</Label>
				</div>
			</CardContent>
		</Card>
	);
}
