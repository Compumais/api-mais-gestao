
"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useEmpresa } from "@/hooks/use-empresa";
import { realizarCheckout } from "@/services/checkout.service";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { maskCep, maskCpfCnpj, maskCreditCard, maskPhone } from "@/lib/masks";

const checkoutSchema = z.object({
    plano: z.enum(["BASIC", "PREMIUM"]),
    holderName: z.string().min(3, "Nome do titular é obrigatório"),
    cardNumber: z.string().min(16, "Número do cartão inválido"),
    expiryMonth: z.string().length(2, "Mês inválido (MM)"),
    expiryYear: z.string().length(4, "Ano inválido (AAAA)"),
    ccv: z.string().min(3, "CCV inválido"),
    holderEmail: z.string().email("Email inválido"),
    holderCpfCnpj: z.string().min(11, "CPF/CNPJ inválido"),
    holderPhone: z.string().min(10, "Telefone inválido"),
    holderPostalCode: z.string().optional(),
    holderAddress: z.string().optional(),
    holderAddressNumber: z.string().optional(),
    holderComplement: z.string().optional(),
    holderProvince: z.string().optional(),
    holderCity: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();
    const { localStorageEmpresa } = useEmpresa();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<CheckoutFormValues>({
        resolver: zodResolver(checkoutSchema),
        defaultValues: {
            plano: "BASIC",
            holderName: "",
            cardNumber: "",
            expiryMonth: "",
            expiryYear: "",
            ccv: "",
            holderEmail: "",
            holderCpfCnpj: "",
            holderPhone: "",
            holderPostalCode: "",
            holderAddress: "",
            holderAddressNumber: "",
            holderComplement: "",
            holderProvince: "",
            holderCity: "",
        },
    });

    useEffect(() => {
        if (user) {
            form.setValue("holderName", user.nome || "");
            form.setValue("holderEmail", user.email || "");
        }

        const planParam = searchParams.get("plan");
        if (planParam) {
            const upperPlan = planParam.toUpperCase();
            if (upperPlan === "BASIC" || upperPlan === "PREMIUM") {
                form.setValue("plano", upperPlan as "BASIC" | "PREMIUM");
            }
        }
    }, [user, form, searchParams]);

    const handleInputChange = (field: keyof CheckoutFormValues, maskFunction: (value: string) => string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const maskedValue = maskFunction(e.target.value);
        form.setValue(field, maskedValue, { shouldValidate: true });
    };

    const onSubmit = async (data: CheckoutFormValues) => {
        if (!localStorageEmpresa?.id) {
            toast.error("Nenhuma empresa selecionada");
            return;
        }

        setIsLoading(true);

        // Remove non-numeric characters before sending to API if needed (keeping masks for display)
        // However, the backend might handle it or we should strip in onSubmit.
        // The service logic likely expects clean numbers for some fields like card number, but potentially formatted for address.
        // Let's clean card number, expiry, ccv for safety.
        // The `checkout.service` passes `cardNumber` directly. Asaas usually takes clean numbers.

        const cleanCardNumber = data.cardNumber.replace(/\D/g, "");
        const cleanCpfCnpj = data.holderCpfCnpj.replace(/\D/g, "");
        const cleanPhone = data.holderPhone.replace(/\D/g, "");
        const cleanPostalCode = data.holderPostalCode?.replace(/\D/g, "") || undefined;

        try {
            const response = await realizarCheckout({
                idempresa: localStorageEmpresa.id,
                plano: data.plano,
                ciclo: "MONTHLY",
                creditCard: {
                    holderName: data.holderName,
                    number: cleanCardNumber,
                    expiryMonth: data.expiryMonth,
                    expiryYear: data.expiryYear,
                    ccv: data.ccv,
                },
                creditCardHolderInfo: {
                    name: data.holderName,
                    email: data.holderEmail,
                    cpfCnpj: cleanCpfCnpj,
                    postalCode: cleanPostalCode,
                    address: data.holderAddress || undefined,
                    addressNumber: data.holderAddressNumber || undefined,
                    complement: data.holderComplement || undefined,
                    province: data.holderProvince || undefined,
                    city: data.holderCity || undefined,
                    phone: cleanPhone,
                },
            });

            toast.success("Assinatura realizada com sucesso!");

            if (response.urlpagamento) {
                window.location.href = response.urlpagamento;
            } else {
                router.push("/dashboard");
            }

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Erro ao processar assinatura");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10 flex justify-center">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Assinar Plano</CardTitle>
                    <CardDescription>
                        Preencha os dados do cartão de crédito para realizar a assinatura.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form id="checkout-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">Escolha o Plano</Label>
                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    className={`border rounded-lg p-4 cursor-pointer hover:bg-accent/50 ${form.watch("plano") === "BASIC" ? "border-primary bg-accent" : ""}`}
                                    onClick={() => form.setValue("plano", "BASIC")}
                                >
                                    <div className="font-bold">Básico</div>
                                    <div className="text-xl">R$ 99,00 <span className="text-sm font-normal">/mês</span></div>
                                </div>
                                <div
                                    className={`border rounded-lg p-4 cursor-pointer hover:bg-accent/50 ${form.watch("plano") === "PREMIUM" ? "border-primary bg-accent" : ""}`}
                                    onClick={() => form.setValue("plano", "PREMIUM")}
                                >
                                    <div className="font-bold">Premium</div>
                                    <div className="text-xl">R$ 199,00 <span className="text-sm font-normal">/mês</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">Dados do Cartão</Label>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="holderName">Nome no Cartão</Label>
                                    <Input id="holderName" {...form.register("holderName")} placeholder="Como impresso no cartão" />
                                    {form.formState.errors.holderName && <p className="text-red-500 text-sm">{form.formState.errors.holderName.message}</p>}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="cardNumber">Número do Cartão</Label>
                                    <Input
                                        id="cardNumber"
                                        {...form.register("cardNumber")}
                                        onChange={handleInputChange("cardNumber", maskCreditCard)}
                                        placeholder="0000 0000 0000 0000"
                                        maxLength={19}
                                    />
                                    {form.formState.errors.cardNumber && <p className="text-red-500 text-sm">{form.formState.errors.cardNumber.message}</p>}
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="expiryMonth">Mês (MM)</Label>
                                        <Input id="expiryMonth" {...form.register("expiryMonth")} placeholder="MM" maxLength={2} />
                                        {form.formState.errors.expiryMonth && <p className="text-red-500 text-sm">{form.formState.errors.expiryMonth.message}</p>}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="expiryYear">Ano (AAAA)</Label>
                                        <Input id="expiryYear" {...form.register("expiryYear")} placeholder="AAAA" maxLength={4} />
                                        {form.formState.errors.expiryYear && <p className="text-red-500 text-sm">{form.formState.errors.expiryYear.message}</p>}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="ccv">CCV</Label>
                                        <Input id="ccv" {...form.register("ccv")} placeholder="123" maxLength={4} />
                                        {form.formState.errors.ccv && <p className="text-red-500 text-sm">{form.formState.errors.ccv.message}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Label className="text-lg font-semibold">Dados do Titular</Label>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="holderEmail">Email</Label>
                                    <Input id="holderEmail" {...form.register("holderEmail")} placeholder="email@exemplo.com" />
                                    {form.formState.errors.holderEmail && <p className="text-red-500 text-sm">{form.formState.errors.holderEmail.message}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="holderCpfCnpj">CPF/CNPJ</Label>
                                        <Input
                                            id="holderCpfCnpj"
                                            {...form.register("holderCpfCnpj")}
                                            onChange={handleInputChange("holderCpfCnpj", maskCpfCnpj)}
                                            placeholder="000.000.000-00"
                                            maxLength={18}
                                        />
                                        {form.formState.errors.holderCpfCnpj && <p className="text-red-500 text-sm">{form.formState.errors.holderCpfCnpj.message}</p>}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="holderPhone">Telefone</Label>
                                        <Input
                                            id="holderPhone"
                                            {...form.register("holderPhone")}
                                            onChange={handleInputChange("holderPhone", maskPhone)}
                                            placeholder="(00) 00000-0000"
                                            maxLength={15}
                                        />
                                        {form.formState.errors.holderPhone && <p className="text-red-500 text-sm">{form.formState.errors.holderPhone.message}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="holderPostalCode">CEP (opcional)</Label>
                                        <Input
                                            id="holderPostalCode"
                                            {...form.register("holderPostalCode")}
                                            onChange={handleInputChange("holderPostalCode", maskCep)}
                                            placeholder="00000-000"
                                            maxLength={9}
                                        />
                                        {form.formState.errors.holderPostalCode && <p className="text-red-500 text-sm">{form.formState.errors.holderPostalCode.message}</p>}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="holderAddressNumber">Número (opcional)</Label>
                                        <Input id="holderAddressNumber" {...form.register("holderAddressNumber")} placeholder="123" />
                                        {form.formState.errors.holderAddressNumber && <p className="text-red-500 text-sm">{form.formState.errors.holderAddressNumber.message}</p>}
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="holderAddress">Rua (opcional)</Label>
                                    <Input id="holderAddress" {...form.register("holderAddress")} placeholder="Rua exemplo" />
                                    {form.formState.errors.holderAddress && <p className="text-red-500 text-sm">{form.formState.errors.holderAddress.message}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="holderProvince">Bairro (opcional)</Label>
                                        <Input id="holderProvince" {...form.register("holderProvince")} placeholder="Centro" />
                                        {form.formState.errors.holderProvince && <p className="text-red-500 text-sm">{form.formState.errors.holderProvince.message}</p>}
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="holderCity">Cidade (opcional)</Label>
                                        <Input id="holderCity" {...form.register("holderCity")} placeholder="São Paulo" />
                                        {form.formState.errors.holderCity && <p className="text-red-500 text-sm">{form.formState.errors.holderCity.message}</p>}
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="holderComplement">Complemento (opcional)</Label>
                                    <Input id="holderComplement" {...form.register("holderComplement")} placeholder="Apto 101" />
                                    {form.formState.errors.holderComplement && <p className="text-red-500 text-sm">{form.formState.errors.holderComplement.message}</p>}
                                </div>
                            </div>
                        </div>

                    </form>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button type="submit" form="checkout-form" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Finalizar Assinatura
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
