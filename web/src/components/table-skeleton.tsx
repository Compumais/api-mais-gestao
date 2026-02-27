import type { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  children: ReactNode;
}

export function TableSkeleton({
  rows = 10,
  columns = 5,
  children,
}: TableSkeletonProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {children}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, index) => (
          <TableRow key={index}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <TableCell key={colIndex}>
                <div className="h-7 w-full animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}