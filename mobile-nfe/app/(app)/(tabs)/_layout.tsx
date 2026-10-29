import { Tabs } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MgColors } from "@/src/theme/colors";

export default function TabLayout() {
	return (
		<Tabs
			screenOptions={{
				headerStyle: { backgroundColor: MgColors.sidebar },
				headerTintColor: "#fff",
				tabBarActiveTintColor: MgColors.primary,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Início",
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons name="view-dashboard" color={String(color)} size={size} />
					),
				}}
			/>
			<Tabs.Screen
				name="nfe"
				options={{
					title: "NFe",
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons name="file-document" color={String(color)} size={size} />
					),
				}}
			/>
			<Tabs.Screen
				name="produtos"
				options={{
					title: "Produtos",
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons name="package-variant" color={String(color)} size={size} />
					),
				}}
			/>
			<Tabs.Screen
				name="clientes"
				options={{
					title: "Clientes",
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons name="account-group" color={String(color)} size={size} />
					),
				}}
			/>
			<Tabs.Screen
				name="mais"
				options={{
					title: "Mais",
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons name="dots-horizontal" color={String(color)} size={size} />
					),
				}}
			/>
		</Tabs>
	);
}
