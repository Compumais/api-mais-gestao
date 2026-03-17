"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { BellIcon, CheckIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Notificacao } from "@/services/notificacoes.service";
import {
	type ListarNotificacoesParams,
	notificacoesService,
} from "@/services/notificacoes.service";

const NOTIFICACOES_COUNT_KEY = ["notificacoes", "nao-lidas", "count"] as const;
const NOTIFICACOES_LIST_KEY = ["notificacoes", "list"] as const;

function useNotificacoesCount() {
	return useQuery({
		queryKey: NOTIFICACOES_COUNT_KEY,
		queryFn: () => notificacoesService.contarNaoLidas(),
		refetchInterval: 60_000,
	});
}

function useNotificacoesList(params?: ListarNotificacoesParams) {
	return useQuery({
		queryKey: [...NOTIFICACOES_LIST_KEY, params ?? {}],
		queryFn: () => notificacoesService.listar({ limit: 15, ...params }),
		enabled: false,
	});
}

export function NotificationsBell() {
	const queryClient = useQueryClient();
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [modalNotificacao, setModalNotificacao] = useState<Notificacao | null>(
		null,
	);
	const prevCountRef = useRef<number | null>(null);

	const { data: count = 0 } = useNotificacoesCount();
	const {
		data: listData,
		isLoading: listLoading,
		refetch: refetchList,
	} = useNotificacoesList();

	const marcarComoLidaMutation = useMutation({
		mutationFn: (id: string) => notificacoesService.marcarComoLida(id),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: NOTIFICACOES_COUNT_KEY });
			queryClient.invalidateQueries({ queryKey: NOTIFICACOES_LIST_KEY });
		},
	});

	// Pedir permissão para notificação nativa ao abrir o dropdown
	useEffect(() => {
		if (
			dropdownOpen &&
			typeof window !== "undefined" &&
			"Notification" in window
		) {
			if (Notification.permission === "default") {
				Notification.requestPermission();
			}
		}
	}, [dropdownOpen]);

	// Mostrar notificação nativa quando o número de não lidas aumentar
	useEffect(() => {
		if (typeof window === "undefined" || !("Notification" in window)) return;
		if (Notification.permission !== "granted") return;
		if (prevCountRef.current === null) {
			prevCountRef.current = count;
			return;
		}
		if (count > prevCountRef.current) {
			const n = count - prevCountRef.current;
			new Notification("Mais Gestão", {
				body:
					n === 1
						? "Você tem 1 notificação não lida."
						: `Você tem ${n} notificações não lidas.`,
			});
		}
		prevCountRef.current = count;
	}, [count]);

	const handleOpenChange = useCallback(
		(open: boolean) => {
			setDropdownOpen(open);
			if (open) refetchList();
		},
		[refetchList],
	);

	const handleClickNotificacao = useCallback((notificacao: Notificacao) => {
		setModalNotificacao(notificacao);
		setDropdownOpen(false);
	}, []);

	const handleMarcarLido = useCallback(
		(e: React.MouseEvent, id: string) => {
			e.stopPropagation();
			marcarComoLidaMutation.mutate(id);
		},
		[marcarComoLidaMutation],
	);

	return (
		<>
			<DropdownMenu open={dropdownOpen} onOpenChange={handleOpenChange}>
				<DropdownMenuTrigger asChild>
					<Button variant="secondary" size="sm" className="relative">
						<BellIcon className="size-4" aria-hidden />
						{count > 0 && (
							<span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
								{count > 99 ? "99+" : count}
							</span>
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-80">
					<div className="p-2">
						<p className="text-sm font-medium">Notificações</p>
					</div>
					<div className="max-h-80 overflow-y-auto">
						{listLoading ? (
							<p className="p-4 text-center text-sm text-muted-foreground">
								Carregando...
							</p>
						) : !listData?.notificacoes?.length ? (
							<p className="p-4 text-center text-sm text-muted-foreground">
								Nenhuma notificação
							</p>
						) : (
							<ul className="space-y-0">
								{listData.notificacoes.map((n) => (
									<li key={n.id}>
										<button
											type="button"
											className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
											onClick={() => handleClickNotificacao(n)}
										>
											<div className="min-w-0 flex-1">
												<p
													className={
														n.lida ? "text-muted-foreground" : "font-medium"
													}
												>
													{n.titulo}
												</p>
												<p className="text-xs text-muted-foreground">
													{dayjs(n.criadoem).format("DD/MM/YYYY HH:mm")}
												</p>
											</div>
											{!n.lida && (
												<button
													type="button"
													className="shrink-0 rounded p-1 hover:bg-background"
													onClick={(e) => handleMarcarLido(e, n.id)}
													title="Marcar como lido"
													aria-label="Marcar como lido"
												>
													<CheckIcon className="size-4" />
												</button>
											)}
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</DropdownMenuContent>
			</DropdownMenu>

			<Dialog
				open={!!modalNotificacao}
				onOpenChange={(open) => !open && setModalNotificacao(null)}
			>
				<DialogContent>
					{modalNotificacao && (
						<>
							<DialogHeader>
								<DialogTitle>{modalNotificacao.titulo}</DialogTitle>
							</DialogHeader>
							<div className="space-y-2 text-sm">
								<p className="text-muted-foreground">
									{dayjs(modalNotificacao.criadoem).format(
										"DD/MM/YYYY [às] HH:mm",
									)}
								</p>
								{modalNotificacao.detalhes &&
									Object.keys(modalNotificacao.detalhes).length > 0 && (
										<dl className="space-y-1">
											{Object.entries(modalNotificacao.detalhes).map(
												([key, value]) =>
													value != null &&
													value !== "" && (
														<div key={key}>
															<dt className="font-medium capitalize">
																{key.replace(/([A-Z])/g, " $1").trim()}
															</dt>
															<dd className="text-muted-foreground">
																{typeof value === "object"
																	? JSON.stringify(value)
																	: String(value)}
															</dd>
														</div>
													),
											)}
										</dl>
									)}
							</div>
							<DialogFooter>
								{!modalNotificacao.lida && (
									<Button
										variant="secondary"
										onClick={() => {
											marcarComoLidaMutation.mutate(modalNotificacao.id);
											setModalNotificacao((prev) =>
												prev ? { ...prev, lida: true } : null,
											);
										}}
									>
										Marcar como lido
									</Button>
								)}
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>
		</>
	);
}
