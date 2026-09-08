export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `R$ ${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `R$ ${(value / 1000).toFixed(1)}k`;
  }
  return formatCurrency(value);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year}`;
}

export function formatMonthYear(dateString: string): string {
  if (!dateString) return '';
  const [year, month] = dateString.split('-');
  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  const monthIndex = parseInt(month, 10) - 1;
  return `${months[monthIndex] || month} de ${year}`;
}

export function formatPercent(value: number): string {
  return `${(value || 0).toFixed(1)}%`;
}

// Calculate estimated mortgage amortization simulation (SAC system)
export function simulateMortgageAmortization(
  currentDebt: number,
  remainingMonths: number,
  annualInterestRate: number,
  amortizationAmount: number,
  type: 'prazo' | 'prestacao'
): {
  reducedMonths: number;
  newRemainingMonths: number;
  newInstallmentValue: number;
  estimatedInterestSaved: number;
  newPayoffDateEstimate: string;
} {
  const monthlyRate = Math.pow(1 + annualInterestRate / 100, 1 / 12) - 1;
  const currentMonthlyAmortization = remainingMonths > 0 ? currentDebt / remainingMonths : 0;
  const currentInstallment = currentMonthlyAmortization + currentDebt * monthlyRate;

  if (amortizationAmount <= 0 || currentDebt <= 0 || remainingMonths <= 0) {
    return {
      reducedMonths: 0,
      newRemainingMonths: remainingMonths,
      newInstallmentValue: currentInstallment,
      estimatedInterestSaved: 0,
      newPayoffDateEstimate: 'Sem alteração',
    };
  }

  if (type === 'prazo') {
    // Abate direto no saldo devedor mantendo a amortização mensal
    const newDebt = Math.max(0, currentDebt - amortizationAmount);
    const monthsReduced = Math.min(
      remainingMonths,
      Math.floor(amortizationAmount / (currentMonthlyAmortization || 1))
    );
    const newRemainingMonths = Math.max(1, remainingMonths - monthsReduced);
    
    // Estimativa de juros economizados (juros compostos sobre o saldo abatido durante o período poupado)
    const averageInterestRatePerMonth = monthlyRate;
    const estimatedInterestSaved = amortizationAmount * averageInterestRatePerMonth * (remainingMonths / 2);
    
    const currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() + newRemainingMonths);
    const payoffYear = currentDate.getFullYear();
    const payoffMonth = currentDate.toLocaleDateString('pt-BR', { month: 'short' });

    return {
      reducedMonths: Math.max(1, monthsReduced),
      newRemainingMonths,
      newInstallmentValue: (newDebt / newRemainingMonths) + (newDebt * monthlyRate),
      estimatedInterestSaved: Math.round(estimatedInterestSaved),
      newPayoffDateEstimate: `${payoffMonth}/${payoffYear} (~${Math.floor(newRemainingMonths / 12)} anos e ${newRemainingMonths % 12} meses)`,
    };
  } else {
    // Redução da prestação mantendo o mesmo prazo
    const newDebt = Math.max(0, currentDebt - amortizationAmount);
    const newAmortization = newDebt / remainingMonths;
    const newInstallmentValue = newAmortization + newDebt * monthlyRate;
    const estimatedInterestSaved = amortizationAmount * monthlyRate * (remainingMonths / 2);

    return {
      reducedMonths: 0,
      newRemainingMonths: remainingMonths,
      newInstallmentValue,
      estimatedInterestSaved: Math.round(estimatedInterestSaved),
      newPayoffDateEstimate: `Mantém ${remainingMonths} meses com parcela menor de ${formatCurrency(newInstallmentValue)}`,
    };
  }
}
