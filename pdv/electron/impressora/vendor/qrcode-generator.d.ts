declare function qrcode(
	typeNumber: number,
	errorCorrectionLevel: string,
): {
	addData: (data: string, mode?: string) => void;
	make: () => void;
	createSvgTag: (opts?: {
		cellSize?: number;
		margin?: number;
		scalable?: boolean;
	}) => string;
	isDark: (row: number, col: number) => boolean;
	getModuleCount: () => number;
};

export default qrcode;
