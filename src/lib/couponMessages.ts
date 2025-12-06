import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CouponMessageSettings {
  message5?: string;
  message10?: string;
  minPurchase5?: number;
  minPurchase10?: number;
}

export function generateCouponMessage(
  customerName: string,
  couponValue: number,
  expiryDate: string,
  settings?: CouponMessageSettings
): string {
  const formattedDate = format(new Date(expiryDate), "dd/MM/yyyy", {
    locale: ptBR,
  });

  const minPurchase5 = settings?.minPurchase5 ?? 30;
  const minPurchase10 = settings?.minPurchase10 ?? 50;

  const defaultMessage5 = `| CUPOM CASHBACK | 

Olá {nome}! Amei te atender hoje!
Uhuu! Você garantiu R${'{valor}'} de cashback para usar na Churrosteria! 
Use na sua próxima compra dentro de 7 dias.
Corre pra aproveitar e experimentar uma delícia nova!  Qualquer dúvida é só chamar! 
Validade: {validade}
Ele pode ser utilizado em compras a partir de R${'{minimo}'}.
Use e já garante um novo cupom. Te vejo em breve!`;

  const defaultMessage10 = `| CUPOM CASHBACK | 

Olá {nome}! Amei te atender hoje!
Uhuu! Você garantiu R${'{valor}'} de cashback para usar na Churrosteria!
Use na sua próxima compra dentro de 7 dias.
Corre pra aproveitar e experimentar uma delícia nova! Qualquer dúvida é só chamar! 
Validade: {validade}
Ele pode ser utilizado em compras a partir de R${'{minimo}'}.
Use e já garanta um novo cupom. Te vejo em breve!`;

  const template = couponValue <= 5 
    ? (settings?.message5 || defaultMessage5)
    : (settings?.message10 || defaultMessage10);

  const minPurchase = couponValue <= 5 ? minPurchase5 : minPurchase10;

  return template
    .replace(/{nome}/g, customerName)
    .replace(/{valor}/g, couponValue.toString())
    .replace(/{validade}/g, formattedDate)
    .replace(/{minimo}/g, minPurchase.toFixed(2).replace('.', ','));
}
