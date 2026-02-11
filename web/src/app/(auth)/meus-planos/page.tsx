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
import { getMeuPlano, cancelarAssinatura } from "@/services/assinaturas.service";
import { useEmpresa } from "@/hooks/use-empresa";
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
const planHierarchy = ["Basic", "Premium", "Enterprise"];

function getButtonCta(planName: string, currentPlanName: string, isCurrentPlan: boolean): string {
	if (isCurrentPlan) {
		return "Plano Atual";
	}

	const currentPlanIndex = planHierarchy.indexOf(currentPlanName);
	const targetPlanIndex = planHierarchy.indexOf(planName);

	// Se o plano alvo está acima do atual (upgrade)
	if (targetPlanIndex > currentPlanIndex) {
		const plan = plans.find(p => p.name === planName);
		return `Upgrade para ${plan?.label || planName}`;
	}

	// Se o plano alvo está abaixo do atual (downgrade)
	const plan = plans.find(p => p.name === planName);
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
	const { localStorageEmpresa: empresa } = useEmpresa();
	const queryClient = useQueryClient();

	const { data: subscription, isLoading, isError } = useQuery({
		queryKey: ["meu-plano", empresa?.id],
		queryFn: () => getMeuPlano(empresa!.id),
		enabled: !!empresa?.id,
	});

	const cancelMutation = useMutation({
		mutationFn: () => cancelarAssinatura(empresa!.id),
		onSuccess: () => {
			toast.success("Assinatura cancelada com sucesso.");
			queryClient.invalidateQueries({ queryKey: ["meu-plano"] });
		},
		onError: () => {
			toast.error("Erro ao cancelar assinatura. Tente novamente.");
		}
	});

	if (isLoading) {
		return <div className="p-6">Carregando informações da assinatura...</div>;
	}

	// Determine current plan for UI logic
	const currentPlanName = subscription?.plan || "Free";
	const isCancelled = subscription?.status === "CANCELLED" || subscription?.status === "DELETED";
	const isActive = subscription?.status === "ACTIVE";

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
				<h2 className="mb-4 text-lg font-semibold">Sua Assinatura</h2>
				{!subscription || isError ? (
					<Card>
						<CardContent className="py-6">
							<p className="text-muted-foreground">Você ainda não possui uma assinatura ativa.</p>
						</CardContent>
						<CardFooter>
							<Button asChild>
								<Link href="/checkout">Assinar Agora</Link>
							</Button>
						</CardFooter>
					</Card>
				) : (
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div className="space-y-1">
									<CardTitle className="text-xl flex items-center gap-2">
										Plano {subscription.plan}
										<Badge variant={isActive ? "default" : "destructive"} className={isActive ? "bg-green-600 hover:bg-green-700" : ""}>
											{subscription.status}
										</Badge>
									</CardTitle>
									<CardDescription>
										{subscription.nextBillingDate && (
											<>Próxima cobrança em: <span className="font-medium text-foreground">{format(new Date(subscription.nextBillingDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span></>
										)}
									</CardDescription>
								</div>
								<div className="text-right hidden sm:block">
									<div className="text-2xl font-bold">
										{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subscription.amount)}
									</div>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							<div className="flex flex-col sm:flex-row gap-4 items-center">
								<div className="flex items-center gap-2 text-sm text-muted-foreground w-full sm:w-auto">
									<IconCalendar className="h-4 w-4" />
									<span>{isActive ? "Renovação mensal automática" : "Assinatura cancelada"}</span>
								</div>
								<div className="flex items-center gap-2 text-sm text-muted-foreground w-full sm:w-auto">
									<IconCreditCard className="h-4 w-4" />
									<span>Método: {transformarMetodoPagamento(subscription.paymentMethod)}</span>
								</div>
							</div>
						</CardContent>
						<CardFooter className="flex justify-between border-t py-4">
							{/* Assuming Asaas provides a portal URL or we build a page for it */}
							{/* Asaas usually sends invoiceUrl, maybe we can use it for billing info */}
							{subscription.invoiceUrl ? (
								<Button variant="outline" asChild>
									<a href={subscription.invoiceUrl} target="_blank" rel="noopener noreferrer">Ver Fatura Atual</a>
								</Button>
							) : (
								<Button variant="outline" disabled>Gerenciar Pagamento</Button>
							)}

							{isActive && (
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button variant="destructive" disabled={cancelMutation.isPending}>
											{cancelMutation.isPending ? "Cancelando..." : "Cancelar Assinatura"}
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
											<AlertDialogDescription>
												Essa ação cancelará sua assinatura imediatamente. Você perderá acesso aos recursos Premium ao final do ciclo atual.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Voltar</AlertDialogCancel>
											<AlertDialogAction onClick={() => cancelMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
												Confirmar Cancelamento
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							)}
						</CardFooter>
					</Card>
				)}
			</section>

			{/* Seção dos Planos Disponíveis */}
			<section className="pt-6">
				<h2 className="mb-6 text-lg font-semibold">Planos Disponíveis</h2>
				<div className="grid gap-8 md:grid-cols-3">
					{plans.map((plan) => {
						const isCurrentPlan = currentPlanName === plan.name && isActive;
						const buttonCta = getButtonCta(plan.name, currentPlanName, isCurrentPlan);

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
									<Button
										asChild={!isCurrentPlan}
										variant={plan.popular || isCurrentPlan ? "default" : "outline"}
										className="w-full"
										disabled={isCurrentPlan}
									>
										{isCurrentPlan ? (
											<span className="cursor-default">{buttonCta}</span>
										) : (
											<Link href={`/checkout?plan=${plan.name}`}>{buttonCta}</Link>
										)}
									</Button>
								</CardFooter>
							</Card>
						)
					})}
				</div>
			</section>
		</div>
	);
}
