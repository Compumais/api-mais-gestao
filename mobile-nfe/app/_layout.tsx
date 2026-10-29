import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { PaperProvider, MD3LightTheme } from "react-native-paper";
import { AuthProvider } from "@/src/contexts/AuthContext";
import { EmpresaProvider } from "@/src/contexts/EmpresaContext";
import { MgColors } from "@/src/theme/colors";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: { retry: 1, staleTime: 30_000 },
	},
});

const theme = {
	...MD3LightTheme,
	colors: {
		...MD3LightTheme.colors,
		primary: MgColors.primary,
		background: MgColors.background,
	},
};

export default function RootLayout() {
	return (
		<QueryClientProvider client={queryClient}>
			<PaperProvider theme={theme}>
				<AuthProvider>
					<EmpresaProvider>
						<Stack screenOptions={{ headerShown: false }}>
							<Stack.Screen name="index" />
							<Stack.Screen name="(auth)" />
							<Stack.Screen name="(app)" />
						</Stack>
					</EmpresaProvider>
				</AuthProvider>
			</PaperProvider>
		</QueryClientProvider>
	);
}
