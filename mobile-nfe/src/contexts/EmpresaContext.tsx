import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from "react";
import {
	getEmpresaId,
	setEmpresaSelecionada as persistEmpresa,
} from "@/src/api/client";
import { STORAGE_EMPRESA } from "@/src/constants/storage";

export type EmpresaSelecionada = { id: string; nome: string };

type EmpresaState = {
	loading: boolean;
	empresa: EmpresaSelecionada | null;
	selecionar: (empresa: EmpresaSelecionada) => Promise<void>;
	limpar: () => Promise<void>;
};

const EmpresaContext = createContext<EmpresaState | null>(null);

export function EmpresaProvider({ children }: { children: ReactNode }) {
	const [loading, setLoading] = useState(true);
	const [empresa, setEmpresa] = useState<EmpresaSelecionada | null>(null);

	useEffect(() => {
		(async () => {
			try {
				const id = await getEmpresaId();
				if (!id) return;
				const raw = await AsyncStorage.getItem(STORAGE_EMPRESA);
				if (raw) {
					const parsed = JSON.parse(raw) as EmpresaSelecionada;
					setEmpresa(parsed);
				}
			} finally {
				setLoading(false);
			}
		})();
	}, []);

	const selecionar = useCallback(async (e: EmpresaSelecionada) => {
		await persistEmpresa(e);
		setEmpresa(e);
	}, []);

	const limpar = useCallback(async () => {
		await AsyncStorage.removeItem(STORAGE_EMPRESA);
		setEmpresa(null);
	}, []);

	const value = useMemo(
		() => ({ loading, empresa, selecionar, limpar }),
		[loading, empresa, selecionar, limpar],
	);

	return (
		<EmpresaContext.Provider value={value}>{children}</EmpresaContext.Provider>
	);
}

export function useEmpresa() {
	const ctx = useContext(EmpresaContext);
	if (!ctx) throw new Error("useEmpresa fora do EmpresaProvider");
	return ctx;
}
