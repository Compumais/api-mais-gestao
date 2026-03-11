const ASAAS_API_URL =
	process.env.ASAAS_API_URL || "https://sandbox.asaas.com/api/v3";
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

if (!ASAAS_API_KEY) {
	console.warn("ASAAS_API_KEY is not set. Asaas integration will fail.");
}

interface AsaasCustomer {
	id: string;
	name: string;
	email: string;
	cpfCnpj?: string;
	phone?: string;
}

interface AsaasSubscription {
	id: string;
	customer: string;
	billingType: "CREDIT_CARD";
	value: number;
	nextDueDate: string;
	cycle: "MONTHLY";
	description?: string;
	externalReference?: string;
	status: string;
	invoiceUrl?: string;
}

interface AsaasPayment {
	id: string;
	customer: string;
	billingType: "CREDIT_CARD";
	value: number;
	dueDate: string;
	status: string;
	invoiceUrl?: string;
}

interface CreateCustomerDTO {
	name: string;
	email: string;
	cpfCnpj: string;
	phone?: string;
	externalReference?: string;
}

interface CreateSubscriptionDTO {
	customer: string;
	billingType: "CREDIT_CARD";
	value: number;
	nextDueDate: string;
	cycle: "MONTHLY";
	description?: string;
	externalReference?: string;
	creditCard?: {
		holderName: string;
		number: string;
		expiryMonth: string;
		expiryYear: string;
		ccv: string;
	};
	creditCardHolderInfo?: {
		name: string;
		email: string;
		cpfCnpj: string;
		postalCode?: string;
		address?: string;
		addressNumber?: string;
		complement?: string;
		province?: string;
		city?: string;
		phone: string;
	};
	remoteIp?: string;
}

interface CreatePaymentDTO {
	customer: string;
	billingType: "CREDIT_CARD";
	value: number;
	dueDate: string;
	description?: string;
	externalReference?: string;
	creditCard?: {
		holderName: string;
		number: string;
		expiryMonth: string;
		expiryYear: string;
		ccv: string;
	};
	creditCardHolderInfo?: {
		name: string;
		email: string;
		cpfCnpj: string;
		postalCode?: string;
		address?: string;
		addressNumber?: string;
		complement?: string;
		province?: string;
		city?: string;
		phone: string;
	};
	remoteIp?: string;
}

async function asaasRequest<T>(
	endpoint: string,
	method: string,
	body?: unknown,
): Promise<T> {
	const headers = {
		"Content-Type": "application/json",
		access_token: ASAAS_API_KEY || "",
	};

	const init: RequestInit = {
		method,
		headers,
	};
	if (body !== undefined) {
		init.body = JSON.stringify(body);
	}
	const response = await fetch(`${ASAAS_API_URL}${endpoint}`, init);

	if (!response.ok) {
		const errorBody = await response.text();
		console.error(`Asaas API Error [${method} ${endpoint}]:`, errorBody);
		throw new Error(`Asaas API Error: ${response.statusText} - ${errorBody}`);
	}

	return response.json() as Promise<T>;
}

export async function getCustomerByEmail(
	email: string,
): Promise<AsaasCustomer | null> {
	const response = await asaasRequest<{ data: AsaasCustomer[] }>(
		`/customers?email=${encodeURIComponent(email)}`,
		"GET",
	);
	return response.data.length > 0 ? (response.data[0] ?? null) : null;
}

export async function createCustomer(
	data: CreateCustomerDTO,
): Promise<AsaasCustomer> {
	return asaasRequest<AsaasCustomer>("/customers", "POST", data);
}

export async function createSubscription(
	data: CreateSubscriptionDTO,
): Promise<AsaasSubscription> {
	return asaasRequest<AsaasSubscription>("/subscriptions", "POST", data);
}

export async function createPayment(data: CreatePaymentDTO): Promise<AsaasPayment> {
	return asaasRequest<AsaasPayment>("/payments", "POST", data);
}

export async function getSubscription(id: string): Promise<AsaasSubscription> {
	return asaasRequest<AsaasSubscription>(`/subscriptions/${id}`, "GET");
}

export async function cancelSubscription(
	id: string,
): Promise<{ deleted: boolean; id: string }> {
	return asaasRequest<{ deleted: boolean; id: string }>(
		`/subscriptions/${id}`,
		"DELETE",
	);
}
