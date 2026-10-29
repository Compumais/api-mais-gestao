import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { ActivityIndicator, Button, HelperText, TextInput } from "react-native-paper";
import { entidadesService } from "@/src/api/services/entidades.service";
import { extrairErroApi } from "@/src/api/client";
import { MgColors } from "@/src/theme/colors";

export default function ClienteDetalheScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { data, isLoading } = useQuery({
		queryKey: ["cliente", id],
		queryFn: () => entidadesService.buscar(id),
	});

	const [nome, setNome] = useState("");
	const [cnpjcpf, setCnpjcpf] = useState("");
	const [email, setEmail] = useState("");
	const [erro, setErro] = useState<string | null>(null);

	useEffect(() => {
		if (data) {
			setNome(data.nome);
			setCnpjcpf(data.cnpjcpf);
			setEmail(data.email ?? "");
		}
	}, [data]);

	const salvar = useMutation({
		mutationFn: () =>
			entidadesService.atualizar(id, {
				nome,
				cnpjcpf,
				email: email || null,
				cliente: 1,
			}),
		onError: (e) => setErro(extrairErroApi(e)),
	});

	if (isLoading || !data) {
		return <ActivityIndicator style={{ marginTop: 32 }} color={MgColors.primary} />;
	}

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<TextInput label="Nome" value={nome} onChangeText={setNome} mode="outlined" />
			<TextInput
				label="CPF/CNPJ"
				value={cnpjcpf}
				onChangeText={setCnpjcpf}
				mode="outlined"
				style={styles.field}
			/>
			<TextInput
				label="E-mail"
				value={email}
				onChangeText={setEmail}
				mode="outlined"
				style={styles.field}
			/>
			{erro ? <HelperText type="error">{erro}</HelperText> : null}
			<Button mode="contained" onPress={() => salvar.mutate()} loading={salvar.isPending}>
				Atualizar
			</Button>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { padding: 16, gap: 8 },
	field: { marginTop: 8 },
});
