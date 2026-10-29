import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Button, Menu, Switch, Text } from "react-native-paper";
import { useNfeWizard } from "@/src/features/nfe-emissao/wizard-store";

const FORMAS = [
	{ code: "01", label: "01 — Dinheiro" },
	{ code: "03", label: "03 — Cartão crédito" },
	{ code: "04", label: "04 — Cartão débito" },
	{ code: "17", label: "17 — PIX" },
	{ code: "90", label: "90 — Sem pagamento" },
];

export default function NfePagamentoScreen() {
	const { dados, patch } = useNfeWizard();
	const [forma, setForma] = useState("01");
	const [menu, setMenu] = useState(false);

	const formaLabel = FORMAS.find((f) => f.code === forma)?.label ?? forma;

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Menu
				visible={menu}
				onDismiss={() => setMenu(false)}
				anchor={
					<Button mode="outlined" onPress={() => setMenu(true)}>
						{formaLabel}
					</Button>
				}
			>
				{FORMAS.map((f) => (
					<Menu.Item
						key={f.code}
						title={f.label}
						onPress={() => {
							setForma(f.code);
							setMenu(false);
						}}
					/>
				))}
			</Menu>

			<Text style={styles.switchRow}>
				Gerar financeiro
				<Switch
					value={dados.gerarFinanceiro ?? true}
					onValueChange={(v) => patch({ gerarFinanceiro: v })}
				/>
			</Text>
			<Text style={styles.switchRow}>
				Gerar estoque
				<Switch
					value={dados.gerarEstoque ?? true}
					onValueChange={(v) => patch({ gerarEstoque: v })}
				/>
			</Text>

			<Button
				mode="contained"
				onPress={() => {
					patch({ formaPagamentoCodigo: forma } as never);
					router.push("/(app)/nfe/nova/transporte");
				}}
			>
				Próximo
			</Button>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { padding: 16, gap: 16 },
	switchRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
});
