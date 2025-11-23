import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function generateCouponMessage(
  customerName: string,
  couponValue: number,
  expiryDate: string
): string {
  const formattedDate = format(new Date(expiryDate), "dd/MM/yyyy", {
    locale: ptBR,
  });

  if (couponValue === 5) {
    return `| CUPOM CASHBACK | 

Olá ${customerName}! Amei te atender hoje!
Uhuu! Você garantiu R$5,00 de cashback para usar na Churrosteria! 
Use na sua próxima compra dentro de 7 dias.
Corre pra aproveitar e experimentar uma delícia nova!  Qualquer dúvida é só chamar! 
Validade: ${formattedDate}
Ele pode ser utilizado em compras a partir de R$30,00.
Use e já garante um novo cupom. Te vejo em breve!`;
  } else {
    return `| CUPOM CASHBACK | 

Olá ${customerName}! Amei te atender hoje!
Uhuu! Você garantiu R$10,00 de cashback para usar na Churrosteria!
Use na sua próxima compra dentro de 7 dias.
Corre pra aproveitar e experimentar uma delícia nova! Qualquer dúvida é só chamar! 
Validade: ${formattedDate}
Ele pode ser utilizado em compras a partir de R$50,00.
Use e já garanta um novo cupom. Te vejo em breve!`;
  }
}
