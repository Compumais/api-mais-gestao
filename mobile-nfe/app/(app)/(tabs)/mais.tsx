import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Button, List, Text } from "react-native-paper";
import { useAuth } from "@/src/contexts/AuthContext";
import { useEmpresa } from "@/src/contexts/EmpresaContext";
import { MgColors } from "@/src/theme/colors";

export default function MaisScreen() {
	const { profile, signOut } = useAuth();
	const { empresa, limpar } = useEmpresa();

	const trocarEmpresa = async () => {
		await limpar();
		router.replace("/(auth)/empresa");
	};

	const sair = async () => {
		await signOut();
		router.replace("/(auth)/login");
	};

	return (
		<View style={styles.flex}>
			<Text variant="titleMedium" style={styles.block}>
				{profile?.nome}
			</Text>
			<Text variant="bodyMedium" style={styles.email}>
				{profile?.email}
			</Text>
			<List.Section>
				<List.Item
					title="Empresa ativa"
					description={empresa?.nome}
					left={(p) => <List.Icon {...p} icon="domain" />}
				/>
				<List.Item
					title="Trocar empresa"
					onPress={() => void trocarEmpresa()}
					left={(p) => <List.Icon {...p} icon="swap-horizontal" />}
				/>
			</List.Section>
			<Button mode="outlined" onPress={() => void sair()} style={styles.logout}>
				Sair
			</Button>
		</View>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1, backgroundColor: MgColors.background, padding: 16 },
	block: { fontWeight: "700" },
	email: { color: MgColors.muted, marginBottom: 16 },
	logout: { marginTop: 24 },
});
