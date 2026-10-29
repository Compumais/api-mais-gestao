import {
	ID_DEST_NFE_LABELS,
	OPCOES_IND_PRES_NFE,
	type IdDestNfe,
	type IndPresNfe,
} from "@mais-gestao/nfe-emissao-shared";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { ActivityIndicator, Banner, Button, Menu, TextInput } from "react-native-paper";
import { nfeService } from "@/src/api/services/nfe.service";
import { useEmpresa } from "@/src/contexts/EmpresaContext";
import { useNfeWizard } from "@/src/features/nfe-emissao/wizard-store";
import { MgColors } from "@/src/theme/colors";

export default function NfeContextoScreen() {
	const { empresa } = useEmpresa();
	const idempresa = empresa?.id ?? "";
	const { rascunhoId } = useLocalSearchParams<{ rascunhoId?: string }>();
	const { dados, patch, reset } = useNfeWizard();

	const config = useQuery({
		queryKey: ["nfe-config", idempresa],
		queryFn: () => nfeService.buscarConfiguracao(idempresa),
		enabled: !!idempresa,
	});

	const series = useQuery({
		queryKey: ["nfe-series", idempresa, config.data?.ambiente],
		queryFn: () =>
			nfeService.listarSeries(idempresa, config.data?.ambiente),
		enabled: !!idempresa && config.data != null,
	});

	const [natOp, setNatOp] = useState(dados.natOp ?? "Venda de mercadoria");
	const [idserienfe, setIdserienfe] = useState(dados.idserienfe ?? "");
	const [indPres, setIndPres] = useState(String(dados.indPres ?? 1));
	const [idDest, setIdDest] = useState(String(dados.idDest ?? 1));
	const [serieMenu, setSerieMenu] = useState(false);
	const [indPresMenu, setIndPresMenu] = useState(false);

	useEffect(() => {
		reset(idempresa, rascunhoId);
	}, [idempresa, rascunhoId, reset]);

	useEffect(() => {
		if (!idserienfe && config.data?.ultimaidserie) {
			setIdserienfe(config.data.ultimaidserie);
		}
	}, [config.data?.ultimaidserie, idserienfe]);

	const serieLabel =
		series.data?.find((s) => s.id === idserienfe)?.numero ?? "Série NFe";

	const indPresLabel =
		OPCOES_IND_PRES_NFE.find((o) => o.value === indPres)?.label ??
		"Presença";

	if (config.isLoading) {
		return <ActivityIndicator style={{ marginTop: 32 }} color={MgColors.primary} />;
	}

	const ambienteLabel = config.data?.ambiente === 1 ? "Produção" : "Homologação";

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<Banner visible icon="information">
				Ambiente SEFAZ: {ambienteLabel}
			</Banner>

			<TextInput
				label="Natureza da operação"
				value={natOp}
				onChangeText={setNatOp}
				mode="outlined"
			/>

			<Menu
				visible={serieMenu}
				onDismiss={() => setSerieMenu(false)}
				anchor={
					<Button mode="outlined" onPress={() => setSerieMenu(true)} style={styles.field}>
						Série: {serieLabel}
					</Button>
				}
			>
				{(series.data ?? []).map((s) => (
					<Menu.Item
						key={s.id}
						title={`${s.numero} (${s.ambiente === 1 ? "Prod" : "Hom"})`}
						onPress={() => {
							setIdserienfe(s.id);
							setSerieMenu(false);
						}}
					/>
				))}
			</Menu>

			<Menu
				visible={indPresMenu}
				onDismiss={() => setIndPresMenu(false)}
				anchor={
					<Button mode="outlined" onPress={() => setIndPresMenu(true)} style={styles.field}>
						{indPresLabel}
					</Button>
				}
			>
				{OPCOES_IND_PRES_NFE.map((o) => (
					<Menu.Item
						key={o.value}
						title={o.label}
						onPress={() => {
							setIndPres(o.value);
							setIndPresMenu(false);
						}}
					/>
				))}
			</Menu>

			<Button
				mode="outlined"
				style={styles.field}
				onPress={() =>
					setIdDest(String(Number(idDest) === 1 ? 2 : 1))
				}
			>
				Destino: {ID_DEST_NFE_LABELS[Number(idDest)] ?? idDest}
			</Button>

			<Button
				mode="contained"
				onPress={() => {
					patch({
						idempresa,
						idnotafiscal: rascunhoId,
						natOp,
						idserienfe: idserienfe || undefined,
						indPres: Number(indPres) as IndPresNfe,
						idDest: Number(idDest) as IdDestNfe,
					});
					router.push("/(app)/nfe/nova/destinatario");
				}}
			>
				Próximo
			</Button>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { padding: 16, gap: 8 },
	field: { marginTop: 8 },
});
