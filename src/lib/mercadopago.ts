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

let runtimePublicKey: string = '';

export function setRuntimePublicKey(key: string) {
  if (key) {
    runtimePublicKey = key.trim();
  }
}

/**
 * Retrieves the configured Mercado Pago Public Key from runtime config or environment variables
 */
export function getMercadoPagoPublicKey(): string {
  return runtimePublicKey || (import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || '').trim();
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
  publicKey?: string;
  publicKeyPrefix?: string;
}> {
  try {
    const res = await fetch('/api/mercadopago/status');
    if (!res.ok) throw new Error('Falha ao consultar status do Mercado Pago');
    const data = await res.json();
    if (data.publicKey) {
      setRuntimePublicKey(data.publicKey);
    }
    return data;
  } catch {
    const hasClientKey = Boolean(getMercadoPagoPublicKey());
    return {
      configured: hasClientKey,
      hasPublicKey: hasClientKey,
      hasAccessToken: false,
      publicKey: getMercadoPagoPublicKey(),
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
  origin?: string;
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
  const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
  const res = await fetch('/api/mercadopago/preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      origin: params.origin || origin,
    }),
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

export interface PaymentMethodItem {
  id: string;
  name: string;
  payment_type_id: string; // 'credit_card' | 'debit_card' | 'ticket' | 'bank_transfer'
  status: string;
  secure_thumbnail?: string;
  thumbnail?: string;
  min_allowed_amount?: number;
  max_allowed_amount?: number;
  deferred_capture?: string;
  settings?: any[];
}

export interface PaymentMethodsResponse {
  configured: boolean;
  payment_methods: PaymentMethodItem[];
}

/**
 * Fetches available payment methods from Mercado Pago API (/v1/payment_methods)
 */
export async function fetchPaymentMethods(): Promise<PaymentMethodsResponse> {
  try {
    const res = await fetch('/api/mercadopago/payment-methods');
    if (!res.ok) throw new Error('Falha ao obter meios de pagamento');
    return await res.json();
  } catch (err: any) {
    console.warn('Erro ao carregar meios de pagamento:', err);
    return {
      configured: false,
      payment_methods: [
        { id: 'pix', name: 'Pix Instantâneo', payment_type_id: 'bank_transfer', status: 'active' },
        { id: 'master', name: 'Mastercard', payment_type_id: 'credit_card', status: 'active' },
        { id: 'visa', name: 'Visa', payment_type_id: 'credit_card', status: 'active' },
        { id: 'elo', name: 'Elo', payment_type_id: 'credit_card', status: 'active' },
        { id: 'hipercard', name: 'Hipercard', payment_type_id: 'credit_card', status: 'active' },
        { id: 'bolbradesco', name: 'Boleto Bancário', payment_type_id: 'ticket', status: 'active' },
      ],
    };
  }
}

/**
 * Saves Mercado Pago credentials directly to server & runtime persistence
 */
export async function saveMercadoPagoConfig(credentials: {
  accessToken?: string;
  publicKey?: string;
}): Promise<{ 
  success: boolean; 
  configured: boolean; 
  hasAccessToken: boolean; 
  hasPublicKey: boolean;
  publicKeyPrefix?: string;
}> {
  const res = await fetch('/api/mercadopago/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao salvar credenciais do Mercado Pago');
  }

  if (credentials.publicKey) {
    // Reset cache
    cachedInstance = null;
    cachedKey = '';
  }

  return data;
}

export interface TransparentCardPaymentParams {
  token: string;
  payment_method_id: string;
  installments: number;
  transaction_amount: number;
  description?: string;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  issuer_id?: string | number;
  external_reference?: string;
  metadata?: Record<string, any>;
}

export interface TransparentPaymentResponse {
  id: string | number;
  status: 'approved' | 'in_process' | 'rejected' | 'processed' | string;
  status_detail: string;
  transactions?: any;
  error?: string;
}

/**
 * Processes a transparent credit card payment via backend /api/mercadopago/process-payment
 */
export async function processTransparentPayment(
  params: TransparentCardPaymentParams
): Promise<TransparentPaymentResponse> {
  const res = await fetch('/api/mercadopago/process-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao processar pagamento com cartão.');
  }

  return data;
}

/**
 * Tokenizes a credit card using the Mercado Pago SDK v2
 */
