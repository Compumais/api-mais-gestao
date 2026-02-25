"use client";

import { IconSend, IconSparkles, IconX } from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAtenaChat } from "@/hooks/use-atena-chat";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { cn } from "@/lib/utils";
import { iaService } from "@/services/ia.service";

export function AtenaChatWindow() {
	const { isOpen, setIsOpen, mensagens, adicionarMensagem } = useAtenaChat();
	const { localStorageEmpresa } = useEmpresa();
	const { user } = useAuth();
	const [mensagemAtual, setMensagemAtual] = useState("");
	const mensagensEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const prevMensagensLengthRef = useRef(mensagens.length);

	const chatMutation = useMutation({
		mutationFn: async (mensagem: string) => {
			const historico = mensagens.map((msg) => ({
				role: msg.role,
				content: msg.content,
			}));

			return iaService.enviarMensagem({
				mensagem,
				idempresa: localStorageEmpresa?.id,
				historico: historico.length > 0 ? historico : undefined,
			});
		},
		onSuccess: (data) => {
			adicionarMensagem("assistant", data.resposta);
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao enviar mensagem");
		},
	});

	const handleEnviar = () => {
		if (!mensagemAtual.trim() || chatMutation.isPending) return;

		const mensagem = mensagemAtual.trim();
		setMensagemAtual("");
		adicionarMensagem("user", mensagem);
		chatMutation.mutate(mensagem);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleEnviar();
		}
	};

	const userInitials = user?.nome
		?.replace(/[^a-zA-ZÀ-ÿ\s]/g, "")
		.trim()
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0])
		.join("")
		.toUpperCase();

	// Scroll para última mensagem quando novas mensagens forem adicionadas
	useLayoutEffect(() => {
		if (mensagens.length !== prevMensagensLengthRef.current) {
			mensagensEndRef.current?.scrollIntoView({ behavior: "smooth" });
			prevMensagensLengthRef.current = mensagens.length;
		}
	});

	// Focar input quando chat abrir
	useEffect(() => {
		if (isOpen && inputRef.current) {
			setTimeout(() => {
				inputRef.current?.focus();
			}, 100);
		}
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div className="fixed bottom-24 right-6 z-50 flex h-[480px] w-[380px] flex-col rounded-lg border bg-card shadow-2xl">
			{/* Header */}
			<div className="flex items-center justify-between border-b px-4 py-2">
				<div className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
						<IconSparkles className="h-5 w-5 text-primary" />
					</div>
					<div>
						<h3 className="font-semibold">Atena</h3>
						<p className="text-xs text-muted-foreground">
							Sua assistente financeira virtual
						</p>
					</div>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="h-8 w-8"
					onClick={() => setIsOpen(false)}
					aria-label="Fechar chat"
				>
					<IconX className="h-4 w-4" />
				</Button>
			</div>

			{/* Área de mensagens */}
			<div className="flex-1 overflow-y-auto p-4">
				{mensagens.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center text-center">
						<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
							<IconSparkles className="h-8 w-8 text-primary" />
						</div>
						<h4 className="mb-2 font-semibold">Olá! Eu sou a Atena</h4>
						<p className="text-sm text-muted-foreground">
							Estou aqui para ajudá-lo a entender melhor os dados do seu
							dashboard financeiro. Como posso ajudá-lo hoje?
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{mensagens.map((mensagem) => (
							<div
								key={mensagem.id}
								className={cn(
									"flex gap-2",
									mensagem.role === "user" ? "justify-end" : "justify-start",
								)}
							>
								{mensagem.role === "assistant" && (
									<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
										<IconSparkles className="h-4 w-4 text-primary" />
									</div>
								)}
								<div
									className={cn(
										"max-w-[80%] rounded-lg px-4 py-2",
										mensagem.role === "user"
											? "bg-primary text-primary-foreground"
											: "bg-muted",
									)}
								>
									<p className="text-sm whitespace-pre-wrap">
										{mensagem.content}
									</p>
									<p
										className={cn(
											"mt-1 text-xs",
											mensagem.role === "user"
												? "text-primary-foreground/70"
												: "text-muted-foreground",
										)}
									>
										{format(mensagem.timestamp, "HH:mm", { locale: ptBR })}
									</p>
								</div>
								{mensagem.role === "user" && (
									<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
										<span className="text-xs font-semibold">
											{mensagem.role === "user" ? userInitials : "A"}
										</span>
									</div>
								)}
							</div>
						))}
						{chatMutation.isPending && (
							<div className="flex gap-2 justify-start">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
									<IconSparkles className="h-4 w-4 text-primary" />
								</div>
								<div className="rounded-lg bg-muted px-4 py-2">
									<div className="flex gap-1">
										<div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
										<div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
										<div className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
									</div>
								</div>
							</div>
						)}
						<div ref={mensagensEndRef} />
					</div>
				)}
			</div>

			{/* Input */}
			<div className="border-t p-4">
				<div className="flex gap-2">
					<Input
						ref={inputRef}
						value={mensagemAtual}
						onChange={(e) => setMensagemAtual(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Digite sua mensagem..."
						disabled={chatMutation.isPending}
						className="flex-1"
					/>
					<Button
						onClick={handleEnviar}
						disabled={!mensagemAtual.trim() || chatMutation.isPending}
						size="icon"
					>
						<IconSend className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
