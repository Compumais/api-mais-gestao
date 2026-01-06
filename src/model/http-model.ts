export type HttpResponse<T> =
	| {
			success: true;
			status: number;
			body?: T;
	  }
	| {
			success: false;
			status: number;
			error: string;
			code: string;
	  };
