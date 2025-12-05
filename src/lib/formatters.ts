/**
 * Formata um número de telefone para o formato (XX) XXXXX-XXXX
 */
export function formatPhone(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");
  
  // Limita a 11 dígitos
  const limited = numbers.slice(0, 11);
  
  // Aplica a máscara
  if (limited.length <= 2) {
    return limited;
  } else if (limited.length <= 7) {
    return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  } else {
    return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
  }
}

/**
 * Remove a formatação do telefone, retornando apenas números
 */
export function unformatPhone(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Formata um valor numérico para o formato brasileiro X.XXX,XX
 */
export function formatCurrency(value: string | number): string {
  // Se for número, converte para string
  const strValue = typeof value === "number" ? value.toString() : value;
  
  // Remove tudo que não é número ou vírgula/ponto
  let numbers = strValue.replace(/[^\d,.-]/g, "");
  
  // Substitui ponto por vírgula se for decimal
  numbers = numbers.replace(".", ",");
  
  // Se não tem vírgula, adiciona ,00
  if (!numbers.includes(",")) {
    const num = parseInt(numbers) || 0;
    return formatNumberToBRL(num);
  }
  
  // Separa parte inteira e decimal
  const parts = numbers.split(",");
  const intPart = parseInt(parts[0].replace(/\D/g, "")) || 0;
  const decPart = parts[1] ? parts[1].slice(0, 2).padEnd(2, "0") : "00";
  
  // Formata a parte inteira com separador de milhares
  const formattedInt = intPart.toLocaleString("pt-BR");
  
  return `${formattedInt},${decPart}`;
}

/**
 * Formata um número para o formato brasileiro com decimais
 */
export function formatNumberToBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Remove a formatação de moeda e retorna o valor numérico
 */
export function unformatCurrency(value: string): number {
  if (!value) return 0;
  
  // Remove pontos de milhar e substitui vírgula por ponto
  const cleaned = value
    .replace(/\./g, "")
    .replace(",", ".");
  
  return parseFloat(cleaned) || 0;
}

/**
 * Formata entrada de moeda enquanto digita
 */
export function formatCurrencyInput(value: string): string {
  // Remove tudo que não é número
  const numbers = value.replace(/\D/g, "");
  
  if (!numbers) return "";
  
  // Converte para centavos e depois para reais
  const cents = parseInt(numbers);
  const reais = cents / 100;
  
  return formatNumberToBRL(reais);
}
