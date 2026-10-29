import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Button, Switch, Text, TextInput } from "react-native-paper";
import { useNfeWizard } from "@/src/features/nfe-emissao/wizard-store";

export default function NfeTransporteScreen() {
	const { dados, patch } = useNfeWizard();
	const [modFrete, setModFrete] = useState(
		String(dados.transporte?.modFrete ?? 9),
	);
	const [chaveRef, setChaveRef] = useState(
		dados.documentoReferenciado?.chaveNfe ?? "",
	);

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<TextInput
				label="Modalidade frete (modFrete)"
				value={modFrete}
				keyboardType="number-pad"
				mode="outlined"
				onChangeText={(t) => {
					setModFrete(t);
					patch({
						transporte: { modFrete: Number.parseInt(t, 10) || 9 },
					});
				}}
			/>
			<TextInput
				label="Chave NFe referenciada (devolução)"
				value={chaveRef}
				mode="outlined"
				onChangeText={(t) => {
					setChaveRef(t);
					patch({
						documentoReferenciado: t
							? { chaveNfe: t.replace(/\D/g, "") }
							: undefined,
					});
				}}
			/>
			<Text style={styles.switchRow}>
				Endereço entrega manual
				<Switch
					value={dados.informarEnderecoEntregaManual ?? false}
					onValueChange={(v) =>
						patch({ informarEnderecoEntregaManual: v })
					}
				/>
			</Text>

			<Button mode="contained" onPress={() => router.push("/(app)/nfe/nova/revisao")}>
				Revisar e emitir
			</Button>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { padding: 16, gap: 12 },
	switchRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
});
