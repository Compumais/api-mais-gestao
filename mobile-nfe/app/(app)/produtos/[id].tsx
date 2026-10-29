import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { ActivityIndicator, Button, HelperText, TextInput } from "react-native-paper";
import { produtosService } from "@/src/api/services/produtos.service";
import { extrairErroApi } from "@/src/api/client";
import { MgColors } from "@/src/theme/colors";

export default function ProdutoDetalheScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { data, isLoading } = useQuery({
		queryKey: ["produto", id],
		queryFn: () => produtosService.buscar(id),
	});

	const [nome, setNome] = useState("");
	const [preco, setPreco] = useState("");
	const [ncm, setNcm] = useState("");
	const [erro, setErro] = useState<string | null>(null);

	useEffect(() => {
		if (data) {
			setNome(data.nome);
			setPreco(data.preco ?? "");
			setNcm(data.ncm ?? "");
		}
	}, [data]);

	const salvar = useMutation({
		mutationFn: () =>
			produtosService.atualizar(id, {
				nome,
				preco: preco.replace(",", "."),
				ncm: ncm || null,
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
				label="Preço"
				value={preco}
				onChangeText={setPreco}
				mode="outlined"
				style={styles.field}
			/>
			<TextInput
				label="NCM"
				value={ncm}
				onChangeText={setNcm}
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
