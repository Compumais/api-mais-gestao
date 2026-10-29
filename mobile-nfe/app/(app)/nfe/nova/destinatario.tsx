import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Button, List, Searchbar, Text } from "react-native-paper";
import { entidadesService } from "@/src/api/services/entidades.service";
import { useEmpresa } from "@/src/contexts/EmpresaContext";
import { useNfeWizard } from "@/src/features/nfe-emissao/wizard-store";

export default function NfeDestinatarioScreen() {
	const { empresa } = useEmpresa();
	const idempresa = empresa?.id ?? "";
	const { dados, patch } = useNfeWizard();
	const [q, setQ] = useState("");

	const { data } = useQuery({
		queryKey: ["clientes-wizard", idempresa, q],
		queryFn: () =>
			entidadesService.listar({
				idempresa,
				cliente: 1,
				limit: 30,
				q: q || undefined,
			}),
		enabled: !!idempresa,
	});

	const selecionado = dados.iddestinatario;

	return (
		<View style={styles.flex}>
			<Searchbar placeholder="Buscar cliente" value={q} onChangeText={setQ} />
			<FlatList
				data={data?.data ?? []}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<List.Item
						title={item.nome}
						description={item.cnpjcpf}
						onPress={() => patch({ iddestinatario: item.id })}
						right={() =>
							selecionado === item.id ? (
								<Text style={styles.ok}>✓</Text>
							) : null
						}
					/>
				)}
			/>
			<Button
				mode="contained"
				style={styles.next}
				disabled={!selecionado}
				onPress={() => router.push("/(app)/nfe/nova/itens")}
			>
				Próximo
			</Button>
		</View>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	ok: { alignSelf: "center", fontSize: 18 },
	next: { margin: 16 },
});
