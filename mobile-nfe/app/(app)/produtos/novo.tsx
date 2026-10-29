import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Button, HelperText, Menu, TextInput } from "react-native-paper";
import { produtosService } from "@/src/api/services/produtos.service";
import { useEmpresa } from "@/src/contexts/EmpresaContext";
import { extrairErroApi } from "@/src/api/client";

export default function NovoProdutoScreen() {
	const { empresa } = useEmpresa();
	const idempresa = empresa?.id ?? "";

	const unidades = useQuery({
		queryKey: ["unidades", idempresa],
		queryFn: () => produtosService.listarUnidades(idempresa),
		enabled: !!idempresa,
	});

	const codigoQuery = useQuery({
		queryKey: ["produto-proximo-codigo", idempresa],
		queryFn: () => produtosService.proximoCodigo(idempresa),
		enabled: !!idempresa,
	});

	const [nome, setNome] = useState("");
	const [preco, setPreco] = useState("");
	const [ncm, setNcm] = useState("");
	const [idunidade, setIdunidade] = useState<string | null>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const [erro, setErro] = useState<string | null>(null);

	const criar = useMutation({
		mutationFn: () =>
			produtosService.criar({
				idempresa,
				codigo: codigoQuery.data ?? 1,
				nome,
				preco: preco.replace(",", "."),
				idunidademedida: idunidade,
				ncm: ncm || null,
				tipo: "P",
			}),
		onSuccess: (p) => {
			router.replace(`/(app)/produtos/${p.id}`);
		},
		onError: (e) => setErro(extrairErroApi(e)),
	});

	const unidadeLabel =
		unidades.data?.find((u) => u.id === idunidade)?.descricao ??
		"Selecione a unidade";

	return (
		<ScrollView contentContainerStyle={styles.container}>
			<TextInput label="Nome" value={nome} onChangeText={setNome} mode="outlined" />
			<TextInput
				label="Preço"
				value={preco}
				onChangeText={setPreco}
				keyboardType="decimal-pad"
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
			<Menu
				visible={menuOpen}
				onDismiss={() => setMenuOpen(false)}
				anchor={
					<Button mode="outlined" onPress={() => setMenuOpen(true)} style={styles.field}>
						{unidadeLabel}
					</Button>
				}
			>
				{(unidades.data ?? []).map((u) => (
					<Menu.Item
						key={u.id}
						title={`${u.codigo} — ${u.descricao}`}
						onPress={() => {
							setIdunidade(u.id);
							setMenuOpen(false);
						}}
					/>
				))}
			</Menu>
			{erro ? <HelperText type="error">{erro}</HelperText> : null}
			<Button
				mode="contained"
				onPress={() => criar.mutate()}
				loading={criar.isPending}
				disabled={!nome || !idunidade || !preco}
			>
				Salvar
			</Button>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: { padding: 16, gap: 8 },
	field: { marginTop: 8 },
});
