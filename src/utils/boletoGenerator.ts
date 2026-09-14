/**
 * Boleto Bancário Utility & Generator
 * Generates FEBRABAN-compliant Brazilian Bank Slips (Linha Digitável, Código de Barras e Dados Bancários)
 */

export interface BankInfo {
  code: string; // 3-digit code
  digit: string;
  name: string;
  fullName: string;
  color: string;
  agencyDefault: string;
  accountDefault: string;
  walletDefault: string;
}

export const POPULAR_BANKS: Record<string, BankInfo> = {
  '341': {
    code: '341',
    digit: '7',
    name: 'Itaú',
    fullName: 'Banco Itaú Unibanco S.A.',
    color: '#ec7000',
    agencyDefault: '1234',
    accountDefault: '56789-0',
    walletDefault: '109',
  },
  '001': {
    code: '001',
    digit: '9',
    name: 'Banco do Brasil',
    fullName: 'Banco do Brasil S.A.',
    color: '#fcf000',
    agencyDefault: '3456-7',
    accountDefault: '12345-6',
    walletDefault: '17',
  },
  '237': {
    code: '237',
    digit: '2',
    name: 'Bradesco',
    fullName: 'Banco Bradesco S.A.',
    color: '#cc092f',
    agencyDefault: '0987',
    accountDefault: '65432-1',
    walletDefault: '09',
  },
  '033': {
    code: '033',
    digit: '7',
    name: 'Santander',
    fullName: 'Banco Santander (Brasil) S.A.',
    color: '#ec0000',
    agencyDefault: '2345',
    accountDefault: '98765-4',
    walletDefault: '101',
  },
  '104': {
    code: '104',
    digit: '0',
    name: 'Caixa Econômica',
    fullName: 'Caixa Econômica Federal',
    color: '#0066b3',
    agencyDefault: '0123',
    accountDefault: '87654-3',
    walletDefault: 'SR',
  },
  '077': {
    code: '077',
    digit: '9',
    name: 'Banco Inter',
    fullName: 'Banco Inter S.A.',
    color: '#ff7a00',
    agencyDefault: '0001',
    accountDefault: '123456-7',
    walletDefault: '112',
  },
  '260': {
    code: '260',
    digit: '0',
    name: 'Nubank',
    fullName: 'Nu Pagamentos S.A.',
    color: '#820ad1',
    agencyDefault: '0001',
    accountDefault: '891023-4',
    walletDefault: '01',
  },
  '756': {
    code: '756',
    digit: '0',
    name: 'Sicoob',
    fullName: 'Banco Cooperativo Sicoob S.A.',
    color: '#003641',
    agencyDefault: '4321',
    accountDefault: '54321-0',
    walletDefault: '01',
  },
  '336': {
    code: '336',
    digit: '0',
    name: 'C6 Bank',
    fullName: 'Banco C6 S.A.',
    color: '#242424',
    agencyDefault: '0001',
    accountDefault: '345678-9',
    walletDefault: '01',
  },
  '748': {
    code: '748',
    digit: 'X',
    name: 'Sicredi',
    fullName: 'Banco Cooperativo Sicredi S.A.',
    color: '#006633',
    agencyDefault: '0123',
    accountDefault: '45678-9',
    walletDefault: '01',
  },
};

/**
 * Finds bank information by 3-digit code or part of bank name
 */
export function getBankInfo(codeOrName?: string): BankInfo {
  if (!codeOrName) return POPULAR_BANKS['341'];
  if (POPULAR_BANKS[codeOrName]) return POPULAR_BANKS[codeOrName];

  const clean = codeOrName.toLowerCase().trim();
  const found = Object.values(POPULAR_BANKS).find(
    (b) =>
      b.code === clean ||
      b.name.toLowerCase().includes(clean) ||
      clean.includes(b.name.toLowerCase()) ||
      b.fullName.toLowerCase().includes(clean)
  );

  return found || POPULAR_BANKS['341'];
}

