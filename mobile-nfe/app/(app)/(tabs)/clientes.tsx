import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, FAB, List, Searchbar, Text } from "react-native-paper";
import { entidadesService } from "@/src/api/services/entidades.service";
import { useEmpresa } from "@/src/contexts/EmpresaContext";
import { MgColors } from "@/src/theme/colors";

export default function ClientesScreen() {
	const { empresa } = useEmpresa();
	const idempresa = empresa?.id ?? "";
	const [q, setQ] = useState("");

	const { data, isLoading, refetch, isFetching } = useQuery({
		queryKey: ["clientes", idempresa, q],
		queryFn: () =>
			entidadesService.listar({
				idempresa,
				cliente: 1,
				page: 1,
				limit: 50,
				q: q || undefined,
			}),
		enabled: !!idempresa,
	});

	const clientes = data?.data ?? [];

	return (
		<View style={styles.flex}>
			<Searchbar
				placeholder="Buscar cliente"
				value={q}
				onChangeText={setQ}
				style={styles.search}
				onSubmitEditing={() => void refetch()}
			/>
			{isLoading ? (
				<ActivityIndicator style={{ marginTop: 24 }} color={MgColors.primary} />
			) : (
				<FlatList
					data={clientes}
					keyExtractor={(item) => item.id}
					refreshing={isFetching}
					onRefresh={() => void refetch()}
					contentContainerStyle={{ paddingBottom: 88 }}
					ListEmptyComponent={
						<Text style={styles.empty}>Nenhum cliente</Text>
					}
					renderItem={({ item }) => (
						<List.Item
							title={item.nome}
							description={item.cnpjcpf}
							onPress={() => router.push(`/(app)/clientes/${item.id}`)}
						/>
					)}
				/>
			)}
			<FAB
				icon="plus"
				style={styles.fab}
				onPress={() => router.push("/(app)/clientes/novo")}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1, backgroundColor: MgColors.background },
	search: { margin: 12 },
	empty: { textAlign: "center", marginTop: 32, color: MgColors.muted },
	fab: { position: "absolute", right: 16, bottom: 16 },
});
