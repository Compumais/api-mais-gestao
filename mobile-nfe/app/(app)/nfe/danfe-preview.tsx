import { useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

export default function DanfePreviewScreen() {
	const { uri } = useLocalSearchParams<{ uri: string }>();

	if (!uri) {
		return null;
	}

	return (
		<View style={styles.flex}>
			<WebView
				source={{ uri }}
				style={styles.flex}
				originWhitelist={["*"]}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
});
