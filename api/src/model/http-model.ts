export type HttpResponse<T> =
	| {
			success: true;
			status: number;
			body?: T | null;
	  }
	| {
			success: false;
			status: number;
			error: string;
			code: string;
			cStat?: string;
			codigoErro?: string;
			consultaSituacao?: {
				cStat?: string;
				xMotivo?: string;
			} | null;
	  };
