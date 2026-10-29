import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Button, HelperText, TextInput } from "react-native-paper";
import { entidadesService } from "@/src/api/services/entidades.service";
import { useEmpresa } from "@/src/contexts/EmpresaContext";
import { extrairErroApi } from "@/src/api/client";

export default function NovoClienteScreen() {
	const { empresa } = useEmpresa();
	const idempresa = empresa?.id ?? "";
	const [nome, setNome] = useState("");
	const [cnpjcpf, setCnpjcpf] = useState("");
	const [email, setEmail] = useState("");
	const [telefone, setTelefone] = useState("");
	const [erro, setErro] = useState<string | null>(null);

	const criar = useMutation({
		mutationFn: () =>
			entidadesService.criar({
				idempresa,
				nome,
				cnpjcpf,
				cliente: 1,
				email: email || null,
				telefone: telefone || null,
				indiedest: 9,
			}),
		onSuccess: (c) => router.replace(`/(app)/clientes/${c.id}`),
		onError: (e) => setErro(extrairErroApi(e)),
	});

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
			<TextInput
				label="Telefone"
				value={telefone}
				onChangeText={setTelefone}
				mode="outlined"
				style={styles.field}
			/>
			{erro ? <HelperText type="error">{erro}</HelperText> : null}
			<Button
				mode="contained"
				onPress={() => criar.mutate()}
				loading={criar.isPending}
				disabled={!nome || !cnpjcpf}
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
