"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageContainer } from "@/app/(auth)/components/page-container";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useEmpresa } from "@/hooks/use-empresa";
import {
  type CriarPlanoContasFormData,
  criarPlanoContasSchema,
} from "@/schemas/plano-contas.schema";
import { planoContasService } from "@/services/plano-contas.service";

export default function Page() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { localStorageEmpresa } = useEmpresa();

  const idplanocontas = searchParams.get("idplanocontas");

  const form = useForm<CriarPlanoContasFormData>({
    resolver: zodResolver(criarPlanoContasSchema),
    defaultValues: {
      idempresa: localStorageEmpresa?.id ?? "",
      nome: "",
      tipomovimento: "E",
      inativo: 0,
      classe: null,
      centrocustoobrigatorio: 0,
      tipoconta: null,
      exportaparacontabilidade: 0,
      idplanocontas: idplanocontas || undefined,
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const tipomovimento = watch("tipomovimento");
  const centrocustoobrigatorio = watch("centrocustoobrigatorio");
  const exportaparacontabilidade = watch("exportaparacontabilidade");
  const tipoconta = watch("tipoconta");

  const { data: planoContas, isLoading: isLoadingPlanoContas } = useQuery({
    queryKey: ["plano-contas", idplanocontas],
    queryFn: async () => {
      if (!idplanocontas)
        throw new Error("ID do plano de contas é obrigatório");
      return await planoContasService.buscar(idplanocontas);
    },
    enabled: !!idplanocontas,
  });

  // Verifica se o plano pai está inativo
  const planoPaiInativo = planoContas?.plano?.inativo === 1;

  const { mutate: criarPlanoContas, isPending } = useMutation({
    mutationFn: planoContasService.criar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plano-contas"] });
      toast.success("Plano de contas criado com sucesso!");
      router.push("/plano-contas");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar plano de contas");
    },
  });

  const onSubmit = (data: CriarPlanoContasFormData) => {
    // Valida se o plano pai está inativo
    if (idplanocontas && planoPaiInativo) {
      toast.error(
        "Não é possível criar plano de contas filho para um plano de contas pai inativo",
      );
      return;
    }

    if (!localStorageEmpresa?.id) {
      toast.error("Empresa não selecionada");
      return;
    }

    const payload = {
      idempresa: localStorageEmpresa.id,
      nome: data.nome,
      tipomovimento: data.tipomovimento,
      inativo: 0 as 0 | 1,
      classe: data.classe || undefined,
      centrocustoobrigatorio: data.centrocustoobrigatorio ?? undefined,
      tipoconta: data.tipoconta ?? undefined,
      exportaparacontabilidade: data.exportaparacontabilidade ?? undefined,
      idplanocontas: data.idplanocontas || undefined,
    };

    criarPlanoContas(payload);
  };

  if (isLoadingPlanoContas && idplanocontas) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </PageContainer>
    );
  }

  // Se o plano pai estiver inativo, mostra mensagem de erro
  if (idplanocontas && planoPaiInativo) {
    return (
      <PageContainer>
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold">Novo plano de contas</h1>
        </div>
        <div className="rounded-lg border bg-card p-4 mx-4">
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <p className="text-destructive text-center">
              Não é possível criar plano de contas filho para um plano de contas
              pai inativo.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Voltar
            </Button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between p-4">
        <h1 className="text-2xl font-bold">Novo plano de contas</h1>
      </div>
      <div className="rounded-lg border bg-card p-4 mx-4">
        <form onSubmit={handleSubmit(onSubmit)}>
          <FieldGroup>
            <div className="grid grid-cols-3 w-full items-start gap-4">
              <Field data-invalid={!!errors.nome}>
                <FieldLabel htmlFor="nome">Nome</FieldLabel>
                <Input
                  id="nome"
                  placeholder="Nome do plano de contas"
                  aria-invalid={!!errors.nome}
                  aria-describedby={errors.nome ? "nome-error" : undefined}
                  {...register("nome")}
                />
                <FieldError errors={errors.nome ? [errors.nome] : []} />
              </Field>

              <Field data-invalid={!!errors.tipomovimento}>
                <FieldLabel htmlFor="tipomovimento">
                  Tipo de movimento
                </FieldLabel>
                <Select
                  value={tipomovimento}
                  onValueChange={(value: "E" | "S") =>
                    setValue("tipomovimento", value)
                  }
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={!!errors.tipomovimento}
                    aria-describedby={
                      errors.tipomovimento ? "tipomovimento-error" : undefined
                    }
                  >
                    <SelectValue placeholder="Selecione o tipo de movimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E">Entrada</SelectItem>
                    <SelectItem value="S">Saída</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError
                  errors={errors.tipomovimento ? [errors.tipomovimento] : []}
                />
              </Field>

              {/* <Field data-invalid={!!errors.classe}>
								<FieldLabel htmlFor="classe">Classe</FieldLabel>
								<Input
									id="classe"
									placeholder="Ex: 01, 02..."
									maxLength={2}
									aria-invalid={!!errors.classe}
									aria-describedby={errors.classe ? "classe-error" : undefined}
									{...register("classe")}
								/>
								<FieldError errors={errors.classe ? [errors.classe] : []} />
							</Field> */}

              <Field data-invalid={!!errors.tipoconta}>
                <FieldLabel htmlFor="tipoconta">Tipo de conta</FieldLabel>
                <Select
                  value={tipoconta?.toString() ?? ""}
                  onValueChange={(value: string) =>
                    setValue("tipoconta", value ? Number(value) : null)
                  }
                >
                  <SelectTrigger
                    className="w-full"
                    aria-invalid={!!errors.tipoconta}
                    aria-describedby={
                      errors.tipoconta ? "tipoconta-error" : undefined
                    }
                  >
                    <SelectValue placeholder="Selecione o tipo de conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Receita</SelectItem>
                    <SelectItem value="2">Despesa</SelectItem>
                    <SelectItem value="3">Investimento</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError
                  errors={errors.tipoconta ? [errors.tipoconta] : []}
                />
              </Field>
            </div>

            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-center gap-3 rounded-lg border p-4">
                <Checkbox
                  id="centrocustoobrigatorio"
                  checked={centrocustoobrigatorio === 1}
                  onCheckedChange={(checked) =>
                    setValue("centrocustoobrigatorio", checked ? 1 : 0)
                  }
                />
                <div className="space-y-0.5">
                  <FieldLabel htmlFor="centrocustoobrigatorio" className="text-base cursor-pointer">
                    Centro de custo obrigatório
                  </FieldLabel>
                  <p className="text-sm text-muted-foreground">
                    Exige que um centro de custo seja informado ao utilizar este plano
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border p-4">
                <Checkbox
                  id="exportaparacontabilidade"
                  checked={exportaparacontabilidade === 1}
                  onCheckedChange={(checked) =>
                    setValue("exportaparacontabilidade", checked ? 1 : 0)
                  }
                />
                <div className="space-y-0.5">
                  <FieldLabel htmlFor="exportaparacontabilidade" className="text-base cursor-pointer">
                    Exportar para contabilidade
                  </FieldLabel>
                  <p className="text-sm text-muted-foreground">
                    Inclui este plano de contas na exportação contábil
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Criando..." : "Criar"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </div>
    </PageContainer>
  );
}