export async function createCardTokenWithSDK(params: {
  cardNumber: string;
  cardholderName: string;
  cardExpirationMonth: string;
  cardExpirationYear: string;
  securityCode: string;
  identificationType: string;
  identificationNumber: string;
  customPublicKey?: string;
}): Promise<{ id: string; first_six_digits?: string; last_four_digits?: string }> {
  const mp = initMercadoPago(params.customPublicKey);
  if (!mp) {
    throw new Error(
      'Mercado Pago SDK não está inicializado. Certifique-se de configurar a Public Key nas configurações.'
    );
  }

  const cleanNumber = params.cardNumber.replace(/\D/g, '');
  const cleanDoc = params.identificationNumber.replace(/\D/g, '');

  let year = params.cardExpirationYear.trim();
  if (year.length === 2) {
    year = `20${year}`;
  }

  const tokenResponse = await mp.createCardToken({
    cardNumber: cleanNumber,
    cardholderName: params.cardholderName.trim(),
    cardExpirationMonth: params.cardExpirationMonth.trim().padStart(2, '0'),
    cardExpirationYear: year,
    securityCode: params.securityCode.trim(),
    identificationType: params.identificationType || 'CPF',
    identificationNumber: cleanDoc,
  });

  if (!tokenResponse?.id) {
    throw new Error('Não foi possível gerar o token do cartão de crédito.');
  }

  return tokenResponse;
}

/**
 * Detects card brand / payment_method_id from card number bin
 */
export function detectCardBrand(cardNumber: string): string {
  const clean = cardNumber.replace(/\D/g, '');
  if (!clean) return 'credit_card';

  if (/^4/.test(clean)) return 'visa';
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(clean)) return 'master';
  if (/^(4011(78|79)|43(1274|8935)|45(1416|7393|763(1|2))|50(4175|6699|67[0-7][0-9]|9000)|627780|63(6297|6368)|650(03([^4])|04([0-9])|05(0|1)|4(0[5-9]|3[0-9]|8[5-9]|9[0-9])|5([0-2][0-9]|3[0-8])|9([2-6][0-9]|7[0-8])|541|700|720|901)|6516)/.test(clean)) {
    return 'elo';
  }
  if (/^(606282|3841)/.test(clean)) return 'hipercard';
  if (/^3[47]/.test(clean)) return 'amex';
  if (/^(30[0-5]|36|38)/.test(clean)) return 'diners';

  return 'credit_card';
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

export interface CreateBoletoParams {
  amount: number;
  description: string;
  dueDate: string; // YYYY-MM-DD
  payer: {
    name: string;
    email: string;
    docType?: 'CPF' | 'CNPJ';
    docNumber: string;
    address?: {
      zipCode?: string;
      street?: string;
      number?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
    };
  };
  externalReference?: string;
  metadata?: Record<string, any>;
  customAccessToken?: string;
}

export interface BoletoPaymentResponse {
  id: string | number;
  status: 'pending' | 'approved' | 'in_process' | 'rejected' | string;
  status_detail: string;
  digitable_line: string;
  barcode_raw: string;
  external_resource_url: string;
  pdf_url: string;
  date_of_expiration: string;
  transaction_amount: number;
  payer?: any;
}

/**
 * Calls backend to generate an official registered Boleto Bancário via Mercado Pago (FEBRABAN valid)
 */
export async function createMercadoPagoBoleto(
  params: CreateBoletoParams
): Promise<BoletoPaymentResponse> {
  const res = await fetch('/api/mercadopago/create-boleto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao gerar boleto no Mercado Pago.');
  }

  return data;
}

/**
 * Queries payment status for a specific Mercado Pago payment/boleto ID
 */
export async function fetchMercadoPagoPaymentStatus(
  paymentId: string | number,
  customAccessToken?: string
): Promise<{
  id: string | number;
  status: 'pending' | 'approved' | 'in_process' | 'rejected' | 'cancelled' | string;
  status_detail: string;
  date_approved?: string;
  date_of_expiration?: string;
  transaction_amount?: number;
  payment_method_id?: string;
  external_resource_url?: string;
  digitable_line?: string;
}> {
  const url = customAccessToken
    ? `/api/mercadopago/payment/${paymentId}?accessToken=${encodeURIComponent(customAccessToken)}`
    : `/api/mercadopago/payment/${paymentId}`;

  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erro ao consultar status do pagamento.');
  }
  return data;
}

