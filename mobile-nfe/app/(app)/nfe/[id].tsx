import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
	ActivityIndicator,
	Button,
	HelperText,
	Text,
	TextInput,
} from "react-native-paper";
import * as FileSystem from "expo-file-system/legacy";
import { nfeService } from "@/src/api/services/nfe.service";
import {
	extrairErroApi,
	getApiUrl,
	getSessionToken,
} from "@/src/api/client";
import { formatCurrency, formatDateTime } from "@/src/utils/format";
import { MgColors } from "@/src/theme/colors";

export default function NfeDetalheScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const qc = useQueryClient();
	const [justificativa, setJustificativa] = useState("");
	const [erro, setErro] = useState<string | null>(null);
	const [msg, setMsg] = useState<string | null>(null);

	const { data, isLoading } = useQuery({
		queryKey: ["nfe-nota", id],
		queryFn: () => nfeService.buscarNota(id),
	});

	const transmitir = useMutation({
		mutationFn: (confirmarProducao: boolean) =>
			nfeService.transmitir(id, confirmarProducao),
		onSuccess: () => {
			setMsg("Transmissão solicitada");
			void qc.invalidateQueries({ queryKey: ["nfe-nota", id] });
		},
		onError: (e) => setErro(extrairErroApi(e)),
	});

	const cancelar = useMutation({
		mutationFn: () => nfeService.cancelar(id, justificativa),
		onSuccess: () => {
			setMsg("Cancelamento registrado");
			void qc.invalidateQueries({ queryKey: ["nfe-nota", id] });
		},
		onError: (e) => setErro(extrairErroApi(e)),
	});

	const inutilizar = useMutation({
		mutationFn: () => nfeService.inutilizar(id, justificativa),
		onSuccess: () => {
			setMsg("Inutilização registrada");
			void qc.invalidateQueries({ queryKey: ["nfe-nota", id] });
		},
		onError: (e) => setErro(extrairErroApi(e)),
	});

	const abrirDanfe = async () => {
		try {
			setErro(null);
			const baseUrl = await getApiUrl();
			const token = await getSessionToken();
			const path = `${FileSystem.cacheDirectory}danfe-${id}.pdf`;
			const result = await FileSystem.downloadAsync(
				`${baseUrl}/notas-fiscais/${id}/danfe`,
				path,
				{
					headers: token ? { Authorization: `Bearer ${token}` } : {},
				},
			);
			router.push({
				pathname: "/(app)/nfe/danfe-preview",
				params: { uri: result.uri },
			});
		} catch (e) {
			setErro(extrairErroApi(e));
		}
	};

	if (isLoading || !data) {
		return <ActivityIndicator style={{ marginTop: 32 }} color={MgColors.primary} />;
	}

	const nota = data.notaFiscal;
	const ambiente =
		nota.tipoambientenfe === 1 ? "Produção" : "Homologação";

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Text variant="titleMedium">
				NFe {nota.numeronotafiscal ?? "—"} · {ambiente}
			</Text>
			<Text style={styles.meta}>
				{nota.razaosocial} · {formatCurrency(nota.valortotalnota)}
			</Text>
			<Text style={styles.meta}>{formatDateTime(nota.datahoraemissao)}</Text>
			{nota.chavenfe ? (
				<Text selectable style={styles.chave}>
					Chave: {nota.chavenfe}
				</Text>
			) : null}
			{nota.mensagemtransmissaonfe ? (
				<Text style={styles.meta}>{nota.mensagemtransmissaonfe}</Text>
			) : null}

			<View style={styles.actions}>
				<Button mode="contained" onPress={() => void abrirDanfe()}>
					Ver DANFE
				</Button>
				<Button
					mode="outlined"
					onPress={() => transmitir.mutate(false)}
					loading={transmitir.isPending}
				>
					Transmitir
				</Button>
				<Button
					mode="outlined"
					onPress={() => transmitir.mutate(true)}
					loading={transmitir.isPending}
				>
					Transmitir (confirmar produção)
				</Button>
			</View>

			<TextInput
				label="Justificativa (cancelar/inutilizar)"
				value={justificativa}
				onChangeText={setJustificativa}
				mode="outlined"
				multiline
				style={styles.field}
			/>
			<Button
				mode="outlined"
				textColor={MgColors.danger}
				onPress={() => cancelar.mutate()}
				disabled={justificativa.length < 15}
			>
				Cancelar NFe
			</Button>
			<Button
				mode="outlined"
				onPress={() => inutilizar.mutate()}
				disabled={justificativa.length < 15}
				style={styles.field}
			>
				Inutilizar numeração
			</Button>

			{msg ? <HelperText type="info">{msg}</HelperText> : null}
			{erro ? <HelperText type="error">{erro}</HelperText> : null}

			<Text variant="labelLarge" style={styles.itensTitle}>
				Itens ({data.itens.length})
			</Text>
			{data.itens.map((item, idx) => (
				<Text key={String(item.id ?? idx)} style={styles.itemLine}>
					{String(item.descricao ?? item.nome ?? "Item")} · qtd{" "}
					{String(item.quantidade ?? "—")}
				</Text>
			))}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { padding: 16, gap: 8, paddingBottom: 40 },
	meta: { color: MgColors.muted },
	chave: { fontSize: 12, marginTop: 8 },
	actions: { gap: 8, marginVertical: 12 },
	field: { marginTop: 8 },
	itensTitle: { marginTop: 16 },
	itemLine: { fontSize: 13, color: MgColors.muted },
});
