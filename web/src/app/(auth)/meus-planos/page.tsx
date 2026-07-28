"use client";

import { IconCalendar, IconCheck } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { usePlano } from "@/hooks/use-plano";
import {
	downgradePlano,
	getCatalogo,
	type PlanoCatalogo,
	type TipoPlano,
} from "@/services/planos.service";

function getButtonCta(
	plan: PlanoCatalogo,
	currentPlanName: string | null,
	isCurrentPlan: boolean,
): string {
	if (isCurrentPlan) {
		return "Plano Atual";
	}

	if (!currentPlanName) {
		return "Contratar";
	}

	const currentPlanIndex = currentPlanName ? Number(currentPlanName) : -1;
	const targetPlanIndex = plan.ordem;

	if (targetPlanIndex > currentPlanIndex) {
		return `Upgrade para ${plan.nome}`;
	}

	return `Mudar para ${plan.nome}`;
}

function formatarValor(valor: number) {
	return new Intl.NumberFormat("pt-BR", {
		style: "currency",
		currency: "BRL",
		maximumFractionDigits: 2,
	}).format(valor);
}

export default function MeusPlanosPage() {
	const queryClient = useQueryClient();
	const {
		plano,
		planoAgendado,
		fimCiclo,
		isLoading: isLoadingPlano,
		semPlano,
	} = usePlano();
	const { refetchUser, user } = useAuth();
	const { data: catalogo, isLoading: isLoadingCatalogo } = useQuery({
		queryKey: ["catalogo-planos"],
		queryFn: getCatalogo,
		staleTime: 1000 * 60 * 30,
	});

	const downgradeMutation = useMutation({
		mutationFn: (plano: TipoPlano) => downgradePlano({ plano }),
		onSuccess: () => {
			toast.success(
				"Downgrade agendado com sucesso. A alteração será aplicada no fim do ciclo atual.",
			);
			queryClient.invalidateQueries({ queryKey: ["meu-plano"] });
			refetchUser();
		},
		onError: (error: Error) => {
			toast.error(
				error.message || "Erro ao agendar downgrade. Tente novamente.",
			);
		},
	});

	if (isLoadingPlano || isLoadingCatalogo) {
		return <div className="p-6">Carregando informações do plano...</div>;
	}

	// Determine current plan for UI logic
	const currentPlanName = plano ?? null;
	const isActive = !semPlano && currentPlanName !== null;
	const planoAtual = catalogo?.planos.find(
		(item) => item.codigo === currentPlanName,
	);

	return (
		<div className="space-y-6 p-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Meus Planos</h1>
				<p className="text-muted-foreground">
					Gerencie sua assinatura e confira os detalhes do seu plano.
				</p>
			</div>

			<Separator />

			{/* Seção da Assinatura Atual */}
			<section>
				<h2 className="mb-4 text-lg font-semibold">Seu Plano</h2>
				{semPlano ? (
					<Card>
						<CardContent className="py-6">
							<p className="text-muted-foreground">
								Você ainda não possui um plano ativo.
							</p>
						</CardContent>
						<CardFooter>
							<Button asChild>
								<Link href="/assinatura">Contratar Plano</Link>
							</Button>
						</CardFooter>
					</Card>
				) : (
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<CardTitle className="text-xl flex items-center gap-2">
										{planoAtual?.nome ?? `Plano ${currentPlanName}`}
										<Badge
											variant="default"
											className="bg-green-600 hover:bg-green-700"
										>
											Ativo
										</Badge>
										{planoAgendado && (
											<Badge variant="secondary">
												Downgrade agendado para {planoAgendado}
											</Badge>
										)}
									</CardTitle>
									<CardDescription>
										{fimCiclo && (
											<>
												Próxima cobrança em:{" "}
												<span className="font-medium text-foreground">
													{format(
														new Date(fimCiclo),
														"dd 'de' MMMM 'de' yyyy",
														{ locale: ptBR },
													)}
												</span>
											</>
										)}
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className="flex flex-col sm:flex-row gap-4 items-center">
								<div className="flex items-center gap-2 text-sm text-muted-foreground w-full sm:w-auto">
									<IconCalendar className="h-4 w-4" />
									<span>Renovação mensal automática</span>
								</div>
							</div>
						</CardContent>
					</Card>
				)}
			</section>

			{/* Seção dos Planos Disponíveis */}
			<section className="pt-6">
				<h2 className="mb-6 text-lg font-semibold">Planos Disponíveis</h2>
				<div className="grid gap-8 md:grid-cols-3">
					{catalogo?.planos.map((plan) => {
						const isCurrentPlan = currentPlanName === plan.codigo && isActive;
						const buttonCta = getButtonCta(
							plan,
							planoAtual ? String(planoAtual.ordem) : null,
							isCurrentPlan,
						);

						const currentPlanIndex = planoAtual?.ordem ?? -1;
						const isUpgrade = plan.ordem > currentPlanIndex;
						const isDowngrade =
							plan.ordem < currentPlanIndex && currentPlanIndex >= 0;

						return (
							<Card
								key={plan.id}
								className="relative flex flex-col transition-all duration-300 hover:shadow-lg"
							>
								{isCurrentPlan && (
									<div className="absolute -top-3 left-1/2 -translate-x-1/2">
										<Badge
											variant="secondary"
											className="bg-primary text-primary-foreground hover:bg-primary/90"
										>
											Seu Plano Atual
										</Badge>
									</div>
								)}

								<CardHeader>
									<CardTitle className="text-2xl">{plan.nome}</CardTitle>
									<CardDescription>{plan.descricao}</CardDescription>
									<div className="mt-4 flex items-baseline gap-1">
										<span className="text-4xl font-bold">
											{formatarValor(plan.valormensal)}
										</span>
										<span className="text-muted-foreground">/mês</span>
									</div>
								</CardHeader>

								<CardContent className="flex-1">
									<ul className="space-y-3">
										<li className="flex items-start gap-2">
											<IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
											<span className="text-sm">
												Até {plan.maxempresas} empresa(s) e {plan.maxusuarios}{" "}
												usuário(s)
											</span>
										</li>
										{plan.features.map((feature) => (
											<li
												key={feature.codigo}
												className="flex items-start gap-2"
											>
												<IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
												<span className="text-sm">{feature.nome}</span>
											</li>
										))}
									</ul>
								</CardContent>

								{user?.perfil.includes("proprietario") && (
									<CardFooter>
										{isCurrentPlan ? (
											<Button variant="outline" className="w-full" disabled>
												<span className="cursor-default">{buttonCta}</span>
											</Button>
										) : isUpgrade ? (
											<Button asChild variant="default" className="w-full">
												<Link
													href={`/checkout?plan=${plan.codigo}&type=upgrade`}
												>
													{buttonCta}
												</Link>
											</Button>
										) : isDowngrade ? (
											<AlertDialog>
												<AlertDialogTrigger asChild>
													<Button
														variant="outline"
														className="w-full"
														disabled={downgradeMutation.isPending}
													>
														{downgradeMutation.isPending
															? "Agendando..."
															: buttonCta}
													</Button>
												</AlertDialogTrigger>
												<AlertDialogContent>
													<AlertDialogHeader>
														<AlertDialogTitle>
															Agendar Downgrade
														</AlertDialogTitle>
														<AlertDialogDescription>
															O downgrade será aplicado no fim do ciclo atual (
															{fimCiclo
																? format(
																		new Date(fimCiclo),
																		"dd 'de' MMMM 'de' yyyy",
																		{ locale: ptBR },
																	)
																: "data não disponível"}
															). Você manterá acesso ao plano atual até essa
															data.
														</AlertDialogDescription>
													</AlertDialogHeader>
													<AlertDialogFooter>
														<AlertDialogCancel>Cancelar</AlertDialogCancel>
														<AlertDialogAction
															onClick={() =>
																downgradeMutation.mutate(
																	plan.codigo as TipoPlano,
																)
															}
														>
															Confirmar Downgrade
														</AlertDialogAction>
													</AlertDialogFooter>
												</AlertDialogContent>
											</AlertDialog>
										) : (
											<Button asChild variant="outline" className="w-full">
												<Link href={`/checkout?plan=${plan.codigo}`}>
													{buttonCta}
												</Link>
											</Button>
										)}
									</CardFooter>
								)}
							</Card>
						);
					})}
				</div>
			</section>
			<section className="pt-6">
				<h2 className="mb-2 text-lg font-semibold">Módulos adicionais</h2>
				<p className="mb-6 text-sm text-muted-foreground">
					Amplie seu plano com recursos especializados.
				</p>
				<div className="grid gap-4 md:grid-cols-3">
					{catalogo?.modulos.map((modulo) => (
						<Card key={modulo.id}>
							<CardHeader>
								<CardTitle>{modulo.nome}</CardTitle>
								<CardDescription>{modulo.descricao}</CardDescription>
							</CardHeader>
							<CardContent>
								<p className="text-xl font-semibold">
									{formatarValor(modulo.valormensal)}
									<span className="ml-1 text-sm font-normal text-muted-foreground">
										/mês
									</span>
								</p>
							</CardContent>
							{user?.perfil.includes("proprietario") && (
								<CardFooter>
									<Button asChild className="w-full" variant="outline">
										<Link href={`/checkout?modulo=${modulo.codigo}`}>
											Contratar módulo
										</Link>
									</Button>
								</CardFooter>
							)}
						</Card>
					))}
				</div>
			</section>
		</div>
	);
}
