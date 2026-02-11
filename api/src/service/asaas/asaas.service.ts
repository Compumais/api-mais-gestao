
import { randomUUID } from "node:crypto";

const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://sandbox.asaas.com/api/v3";
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
  invoiceUrl?: string; // Sometimes returned
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

export class AsaasService {
  private static async request<T>(endpoint: string, method: string, body?: any): Promise<T> {
    const headers = {
      "Content-Type": "application/json",
      "access_token": ASAAS_API_KEY || "",
    };

    const response = await fetch(`${ASAAS_API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    } as RequestInit);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Asaas API Error [${method} ${endpoint}]:`, errorBody);
      throw new Error(`Asaas API Error: ${response.statusText} - ${errorBody}`);
    }

    return response.json() as Promise<T>;
  }

  static async getCustomerByEmail(email: string): Promise<AsaasCustomer | null> {
    const response = await this.request<{ data: AsaasCustomer[] }>(
      `/customers?email=${encodeURIComponent(email)}`,
      "GET"
    );
    return response.data.length > 0 ? response.data[0] || null : null;
  }

  static async createCustomer(data: CreateCustomerDTO): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>("/customers", "POST", data);
  }

  static async createSubscription(data: CreateSubscriptionDTO): Promise<AsaasSubscription> {
    // Note: When sending credit card info, Asaas might require specific encryption or just raw data over HTTPS.
    // For this implementation, we send raw data as per standard REST API usage in backend-to-backend.
    return this.request<AsaasSubscription>("/subscriptions", "POST", data);
  }

  static async getSubscription(id: string): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>(`/subscriptions/${id}`, "GET");
  }

  static async cancelSubscription(id: string): Promise<{ deleted: boolean; id: string }> {
    return this.request<{ deleted: boolean; id: string }>(`/subscriptions/${id}`, "DELETE");
  }
}
