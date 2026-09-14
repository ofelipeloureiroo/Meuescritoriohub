// Mercado Pago Frontend Integration Helper
// Official Mercado Pago SDK v2

declare global {
  interface Window {
    MercadoPago?: any;
  }
}

export interface MercadoPagoInstance {
  bricks: () => any;
  getIdentificationTypes: () => Promise<any[]>;
  getPaymentMethods: (options: any) => Promise<any>;
  getIssuers: (options: any) => Promise<any>;
  getInstallments: (options: any) => Promise<any>;
  createCardToken: (options: any) => Promise<any>;
  fields: {
    create: (type: string, options?: any) => any;
  };
}

/**
 * Retrieves the configured Mercado Pago Public Key from environment variables
 */
export function getMercadoPagoPublicKey(): string {
  return (import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || '').trim();
}

/**
 * Checks if the Mercado Pago script tag is loaded in the window
 */
export function isMercadoPagoScriptLoaded(): boolean {
  return typeof window !== 'undefined' && typeof window.MercadoPago === 'function';
}

let cachedInstance: any = null;
let cachedKey: string = '';

/**
 * Initializes and returns the MercadoPago SDK v2 instance
 * using the provided public key or VITE_MERCADO_PAGO_PUBLIC_KEY
 */
export function initMercadoPago(customKey?: string): any | null {
  if (typeof window === 'undefined') return null;

  const key = (customKey || getMercadoPagoPublicKey()).trim();
  if (!key) {
    return null;
  }

  if (!isMercadoPagoScriptLoaded()) {
    console.warn('Mercado Pago SDK script (https://sdk.mercadopago.com/js/v2) is not loaded.');
    return null;
  }

  try {
    if (cachedInstance && cachedKey === key) {
      return cachedInstance;
    }
    const mp = new window.MercadoPago(key, {
      locale: 'pt-BR',
    });
    cachedInstance = mp;
    cachedKey = key;
    return mp;
  } catch (error) {
    console.error('Failed to initialize MercadoPago SDK v2:', error);
    return null;
  }
}

/**
 * Requests backend to check Mercado Pago configuration status
 */
export async function fetchMercadoPagoStatus(): Promise<{
  configured: boolean;
  hasPublicKey: boolean;
  hasAccessToken: boolean;
  publicKeyPrefix?: string;
}> {
  try {
    const res = await fetch('/api/mercadopago/status');
    if (!res.ok) throw new Error('Falha ao consultar status do Mercado Pago');
    return await res.json();
  } catch {
    const hasClientKey = Boolean(getMercadoPagoPublicKey());
    return {
      configured: hasClientKey,
      hasPublicKey: hasClientKey,
      hasAccessToken: false,
      publicKeyPrefix: hasClientKey ? getMercadoPagoPublicKey().substring(0, 10) + '...' : undefined,
    };
  }
}

export interface CreatePreferenceParams {
  title: string;
  price: number;
  quantity?: number;
  payerEmail: string;
  payerName?: string;
  externalReference?: string;
  metadata?: Record<string, any>;
}

export interface PreferenceResponse {
  id: string;
  init_point: string;
  sandbox_init_point?: string;
}

/**
 * Calls backend to create a Mercado Pago Checkout Pro Preference
 */
export async function createCheckoutPreference(
  params: CreatePreferenceParams
): Promise<PreferenceResponse> {
  const res = await fetch('/api/mercadopago/preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao gerar preferência de pagamento no Mercado Pago.');
  }

  return data;
}

export interface CreatePixParams {
  amount: number;
  description: string;
  email: string;
  name: string;
  docType?: 'CPF' | 'CNPJ';
  docNumber?: string;
  uid?: string;
  installmentId?: string;
}

export interface PixPaymentResponse {
  id: string | number;
  status: string;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
}

/**
 * Calls backend to generate an instant Mercado Pago PIX with QR Code image and copy-paste code
 */
export async function createMercadoPagoPix(
  params: CreatePixParams
): Promise<PixPaymentResponse> {
  const res = await fetch('/api/mercadopago/create-pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao gerar PIX no Mercado Pago.');
  }

  return data;
}
