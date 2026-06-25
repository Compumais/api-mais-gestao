import { PageContainer } from "@/app/(auth)/components/page-container";

type TributosLayoutProps = {
	children: React.ReactNode;
};

export default function TributosLayout({ children }: TributosLayoutProps) {
	return (
		<PageContainer>
			<div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
				{children}
			</div>
		</PageContainer>
	);
}
