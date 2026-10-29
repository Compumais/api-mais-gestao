import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, List, Text } from "react-native-paper";
import { empresasService } from "@/src/api/services/empresas.service";
import { useEmpresa } from "@/src/contexts/EmpresaContext";
import { MgColors } from "@/src/theme/colors";

export default function EmpresaScreen() {
	const { selecionar } = useEmpresa();
	const { data, isLoading, error } = useQuery({
		queryKey: ["empresas"],
		queryFn: () => empresasService.listar(),
	});

	if (isLoading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator color={MgColors.primary} />
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.center}>
				<Text>Erro ao carregar empresas</Text>
			</View>
		);
	}

	const empresas = data?.data ?? [];

	return (
		<View style={styles.flex}>
			<Text variant="titleMedium" style={styles.title}>
				Selecione a empresa
			</Text>
			<FlatList
				data={empresas}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<List.Item
						title={item.nome}
						description={item.cnpj ?? undefined}
						onPress={async () => {
							await selecionar({ id: item.id, nome: item.nome });
							router.replace("/(app)/(tabs)");
						}}
						left={(props) => <List.Icon {...props} icon="domain" />}
					/>
				)}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1, backgroundColor: MgColors.background },
	center: { flex: 1, justifyContent: "center", alignItems: "center" },
	title: { padding: 16, fontWeight: "600" },
});
