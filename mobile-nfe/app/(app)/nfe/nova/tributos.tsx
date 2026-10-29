import { calcularTotaisFiscaisEmissaoNfe } from "@mais-gestao/nfe-emissao-shared";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { ActivityIndicator, Button, HelperText, Text, TextInput } from "react-native-paper";
import { nfeService } from "@/src/api/services/nfe.service";
import { extrairErroApi } from "@/src/api/client";
import { useNfeWizard } from "@/src/features/nfe-emissao/wizard-store";
import { formatCurrency } from "@/src/utils/format";
import { MgColors } from "@/src/theme/colors";

export default function NfeTributosScreen() {
	const { dados, patch, setTributos, totaisFiscais, crt } = useNfeWizard();
	const [busy, setBusy] = useState(false);
	const [erro, setErro] = useState<string | null>(null);
	const [infoAdicional, setInfoAdicional] = useState(
		dados.informacoesAdicionais ?? "",
	);

	const desconto = String(dados.totais?.desconto ?? 0);
	const frete = String(dados.totais?.frete ?? 0);

	const previewLocal =
		dados.itens && dados.itens.length > 0
			? calcularTotaisFiscaisEmissaoNfe(crt ?? 1, dados.itens, dados.totais ?? {})
			: null;

	const calcular = async () => {
		if (!dados.idempresa || !dados.itens?.length) return;
		setBusy(true);
		setErro(null);
		try {
			const res = await nfeService.calcularTributos({
				idempresa: dados.idempresa,
				itens: dados.itens,
				totais: dados.totais,
			});
			setTributos({
				crt: res.crt,
				itens: res.itens,
				totaisFiscais: res.totaisFiscais,
			});
			const obs = await nfeService.calcularObservacoes({
				idempresa: dados.idempresa,
				itens: res.itens,
				informacoesAdicionais: infoAdicional,
				localEntrega: dados.localEntrega,
			});
			if (obs.informacoesAdicionais) {
				setInfoAdicional(obs.informacoesAdicionais);
				patch({ informacoesAdicionais: obs.informacoesAdicionais });
			}
		} catch (e) {
			setErro(extrairErroApi(e));
		} finally {
			setBusy(false);
		}
	};

	const totais = totaisFiscais ?? previewLocal;

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<TextInput
				label="Desconto global"
				value={desconto}
				keyboardType="decimal-pad"
				mode="outlined"
				onChangeText={(t) =>
					patch({
						totais: {
							...dados.totais,
							desconto: Number.parseFloat(t) || 0,
						},
					})
				}
			/>
			<TextInput
				label="Frete"
				value={frete}
				keyboardType="decimal-pad"
				mode="outlined"
				style={styles.field}
				onChangeText={(t) =>
					patch({
						totais: {
							...dados.totais,
							frete: Number.parseFloat(t) || 0,
						},
					})
				}
			/>
			<TextInput
				label="Informações adicionais"
				value={infoAdicional}
				mode="outlined"
				multiline
				style={styles.field}
				onChangeText={(t) => {
					setInfoAdicional(t);
					patch({ informacoesAdicionais: t });
				}}
			/>

			<Button mode="outlined" onPress={() => void calcular()} loading={busy}>
				Calcular tributos (SEFAZ)
			</Button>

			{totais ? (
				<>
					<Text style={styles.resumo}>Produtos: {formatCurrency(totais.totalProdutos)}</Text>
					<Text style={styles.resumo}>ICMS: {formatCurrency(totais.valorIcms)}</Text>
					<Text style={styles.resumo}>IPI: {formatCurrency(totais.valorIpi)}</Text>
					<Text style={styles.total}>Total NF: {formatCurrency(totais.totalNota)}</Text>
				</>
			) : null}

			{erro ? <HelperText type="error">{erro}</HelperText> : null}

			<Button
				mode="contained"
				style={styles.field}
				onPress={() => router.push("/(app)/nfe/nova/pagamento")}
			>
				Próximo
			</Button>
			{busy ? <ActivityIndicator color={MgColors.primary} /> : null}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { padding: 16, gap: 8 },
	field: { marginTop: 8 },
	resumo: { color: MgColors.muted },
	total: { fontWeight: "700", fontSize: 16, marginTop: 8 },
});
