"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

export function MovimentacoesTableSkeleton() {
	return (
		<div className="flex flex-col gap-4">
			{/* Top Bar Skeleton */}
			<div className="flex items-center justify-end">
				<Skeleton className="h-9 w-40" />
			</div>

			{/* Table Skeleton */}
			<div className="overflow-hidden rounded-lg border">
				<Table>
					<TableHeader className="bg-muted sticky top-0 z-10">
						<TableRow>
							<TableHead className="w-[100px]">Data</TableHead>
							<TableHead className="max-w-[200px]">Histórico</TableHead>
							<TableHead className="text-right">Entrada</TableHead>
							<TableHead className="text-right">Saída</TableHead>
							<TableHead className="text-right">Saldo</TableHead>
							<TableHead className="min-w-[150px]">Plano</TableHead>
							<TableHead className="text-right">Ações</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{Array.from({ length: 10 }).map((_, i) => (
							<TableRow key={`row-${i}`}>
								<TableCell>
									<Skeleton className="h-5 w-20" />
								</TableCell>
								<TableCell>
									<Skeleton className="h-5 w-full max-w-[180px]" />
								</TableCell>
								<TableCell>
									<div className="flex justify-end">
										<Skeleton className="h-5 w-20" />
									</div>
								</TableCell>
								<TableCell>
									<div className="flex justify-end">
										<Skeleton className="h-5 w-20" />
									</div>
								</TableCell>
								<TableCell>
									<div className="flex justify-end">
										<Skeleton className="h-5 w-24" />
									</div>
								</TableCell>
								<TableCell>
									<Skeleton className="h-5 w-32" />
								</TableCell>
								<TableCell>
									<div className="flex justify-end">
										<Skeleton className="h-8 w-8 rounded-md" />
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{/* Pagination Skeleton */}
			<div className="flex items-center justify-between px-4">
				<div className="hidden flex-1 lg:flex">
					<Skeleton className="h-5 w-48" />
				</div>
				<div className="flex w-full items-center gap-8 lg:w-fit">
					<div className="hidden items-center gap-2 lg:flex">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-9 w-20" />
					</div>
					<div className="flex items-center justify-center">
						<Skeleton className="h-5 w-24" />
					</div>
					<div className="ml-auto flex items-center gap-2 lg:ml-0">
						<Skeleton className="h-8 w-8" />
						<Skeleton className="h-8 w-8" />
						<Skeleton className="h-8 w-8" />
						<Skeleton className="h-8 w-8" />
					</div>
				</div>
			</div>
		</div>
	);
}
