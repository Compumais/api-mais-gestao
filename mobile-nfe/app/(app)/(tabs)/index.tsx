import { useQuery } from "@tanstack/react-query";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { dashboardService } from "@/src/api/services/dashboard.service";
import { useEmpresa } from "@/src/contexts/EmpresaContext";
import { formatCurrency } from "@/src/utils/format";
import { MgColors } from "@/src/theme/colors";

function KpiCard({ label, value }: { label: string; value: string }) {
	return (
		<Card style={styles.card}>
			<Card.Content>
				<Text variant="labelMedium">{label}</Text>
				<Text variant="titleLarge" style={styles.kpiValue}>
					{value}
				</Text>
			</Card.Content>
		</Card>
	);
}

export default function DashboardScreen() {
	const { empresa } = useEmpresa();
	const idempresa = empresa?.id ?? "";

	const resumo = useQuery({
		queryKey: ["dashboard", idempresa],
		queryFn: () => dashboardService.buscarResumo(idempresa),
		enabled: !!idempresa,
	});

	const executivo = useQuery({
		queryKey: ["dashboard-executivo", idempresa],
		queryFn: () => dashboardService.buscarExecutivo(idempresa),
		enabled: !!idempresa,
	});

	const refreshing = resumo.isFetching || executivo.isFetching;

	return (
		<ScrollView
			style={styles.flex}
			contentContainerStyle={styles.content}
			refreshControl={
				<RefreshControl
					refreshing={refreshing}
					onRefresh={() => {
						void resumo.refetch();
						void executivo.refetch();
					}}
				/>
			}
		>
			<Text variant="titleMedium" style={styles.empresa}>
				{empresa?.nome}
			</Text>

			<Text variant="labelLarge" style={styles.section}>
				Financeiro
			</Text>
			<View style={styles.row}>
				<KpiCard
					label="Contas a receber"
					value={formatCurrency(resumo.data?.totalContasReceber)}
				/>
				<KpiCard
					label="Contas a pagar"
					value={formatCurrency(resumo.data?.totalContasPagar)}
				/>
			</View>
			<View style={styles.row}>
				<KpiCard
					label="Saldo caixa"
					value={formatCurrency(resumo.data?.saldoCaixa)}
				/>
				<KpiCard
					label="Saldo bancário"
					value={formatCurrency(resumo.data?.saldoBancario)}
				/>
			</View>

			{executivo.data ? (
				<>
					<Text variant="labelLarge" style={styles.section}>
						Executivo (mês)
					</Text>
					<KpiCard
						label="Faturamento"
						value={formatCurrency(executivo.data.faturamento.valor)}
					/>
					<KpiCard
						label="Lucro líquido"
						value={formatCurrency(executivo.data.lucroLiquido.valor)}
					/>
					<KpiCard
						label="Ticket médio"
						value={formatCurrency(executivo.data.vendas.ticketMedio)}
					/>
				</>
			) : null}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1, backgroundColor: MgColors.surface },
	content: { padding: 16, gap: 8, paddingBottom: 32 },
	empresa: { fontWeight: "700", marginBottom: 8 },
	section: { marginTop: 12, color: MgColors.muted },
	row: { flexDirection: "row", gap: 8 },
	card: { flex: 1, marginBottom: 8 },
	kpiValue: { fontWeight: "700", marginTop: 4 },
});
