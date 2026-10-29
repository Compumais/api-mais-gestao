import type { ItemNfe } from "@mais-gestao/nfe-emissao-shared";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Modal, StyleSheet, View } from "react-native";
import {
	Button,
	IconButton,
	List,
	Searchbar,
	Text,
	TextInput,
} from "react-native-paper";
import { produtosService } from "@/src/api/services/produtos.service";
import { useEmpresa } from "@/src/contexts/EmpresaContext";
import { mapearProdutoParaItem } from "@/src/features/nfe-emissao/mapear-produto";
import { useNfeWizard } from "@/src/features/nfe-emissao/wizard-store";
import { formatCurrency } from "@/src/utils/format";

export default function NfeItensScreen() {
	const { empresa } = useEmpresa();
	const idempresa = empresa?.id ?? "";
	const { dados, addItem, removeItem, updateItem } = useNfeWizard();
	const [q, setQ] = useState("");
	const [editIndex, setEditIndex] = useState<number | null>(null);
	const [editItem, setEditItem] = useState<ItemNfe | null>(null);

	const produtos = useQuery({
		queryKey: ["produtos-wizard", idempresa, q],
		queryFn: () =>
			produtosService.listar({ idempresa, limit: 40, q: q || undefined }),
		enabled: !!idempresa,
	});

	const itens = dados.itens ?? [];

	const abrirEdicao = (index: number) => {
		setEditIndex(index);
		setEditItem({ ...itens[index] });
	};

	const salvarEdicao = () => {
		if (editIndex == null || !editItem) return;
		updateItem(editIndex, editItem);
		setEditIndex(null);
		setEditItem(null);
	};

	return (
		<View style={styles.flex}>
			<Text variant="titleSmall" style={styles.section}>
				Itens da nota ({itens.length})
			</Text>
			<FlatList
				data={itens}
				keyExtractor={(_, i) => String(i)}
				ListEmptyComponent={<Text style={styles.empty}>Adicione produtos abaixo</Text>}
				renderItem={({ item, index }) => (
					<List.Item
						title={item.descricao}
						description={`${item.quantidade} × ${formatCurrency(item.valorUnitario)} · CFOP ${item.cfop}`}
						onPress={() => abrirEdicao(index)}
						right={() => (
							<IconButton icon="delete" onPress={() => removeItem(index)} />
						)}
					/>
				)}
			/>

			<Searchbar placeholder="Buscar produto" value={q} onChangeText={setQ} />
			<FlatList
				data={produtos.data?.data ?? []}
				keyExtractor={(item) => item.id}
				style={styles.catalogo}
				renderItem={({ item }) => (
					<List.Item
						title={item.nome}
						description={formatCurrency(item.preco)}
						onPress={() => addItem(mapearProdutoParaItem(item))}
						right={() => <List.Icon icon="plus" />}
					/>
				)}
			/>

			<Button
				mode="contained"
				style={styles.next}
				disabled={itens.length === 0}
				onPress={() => router.push("/(app)/nfe/nova/tributos")}
			>
				Próximo
			</Button>

			<Modal visible={editIndex != null} animationType="slide">
				<View style={styles.modal}>
					<Text variant="titleMedium">Editar item</Text>
					{editItem ? (
						<>
							<TextInput
								label="Quantidade"
								value={String(editItem.quantidade)}
								keyboardType="decimal-pad"
								mode="outlined"
								onChangeText={(t) =>
									setEditItem({
										...editItem,
										quantidade: Number.parseFloat(t) || 1,
									})
								}
							/>
							<TextInput
								label="Valor unitário"
								value={String(editItem.valorUnitario)}
								keyboardType="decimal-pad"
								mode="outlined"
								onChangeText={(t) =>
									setEditItem({
										...editItem,
										valorUnitario: Number.parseFloat(t) || 0,
									})
								}
							/>
							<TextInput
								label="CFOP"
								value={editItem.cfop}
								mode="outlined"
								onChangeText={(t) =>
									setEditItem({ ...editItem, cfop: t })
								}
							/>
							<TextInput
								label="Desconto"
								value={String(editItem.desconto ?? 0)}
								keyboardType="decimal-pad"
								mode="outlined"
								onChangeText={(t) =>
									setEditItem({
										...editItem,
										desconto: Number.parseFloat(t) || 0,
									})
								}
							/>
						</>
					) : null}
					<Button mode="contained" onPress={salvarEdicao}>
						OK
					</Button>
					<Button onPress={() => setEditIndex(null)}>Cancelar</Button>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	section: { paddingHorizontal: 16, paddingTop: 8 },
	empty: { padding: 16, textAlign: "center" },
	catalogo: { maxHeight: 220 },
	next: { margin: 16 },
	modal: { flex: 1, padding: 16, gap: 8, justifyContent: "center" },
});
