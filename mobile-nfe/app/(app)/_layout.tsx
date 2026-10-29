import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/src/contexts/AuthContext";
import { useEmpresa } from "@/src/contexts/EmpresaContext";
import { MgColors } from "@/src/theme/colors";

export default function AppLayout() {
	const { loading: authLoading, profile } = useAuth();
	const { loading: empresaLoading, empresa } = useEmpresa();

	if (authLoading || empresaLoading) {
		return (
			<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
				<ActivityIndicator color={MgColors.primary} size="large" />
			</View>
		);
	}

	if (!profile) {
		return <Redirect href="/(auth)/login" />;
	}

	if (!empresa) {
		return <Redirect href="/(auth)/empresa" />;
	}

	return (
		<Stack>
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			<Stack.Screen name="produtos/novo" options={{ title: "Novo produto" }} />
			<Stack.Screen name="produtos/[id]" options={{ title: "Produto" }} />
			<Stack.Screen name="clientes/novo" options={{ title: "Novo cliente" }} />
			<Stack.Screen name="clientes/[id]" options={{ title: "Cliente" }} />
			<Stack.Screen name="nfe/[id]" options={{ title: "Nota fiscal" }} />
			<Stack.Screen name="nfe/nova" options={{ headerShown: false }} />
			<Stack.Screen name="nfe/danfe-preview" options={{ title: "DANFE" }} />
		</Stack>
	);
}
