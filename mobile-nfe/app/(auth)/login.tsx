import { router } from "expo-router";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, HelperText, Text, TextInput } from "react-native-paper";
import { getApiUrl, setApiUrl } from "@/src/api/client";
import { formatAuthError, useAuth } from "@/src/contexts/AuthContext";
import { MgColors } from "@/src/theme/colors";

export default function LoginScreen() {
	const { signIn } = useAuth();
	const [apiUrl, setApiUrlState] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [busy, setBusy] = useState(false);
	const [erro, setErro] = useState<string | null>(null);

	useEffect(() => {
		void getApiUrl().then(setApiUrlState);
	}, []);

	const entrar = async () => {
		setBusy(true);
		setErro(null);
		try {
			if (apiUrl.trim()) {
				await setApiUrl(apiUrl);
			}
			await signIn(email.trim(), password);
			router.replace("/(auth)/empresa");
		} catch (e) {
			setErro(formatAuthError(e));
		} finally {
			setBusy(false);
		}
	};

	return (
		<KeyboardAvoidingView
			style={styles.flex}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<ScrollView contentContainerStyle={styles.container}>
				<View style={styles.hero}>
					<Text variant="headlineMedium" style={styles.heroTitle}>
						Mais Gestão NFe
					</Text>
					<Text variant="bodyMedium" style={styles.heroSub}>
						Emissão e consulta de notas pela API web
					</Text>
				</View>

				<TextInput
					label="URL da API"
					value={apiUrl}
					onChangeText={setApiUrlState}
					autoCapitalize="none"
					mode="outlined"
					placeholder="https://sua-api.exemplo.com"
				/>
				<TextInput
					label="E-mail"
					value={email}
					onChangeText={setEmail}
					keyboardType="email-address"
					autoCapitalize="none"
					mode="outlined"
					style={styles.field}
				/>
				<TextInput
					label="Senha"
					value={password}
					onChangeText={setPassword}
					secureTextEntry
					mode="outlined"
					style={styles.field}
				/>
				{erro ? <HelperText type="error">{erro}</HelperText> : null}
				<Button mode="contained" onPress={entrar} loading={busy} disabled={busy}>
					Entrar
				</Button>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1, backgroundColor: MgColors.surface },
	container: { padding: 20, gap: 8 },
	hero: {
		backgroundColor: MgColors.sidebar,
		marginHorizontal: -20,
		marginBottom: 16,
		padding: 24,
	},
	heroTitle: { color: "#fff", fontWeight: "700" },
	heroSub: { color: "#B8C7D9", marginTop: 8 },
	field: { marginTop: 8 },
});
