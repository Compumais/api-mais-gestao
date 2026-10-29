import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/src/contexts/AuthContext";
import { useEmpresa } from "@/src/contexts/EmpresaContext";
import { MgColors } from "@/src/theme/colors";

export default function Index() {
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

	return <Redirect href="/(app)/(tabs)" />;
}
