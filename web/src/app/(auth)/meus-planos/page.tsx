"use client";

import {
	IconCalendar,
	IconCheck,
	IconCreditCard,
	IconLock,
} from "@tabler/icons-react";
import Link from "next/link";
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMeuPlano, downgradePlano, TipoPlano } from "@/services/planos.service";
import { usePlano } from "@/hooks/use-plano";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
} from "@/components/ui/alert-dialog"

const plans = [
	{
		name: "Basic",
		label: "Básico",
		price: "R$ 99",
		period: "/mês",
		description: "Ideal para pequenas empresas que estão começando",
		features: [
			"1 empresa",
			"Gestão de contas a pagar e receber",
			"Relatórios básicos",
			"Suporte por email",
			"Dashboard simplificado",
			"Até 3 usuários",
		],
		popular: false,
	},
	{
		name: "Premium",
		label: "Premium",
		price: "R$ 199",
		period: "/mês",
		description: "Para empresas em crescimento que precisam de mais recursos",
		features: [
			"Até 2 empresas",
			"Todas as funcionalidades do Básico",
			"Relatórios avançados e personalizados",
			"Dashboard completo com analytics",
			"Até 6 usuários",
			"API para integrações",
		],
		popular: true,
	},
	{
		name: "Enterprise",
		label: "Multi-empresa",
		price: "R$ 399",
		period: "/mês",
		description: "Solução completa para grupos empresariais",
		features: [
			"Até 5 empresas",
			"Todas as funcionalidades Premium",
			"Gestão centralizada de múltiplas empresas",
			"Consolidação de relatórios",
			"Até 12 usuários",
			"Customizações avançadas",
		],
		popular: false,
	},
];

// Hierarquia dos planos (ordem de upgrade)
const planHierarchy = ["BASIC", "PREMIUM", "ENTERPRISE"];

function getButtonCta(planName: string, currentPlanName: string | null, isCurrentPlan: boolean): string {
	if (isCurrentPlan) {
		return "Plano Atual";
	}

	if (!currentPlanName) {
		return "Contratar";
	}

	const currentPlanIndex = planHierarchy.indexOf(currentPlanName.toUpperCase());
	const targetPlanIndex = planHierarchy.indexOf(planName.toUpperCase());

	// Se o plano alvo está acima do atual (upgrade)
	if (targetPlanIndex > currentPlanIndex) {
		const plan = plans.find(p => p.name.toUpperCase() === planName.toUpperCase());
		return `Upgrade para ${plan?.label || planName}`;
	}

	// Se o plano alvo está abaixo do atual (downgrade)
	const plan = plans.find(p => p.name.toUpperCase() === planName.toUpperCase());
	return `Mudar para ${plan?.label || planName}`;
}

function transformarMetodoPagamento(metodoPagamento: string) {
	switch (metodoPagamento) {
		case "CREDIT_CARD":
			return "Cartão de Crédito";
		case "BOLETO":
			return "Boleto";
		case "PIX":
			return "PIX";
		default:
			return "Desconhecido";
	}
}

