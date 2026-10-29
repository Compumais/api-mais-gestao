import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
	ActivityIndicator,
	Button,
 FAB,
	List,
	SegmentedButtons,
	Text,
} from "react-native-paper";
import { nfeService } from "@/src/api/services/nfe.service";
import { useEmpresa } from "@/src/contexts/EmpresaContext";
import { formatCurrency, formatDateTime } from "@/src/utils/format";
import { MgColors } from "@/src/theme/colors";

export default function NfeListScreen() {
	const { empresa } = useEmpresa();
	const idempresa = empresa?.id ?? "";
	const [aba, setAba] = useState<"emitidas" | "rascunhos">("emitidas");

	const emitidas = useQuery({
		queryKey: ["nfe-emitidas", idempresa],
		queryFn: () =>
			nfeService.listarEmitidas({ idempresa, page: 1, limit: 50 }),
		enabled: !!idempresa && aba === "emitidas",
	});

	const rascunhos = useQuery({
		queryKey: ["nfe-rascunhos", idempresa],
		queryFn: () =>
			nfeService.listarRascunhos({ idempresa, page: 1, limit: 50 }),
		enabled: !!idempresa && aba === "rascunhos",
	});

	const query = aba === "emitidas" ? emitidas : rascunhos;
	const notas = query.data?.data ?? [];

	return (
		<View style={styles.flex}>
			<SegmentedButtons
				value={aba}
				onValueChange={(v) => setAba(v as "emitidas" | "rascunhos")}
				buttons={[
					{ value: "emitidas", label: "Emitidas" },
					{ value: "rascunhos", label: "Rascunhos" },
				]}
				style={styles.segment}
			/>

			{query.isLoading ? (
				<ActivityIndicator style={{ marginTop: 24 }} color={MgColors.primary} />
			) : (
				<FlatList
					data={notas}
					keyExtractor={(item) => item.id}
					contentContainerStyle={{ paddingBottom: 88 }}
					ListEmptyComponent={
						<Text style={styles.empty}>Nenhuma nota encontrada</Text>
					}
					renderItem={({ item }) => (
						<List.Item
							title={`Nº ${item.numeronotafiscal ?? "—"} / Série ${item.serie ?? "—"}`}
							description={`${item.razaosocial ?? "Sem destinatário"} · ${formatCurrency(item.valortotalnota)} · ${formatDateTime(item.datahoraemissao)}`}
							onPress={() => router.push(`/(app)/nfe/${item.id}`)}
							right={() =>
								aba === "rascunhos" ? (
									<Button
										compact
										onPress={() =>
											router.push({
												pathname: "/(app)/nfe/nova/contexto",
												params: { rascunhoId: item.id },
											})
										}
									>
										Continuar
									</Button>
								) : null
							}
						/>
					)}
				/>
			)}

			<FAB
				icon="plus"
				style={styles.fab}
				onPress={() => router.push("/(app)/nfe/nova/contexto")}
				label="Nova NFe"
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1, backgroundColor: MgColors.background },
	segment: { margin: 12 },
	empty: { textAlign: "center", marginTop: 32, color: MgColors.muted },
	fab: { position: "absolute", right: 16, bottom: 16 },
});