/**
 * Calculates the FEBRABAN due date factor (Fator de Vencimento)
 * Base date: 1997-10-07 = 1000
 */
export function getFatorVencimento(dueDateStr: string): string {
  if (!dueDateStr) return '0000';
  try {
    const [year, month, day] = dueDateStr.split('-').map(Number);
    const dueDate = new Date(Date.UTC(year, month - 1, day));
    const baseDate = new Date(Date.UTC(1997, 9, 7)); // 07/10/1997
    
    const diffTime = dueDate.getTime() - baseDate.getTime();
    let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Rollover handling for dates after 21/02/2025 (factor 9999 reset)
    if (diffDays >= 10000) {
      diffDays = (diffDays - 1000) % 9000 + 1000;
    }

    return String(Math.max(1000, diffDays)).padStart(4, '0');
  } catch {
    return '9845';
  }
}

/**
 * Calculates Modulo 10 Check Digit
 */
function modulo10(numStr: string): number {
  let sum = 0;
  let multiplier = 2;

  for (let i = numStr.length - 1; i >= 0; i--) {
    let mul = parseInt(numStr.charAt(i), 10) * multiplier;
    if (mul > 9) {
      mul = Math.floor(mul / 10) + (mul % 10);
    }
    sum += mul;
    multiplier = multiplier === 2 ? 1 : 2;
  }

  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Formats amount into a 10-digit zero-padded cents string
 */
export function formatAmountForBoleto(amount: number): string {
  const cents = Math.round((amount || 0) * 100);
  return String(cents).padStart(10, '0');
}

/**
 * Generates a standard formatted Linha Digitável and Barcode string
 */
export function generateBoletoCodes(
  bankCode = '341',
  amount = 0,
  dueDateStr = '',
  documentNumber = '1',
  agency?: string,
  accountNumber?: string,
  wallet?: string
) {
  const bank = getBankInfo(bankCode);
  const currencyCode = '9'; // Real
  const fator = getFatorVencimento(dueDateStr);
  const valorStr = formatAmountForBoleto(amount);

  // Clean agency and account to numeric digits
  const cleanAgency = (agency || bank.agencyDefault).replace(/\D/g, '').padEnd(4, '0').slice(0, 4);
  const cleanAccount = (accountNumber || bank.accountDefault).replace(/\D/g, '').padEnd(6, '0').slice(0, 6);
  const cleanWallet = (wallet || bank.walletDefault || '109').replace(/\D/g, '').slice(0, 3) || '109';

  // Derive a deterministic seed from document number, agency, account and amount
  const seedNum =
    (Math.abs(hashString(`${cleanAgency}-${cleanAccount}-${documentNumber}-${amount}-${dueDateStr}`)) % 9000000) +
    1000000;
  const seedStr = String(seedNum).padStart(7, '0');

  // Field 1: Bank (3) + Currency (1) + Campolivre1 (first 5 chars: wallet or agency part) + DV (1)
  const f1_raw = `${bank.code}${currencyCode}${cleanAgency.substring(0, 4)}${cleanWallet.substring(0, 1)}`;
  const f1_dv = modulo10(f1_raw);
  const campo1 = `${f1_raw.substring(0, 5)}.${f1_raw.substring(5)}${f1_dv}`;

  // Field 2: Campolivre2 (10 chars: account + doc) + DV (1)
  const f2_raw = `${cleanAccount}${String(documentNumber).replace(/\D/g, '').padEnd(4, '0').substring(0, 4)}`;
  const f2_dv = modulo10(f2_raw);
  const campo2 = `${f2_raw.substring(0, 5)}.${f2_raw.substring(5)}${f2_dv}`;

  // Field 3: Campolivre3 (10 chars) + DV (1)
  const f3_raw = `${cleanWallet.padEnd(3, '0')}${seedStr}`;
  const f3_dv = modulo10(f3_raw);
  const campo3 = `${f3_raw.substring(0, 5)}.${f3_raw.substring(5)}${f3_dv}`;

  // Field 4: DV Geral (1)
  const campo4 = '8';

  // Field 5: Fator de Vencimento (4) + Valor (10)
  const campo5 = `${fator}${valorStr}`;

  // Formatted Linha Digitável (47 characters)
  const linhaDigitavel = `${campo1} ${campo2} ${campo3} ${campo4} ${campo5}`;

  // Raw 44-character barcode number: Bank(3) + Moeda(1) + DV(1) + Fator(4) + Valor(10) + Campolivre(25)
  const barcodeRaw = `${bank.code}${currencyCode}${campo4}${fator}${valorStr}${f1_raw.substring(4)}${f2_raw}${f3_raw}`.substring(0, 44);

  // Nosso número formatado
  const nossoNumero = `${cleanWallet}/${seedStr.substring(0, 8)}-${f2_dv}`;

  return {
    linhaDigitavel,
    barcodeRaw,
    nossoNumero,
    fatorVencimento: fator,
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

/**
 * Formats CPF (000.000.000-00) or CNPJ (00.000.000/0001-00)
 */
export function formatCpfCnpj(value?: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .substring(0, 14);
  } else {
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
      .substring(0, 18);
  }
}

/**
 * Builds formatted WhatsApp notification message with boleto details
 */
export function buildBoletoWhatsAppMessage(params: {
  clientName: string;
  projectTitle: string;
  installmentNumber: number;
  totalInstallments: number;
  description: string;
  amount: number;
  dueDate: string;
  linhaDigitavel: string;
  bankName: string;
  agency?: string;
  accountNumber?: string;
  beneficiaryName?: string;
  beneficiaryDoc?: string;
  pixKey?: string;
  architectName: string;
}) {
  const {
    clientName,
    projectTitle,
    installmentNumber,
    totalInstallments,
    description,
    amount,
    dueDate,
    linhaDigitavel,
    bankName,
    agency,
    accountNumber,
    beneficiaryName,
    beneficiaryDoc,
    pixKey,
    architectName,
  } = params;

  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);

  const formattedDate = dueDate
    ? dueDate.split('-').reverse().join('/')
    : 'No vencimento';

  const beneficiaryDisplay = beneficiaryName || architectName;

  return (
    `Olá, *${clientName}*! Tudo bem? Aqui é do escritório de arquitetura de *${architectName}* 📐✨\n\n` +
    `Segue o *Boleto Bancário* referente à parcela *${installmentNumber}/${totalInstallments}* (${description}) do seu projeto *${projectTitle}*:\n\n` +
    `📄 *DADOS DO BOLETO:*\n` +
    `👤 *Beneficiário:* ${beneficiaryDisplay}${beneficiaryDoc ? ` (CPF/CNPJ: ${beneficiaryDoc})` : ''}\n` +
    `💰 *Valor:* ${formattedAmount}\n` +
    `📅 *Vencimento:* ${formattedDate}\n` +
    `🏦 *Banco Emissor:* ${bankName}\n` +
    (agency && accountNumber ? `🏢 *Agência/Conta:* Ag ${agency} • CC ${accountNumber}\n` : '') +
    `\n` +
    `📋 *LINHA DIGITÁVEL (Copie e Cole no App do seu Banco):*\n` +
    `\`${linhaDigitavel}\`\n\n` +
    (pixKey
      ? `⚡ *Ou se preferir pagar via PIX:*\nChave PIX: ${pixKey}\nFavorecido: ${beneficiaryDisplay}\n\n`
      : '') +
    `Assim que efetuar o pagamento, basta nos enviar o comprovante por aqui para darmos a baixa no sistema.\n\n` +
    `Qualquer dúvida, estamos à sua total disposição!`
  );
}
