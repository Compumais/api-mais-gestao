import { Stack } from "expo-router";
import { MgColors } from "@/src/theme/colors";

export default function NfeNovaLayout() {
	return (
		<Stack
			screenOptions={{
				headerStyle: { backgroundColor: MgColors.sidebar },
				headerTintColor: "#fff",
			}}
		>
			<Stack.Screen name="contexto" options={{ title: "1. Contexto" }} />
			<Stack.Screen name="destinatario" options={{ title: "2. Destinatário" }} />
			<Stack.Screen name="itens" options={{ title: "3. Itens" }} />
			<Stack.Screen name="tributos" options={{ title: "4. Tributos" }} />
			<Stack.Screen name="pagamento" options={{ title: "5. Pagamento" }} />
			<Stack.Screen name="transporte" options={{ title: "6. Transporte" }} />
			<Stack.Screen name="revisao" options={{ title: "7. Revisão" }} />
		</Stack>
	);
}
