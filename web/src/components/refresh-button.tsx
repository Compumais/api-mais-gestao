import { IconRefresh } from "@tabler/icons-react";
import { Button } from "./ui/button";

export function RefreshButton() {
	const handleRefreshPage = () => {
		window.location.reload();
	};

	return (
		<Button
			type="button"
			variant="secondary"
			size="icon"
			onClick={handleRefreshPage}
		>
			<IconRefresh className="size-4" />
		</Button>
	);
}
