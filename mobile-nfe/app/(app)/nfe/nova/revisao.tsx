import { montarPagamentoEmissaoNfe } from "@mais-gestao/nfe-emissao-shared";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import {
	ActivityIndicator,
	Button,
	HelperText,
	Switch,
	Text,
} from "react-native-paper";
import * as FileSystem from "expo-file-system/legacy";
import { nfeService } from "@/src/api/services/nfe.service";
import { extrairErroApi } from "@/src/api/client";
import { arrayBufferToBase64 } from "@/src/utils/base64";
import { montarPayloadEmissao } from "@/src/features/nfe-emissao/montar-payload";
import { useNfeWizard } from "@/src/features/nfe-emissao/wizard-store";
import { formatCurrency } from "@/src/utils/format";
import { MgColors } from "@/src/theme/colors";

export default function NfeRevisaoScreen() {
	const qc = useQueryClient();
	const { dados, totaisFiscais } = useNfeWizard();
	const [confirmarProducao, setConfirmarProducao] = useState(false);
	const [busy, setBusy] = useState<string | null>(null);
	const [erro, setErro] = useState<string | null>(null);
	const [resultado, setResultado] = useState<string | null>(null);

	const forma =
		(dados as { formaPagamentoCodigo?: string }).formaPagamentoCodigo ?? "01";

	const buildPayload = () => {
		const pagamento = montarPagamentoEmissaoNfe(
			forma,
			totaisFiscais?.totalNota ?? 0,
		);
		return montarPayloadEmissao(
			{
				...dados,
				confirmarProducao,
				pagamento,
			},
			totaisFiscais,
			forma,
		);
	};

	const salvarRascunho = async () => {
		setBusy("rascunho");
		setErro(null);
		try {
			const payload = buildPayload();
			const res = await nfeService.salvarRascunho(payload);
			setResultado(`Rascunho salvo: ${res.idnotafiscal}`);
			void qc.invalidateQueries({ queryKey: ["nfe-rascunhos"] });
		} catch (e) {
			setErro(extrairErroApi(e));
		} finally {
			setBusy(null);
		}
	};

	const emitir = async () => {
		setBusy("emitir");
		setErro(null);
		try {
			const payload = buildPayload();
			const res = await nfeService.emitir(payload);
			setResultado(
				`Nota ${res.idnotafiscal}${res.chave ? ` · Chave ${res.chave}` : ""}`,
			);
			void qc.invalidateQueries({ queryKey: ["nfe-emitidas"] });
			router.replace(`/(app)/nfe/${res.idnotafiscal}`);
		} catch (e) {
			setErro(extrairErroApi(e));
		} finally {
			setBusy(null);
		}
	};

	const previewDanfe = async () => {
		setBusy("preview");
		setErro(null);
		try {
			const payload = buildPayload();
			const buffer = await nfeService.previewDanfe(payload);
			const base64 = arrayBufferToBase64(buffer as ArrayBuffer);
			const path = `${FileSystem.cacheDirectory}preview-danfe.pdf`;
			await FileSystem.writeAsStringAsync(path, base64, {
				encoding: FileSystem.EncodingType.Base64,
			});
			router.push({
				pathname: "/(app)/nfe/danfe-preview",
				params: { uri: path },
			});
		} catch (e) {
			setErro(extrairErroApi(e));
		} finally {
			setBusy(null);
		}
	};

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text variant="titleMedium">Revisão</Text>
			<Text>Itens: {dados.itens?.length ?? 0}</Text>
			<Text>Total: {formatCurrency(totaisFiscais?.totalNota)}</Text>
			<Text style={styles.switchRow}>
				Confirmar produção
				<Switch value={confirmarProducao} onValueChange={setConfirmarProducao} />
			</Text>

			<Button mode="outlined" onPress={() => void previewDanfe()} loading={busy === "preview"}>
				Preview DANFE
			</Button>
			<Button mode="outlined" onPress={() => void salvarRascunho()} loading={busy === "rascunho"}>
				Salvar rascunho
			</Button>
			<Button mode="contained" onPress={() => void emitir()} loading={busy === "emitir"}>
				Emitir NFe
			</Button>

			{resultado ? <HelperText type="info">{resultado}</HelperText> : null}
			{erro ? <HelperText type="error">{erro}</HelperText> : null}
			{busy ? <ActivityIndicator color={MgColors.primary} /> : null}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { padding: 16, gap: 12, paddingBottom: 40 },
	switchRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginVertical: 8,
	},
});
