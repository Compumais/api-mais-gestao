import type { EmissaoNfeFormData, ItemNfe } from "@mais-gestao/nfe-emissao-shared";
import { create } from "zustand";

const estadoInicial = (): Partial<EmissaoNfeFormData> => ({
	confirmarProducao: false,
	indPres: 1,
	itens: [],
	gerarFinanceiro: true,
	gerarEstoque: true,
	transporte: { modFrete: 9 },
	informarEnderecoEntregaManual: false,
	totais: {},
});

type WizardStore = {
	dados: Partial<EmissaoNfeFormData>;
	crt?: number;
	totaisFiscais?: Record<string, number>;
	setCampo: <K extends keyof EmissaoNfeFormData>(
		key: K,
		value: EmissaoNfeFormData[K],
	) => void;
	patch: (partial: Partial<EmissaoNfeFormData>) => void;
	setItens: (itens: ItemNfe[]) => void;
	addItem: (item: ItemNfe) => void;
	updateItem: (index: number, item: ItemNfe) => void;
	removeItem: (index: number) => void;
	setTributos: (payload: {
		crt: number;
		itens: ItemNfe[];
		totaisFiscais: Record<string, number>;
	}) => void;
	reset: (idempresa: string, idnotafiscal?: string) => void;
};

export const useNfeWizard = create<WizardStore>((set, get) => ({
	dados: estadoInicial(),
	setCampo: (key, value) =>
		set({ dados: { ...get().dados, [key]: value } }),
	patch: (partial) => set({ dados: { ...get().dados, ...partial } }),
	setItens: (itens) => set({ dados: { ...get().dados, itens } }),
	addItem: (item) => {
		const itens = [...(get().dados.itens ?? []), item];
		set({ dados: { ...get().dados, itens } });
	},
	updateItem: (index, item) => {
		const itens = [...(get().dados.itens ?? [])];
		itens[index] = item;
		set({ dados: { ...get().dados, itens } });
	},
	removeItem: (index) => {
		const itens = [...(get().dados.itens ?? [])];
		itens.splice(index, 1);
		set({ dados: { ...get().dados, itens } });
	},
	setTributos: ({ crt, itens, totaisFiscais }) =>
		set({
			crt,
			totaisFiscais,
			dados: { ...get().dados, itens },
		}),
	reset: (idempresa, idnotafiscal) =>
		set({
			crt: undefined,
			totaisFiscais: undefined,
			dados: {
				...estadoInicial(),
				idempresa,
				...(idnotafiscal ? { idnotafiscal } : {}),
			},
		}),
}));
