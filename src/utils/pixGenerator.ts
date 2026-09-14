/**
 * PIX Standard EMV BR Code Generator (BACEN standard)
 * Generates official Pix "Copia e Cola" and QR Code for instant banking payments
 */
import QRCode from 'qrcode';

export interface PixPayloadOptions {
  pixKey: string;
  pixKeyType?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  merchantName: string;
  merchantCity?: string;
  amount?: number;
  description?: string;
  txId?: string;
}

/**
 * Strips accents and non-ASCII characters to comply with BACEN EMV specifications
 */
export function normalizePixString(str: string, maxLength: number): string {
  if (!str) return '';
  const normalized = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
  return normalized.substring(0, maxLength);
}

/**
 * Computes CRC16-CCITT checksum for BACEN EMV QR Code
 */
function computeCrc16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Formats a single EMV TLV (Type-Length-Value) field
 */
function formatEmvField(id: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Normalizes PIX key based on type (e.g. cleans phone, cpf, cnpj)
 */
export function normalizePixKey(key: string, keyType?: string): string {
  if (!key) return '';
  const trimmed = key.trim();

  // If phone, ensure it has country code +55
  if (keyType === 'phone' || (trimmed.replace(/\D/g, '').length >= 10 && trimmed.replace(/\D/g, '').length <= 11 && !trimmed.includes('@'))) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 11) {
      return `+55${digits}`;
    }
    if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
      return `+${digits}`;
    }
  }

  // If CPF or CNPJ, keep only numbers
  if (keyType === 'cpf' || keyType === 'cnpj') {
    return trimmed.replace(/\D/g, '');
  }

  return trimmed;
}

/**
 * Generates the official BACEN Pix "Copia e Cola" (BR Code Payload)
 */
export function generatePixCopiaECola(options: PixPayloadOptions): string {
  const {
    pixKey,
    pixKeyType,
    merchantName,
    merchantCity = 'SAO PAULO',
    amount,
    description,
    txId = '***',
  } = options;

  const cleanKey = normalizePixKey(pixKey, pixKeyType);
  if (!cleanKey) return '';

  const cleanName = normalizePixString(merchantName || 'BENEFICIARIO', 25) || 'ESCRITORIO';
  const cleanCity = normalizePixString(merchantCity || 'BRASIL', 15) || 'SAO PAULO';
  const cleanTxId = (txId || '***').replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) || '***';

  // 00 - Payload Format Indicator
  let payload = formatEmvField('00', '01');

  // 01 - Point of Initiation Method (12 = Dynamic, 11 = Static)
  // For static with fixed amount, either 11 or 12 works; 11/12 default is static/dynamic
  // payload += formatEmvField('01', '12');

  // 26 - Merchant Account Information (Pix GUI + Key + optional description)
  let mai = formatEmvField('00', 'br.gov.bcb.pix');
  mai += formatEmvField('01', cleanKey);
  if (description) {
    const cleanDesc = normalizePixString(description, 50);
    if (cleanDesc) {
      mai += formatEmvField('02', cleanDesc);
    }
  }
  payload += formatEmvField('26', mai);

  // 52 - Merchant Category Code
  payload += formatEmvField('52', '0000');

  // 53 - Transaction Currency (986 = BRL)
  payload += formatEmvField('53', '986');

  // 54 - Transaction Amount (optional if open, but specified for installment)
  if (amount !== undefined && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    payload += formatEmvField('54', formattedAmount);
  }

  // 58 - Country Code
  payload += formatEmvField('58', 'BR');

  // 59 - Merchant Name
  payload += formatEmvField('59', cleanName);

  // 60 - Merchant City
  payload += formatEmvField('60', cleanCity);

  // 62 - Additional Data Field Template (TxId)
  const addData = formatEmvField('05', cleanTxId);
  payload += formatEmvField('62', addData);

  // 63 - CRC16 Checksum placeholder
  payload += '6304';
  const crc = computeCrc16(payload);

  return `${payload}${crc}`;
}

/**
 * Generates a Data URL QR Code image from a Pix Copia e Cola string
 */
export async function generatePixQrCodeDataUrl(copiaECola: string): Promise<string> {
  if (!copiaECola) return '';
  try {
    return await QRCode.toDataURL(copiaECola, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('Error generating PIX QR Code:', error);
    return '';
  }
}

/**
 * Builds formatted WhatsApp message for Pix payment
 */
export function buildPixWhatsAppMessage(params: {
  clientName: string;
  projectTitle: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDate: string;
  pixKey: string;
  pixKeyType?: string;
  beneficiaryName: string;
  bankName?: string;
  copiaECola?: string;
  officeName?: string;
}): string {
  const {
    clientName,
    projectTitle,
    installmentNumber,
    totalInstallments,
    amount,
    dueDate,
    pixKey,
    pixKeyType,
    beneficiaryName,
    bankName,
    copiaECola,
    officeName,
  } = params;

  const keyTypeLabel = {
    cpf: 'CPF',
    cnpj: 'CNPJ',
    email: 'E-mail',
    phone: 'Celular',
    random: 'Chave Aleatória',
  }[pixKeyType || ''] || 'Chave PIX';

  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);

  const formattedDate = dueDate
    ? dueDate.split('-').reverse().join('/')
    : 'À vista';

  let msg = `Olá *${clientName || 'Cliente'}*, tudo bem?\n\n`;
  msg += `Segue a cobrança via *PIX* referente à parcela *${installmentNumber}/${totalInstallments}* do projeto *${projectTitle}*:\n\n`;
  msg += `💰 *Valor:* ${formattedAmount}\n`;
  msg += `📅 *Vencimento:* ${formattedDate}\n`;
  msg += `👤 *Favorecido / Titular:* ${beneficiaryName || officeName || 'Escritório'}\n`;
  if (bankName) {
    msg += `🏦 *Banco:* ${bankName}\n`;
  }
  msg += `🔑 *${keyTypeLabel}:* \`${pixKey}\`\n\n`;

  if (copiaECola) {
    msg += `📱 *PIX Copia e Cola (Abra o app do seu banco > Pix > Copia e Cola):*\n\`\`\`${copiaECola}\`\`\`\n\n`;
  }

  msg += `_Após realizar o pagamento, por gentileza envie o comprovante por aqui._\n\n`;
  msg += `Atenciosamente,\n*${officeName || 'Nosso Escritório'}*`;

  return msg;
}
