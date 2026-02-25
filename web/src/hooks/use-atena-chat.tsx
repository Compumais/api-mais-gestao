"use client";

import * as React from "react";

interface MensagemChat {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
}

interface AtenaChatContextType {
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
	mensagens: MensagemChat[];
	adicionarMensagem: (role: "user" | "assistant", content: string) => void;
	limparMensagens: () => void;
}

const AtenaChatContext = React.createContext<AtenaChatContextType | undefined>(undefined);

export function AtenaChatProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isOpen, setIsOpen] = React.useState(false);
	const [mensagens, setMensagens] = React.useState<MensagemChat[]>([]);

	const adicionarMensagem = React.useCallback(
		(role: "user" | "assistant", content: string) => {
			const novaMensagem: MensagemChat = {
				id: crypto.randomUUID(),
				role,
				content,
				timestamp: new Date(),
			};
			setMensagens((prev) => [...prev, novaMensagem]);
		},
		[],
	);

	const limparMensagens = React.useCallback(() => {
		setMensagens([]);
	}, []);

	return (
		<AtenaChatContext.Provider
			value={{
				isOpen,
				setIsOpen,
				mensagens,
				adicionarMensagem,
				limparMensagens,
			}}
		>
			{children}
		</AtenaChatContext.Provider>
	);
}

export function useAtenaChat() {
	const context = React.useContext(AtenaChatContext);
	if (context === undefined) {
		throw new Error("useAtenaChat deve ser usado dentro de AtenaChatProvider");
	}
	return context;
}