export default function MeusPlanosPage() {
	const queryClient = useQueryClient();
	const { plano, planoAgendado, fimCiclo, isLoading: isLoadingPlano, semPlano } = usePlano();
	const { refetchUser } = useAuth();

	const downgradeMutation = useMutation({
		mutationFn: (plano: TipoPlano) => downgradePlano({ plano }),
		onSuccess: () => {
			toast.success("Downgrade agendado com sucesso. A alteração será aplicada no fim do ciclo atual.");
			queryClient.invalidateQueries({ queryKey: ["meu-plano"] });
			refetchUser();
		},
		onError: (error: Error) => {
			toast.error(error.message || "Erro ao agendar downgrade. Tente novamente.");
		}
	});

	if (isLoadingPlano) {
		return <div className="p-6">Carregando informações do plano...</div>;
	}

	// Determine current plan for UI logic
	const currentPlanName = plano?.toUpperCase() || null;
	const isActive = !semPlano && currentPlanName !== null;

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
							<p className="text-muted-foreground">Você ainda não possui um plano ativo.</p>
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
										Plano {currentPlanName}
										<Badge variant="default" className="bg-green-600 hover:bg-green-700">
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
											<>Próxima cobrança em: <span className="font-medium text-foreground">{format(new Date(fimCiclo), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span></>
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
					{plans.map((plan) => {
						const planNameUpper = plan.name.toUpperCase();
						const isCurrentPlan = currentPlanName === planNameUpper && isActive;
						const buttonCta = getButtonCta(plan.name, currentPlanName, isCurrentPlan);
						
						// Determinar se é upgrade ou downgrade
						const currentPlanIndex = currentPlanName ? planHierarchy.indexOf(currentPlanName) : -1;
						const targetPlanIndex = planHierarchy.indexOf(planNameUpper);
						const isUpgrade = targetPlanIndex > currentPlanIndex;
						const isDowngrade = targetPlanIndex < currentPlanIndex && currentPlanIndex >= 0;

						return (
							<Card
								key={plan.name}
								className={`relative flex flex-col transition-all duration-300 hover:shadow-lg ${plan.popular ? "border-primary shadow-sm" : ""}`}
							>
								{plan.popular && !isCurrentPlan && (
									<div className="absolute -top-3 left-1/2 -translate-x-1/2">
										<Badge variant="default">Mais Popular</Badge>
									</div>
								)}
								{isCurrentPlan && (
									<div className="absolute -top-3 left-1/2 -translate-x-1/2">
										<Badge variant="secondary" className="bg-primary text-primary-foreground hover:bg-primary/90">Seu Plano Atual</Badge>
									</div>
								)}

								<CardHeader>
									<CardTitle className="text-2xl">{plan.label}</CardTitle>
									<CardDescription>{plan.description}</CardDescription>
									<div className="mt-4 flex items-baseline gap-1">
										<span className="text-4xl font-bold">{plan.price}</span>
										{plan.period && (
											<span className="text-muted-foreground">
												{plan.period}
											</span>
										)}
									</div>
								</CardHeader>

								<CardContent className="flex-1">
									<ul className="space-y-3">
										{plan.features.map((feature) => (
											<li key={feature} className="flex items-start gap-2">
												<IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
												<span className="text-sm">{feature}</span>
											</li>
										))}
									</ul>
								</CardContent>

								<CardFooter>
									{isCurrentPlan ? (
										<Button variant="outline" className="w-full" disabled>
											<span className="cursor-default">{buttonCta}</span>
										</Button>
									) : isUpgrade ? (
										<Button asChild variant="default" className="w-full">
											<Link href={`/checkout?plan=${plan.name}&type=upgrade`}>{buttonCta}</Link>
										</Button>
									) : isDowngrade ? (
										<AlertDialog>
											<AlertDialogTrigger asChild>
												<Button variant="outline" className="w-full" disabled={downgradeMutation.isPending}>
													{downgradeMutation.isPending ? "Agendando..." : buttonCta}
												</Button>
											</AlertDialogTrigger>
											<AlertDialogContent>
												<AlertDialogHeader>
													<AlertDialogTitle>Agendar Downgrade</AlertDialogTitle>
													<AlertDialogDescription>
														O downgrade será aplicado no fim do ciclo atual ({fimCiclo ? format(new Date(fimCiclo), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "data não disponível"}). Você manterá acesso ao plano atual até essa data.
													</AlertDialogDescription>
												</AlertDialogHeader>
												<AlertDialogFooter>
													<AlertDialogCancel>Cancelar</AlertDialogCancel>
													<AlertDialogAction onClick={() => downgradeMutation.mutate(planNameUpper as TipoPlano)}>
														Confirmar Downgrade
													</AlertDialogAction>
												</AlertDialogFooter>
											</AlertDialogContent>
										</AlertDialog>
									) : (
										<Button asChild variant="outline" className="w-full">
											<Link href={`/assinatura?plan=${plan.name}`}>{buttonCta}</Link>
										</Button>
									)}
								</CardFooter>
							</Card>
						)
					})}
				</div>
			</section>
		</div>
	);
}
