import { VisualErrorBoundary } from "@/components/error-boundary/visual-error-boundary";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/dashboard-periodo";
import type { TopTituloEntidade } from "@/services/dashboard.service";

function TopTitulosCard({
	titulo,
	descricao,
	colunaNome,
	itens,
}: {
	titulo: string;
	descricao: string;
	colunaNome: string;
	itens: TopTituloEntidade[];
}) {
	return (
		<VisualErrorBoundary>
			<Card>
				<CardHeader>
					<CardTitle>{titulo}</CardTitle>
					<CardDescription>{descricao}</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{colunaNome}</TableHead>
								<TableHead className="text-right">Títulos</TableHead>
								<TableHead className="text-right">Total</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{itens.length === 0 ? (
								<TableRow>
									<TableCell
										colSpan={3}
										className="text-center text-muted-foreground"
									>
										Nenhum título em aberto
									</TableCell>
								</TableRow>
							) : (
								itens.map((item, index) => (
									<TableRow key={`${item.identidade ?? item.nome}-${index}`}>
										<TableCell>{item.nome}</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatNumber(item.quantidade)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatCurrency(item.valor)}
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</VisualErrorBoundary>
	);
}

export function TopTitulosFinanceiros({
	recebimentos,
	pagamentos,
}: {
	recebimentos: TopTituloEntidade[];
	pagamentos: TopTituloEntidade[];
}) {
	return (
		<div className="grid gap-4 lg:grid-cols-2">
			<TopTitulosCard
				titulo="Top Recebimentos"
				descricao="Clientes que mais devem, pelo saldo em aberto"
				colunaNome="Cliente"
				itens={recebimentos}
			/>
			<TopTitulosCard
				titulo="Top Pagamentos"
				descricao="Soma dos títulos a pagar por fornecedor"
				colunaNome="Fornecedor"
				itens={pagamentos}
			/>
		</div>
	);
}
