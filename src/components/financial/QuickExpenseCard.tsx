import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Camera, Upload, Loader2, User, Store, X, Image as ImageIcon } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { unformatCurrency } from "@/lib/formatters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const quickCategories = [
  "Supermercado",
  "Matéria-prima",
  "Embalagens",
  "Combustível",
  "Manutenção",
  "Outros",
];

export function QuickExpenseCard() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [paymentSource, setPaymentSource] = useState<"personal" | "company" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleImageSelect = async (file: File) => {
    // Create preview
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      
      // Process OCR
      setIsProcessingOCR(true);
      try {
        const { data, error } = await supabase.functions.invoke('extract-receipt-value', {
          body: { imageBase64: base64 }
        });

        if (error) {
          console.error('OCR error:', error);
          toast.error('Não foi possível ler o comprovante automaticamente');
        } else if (data?.valor) {
          setAmount(data.valor.toFixed(2).replace('.', ','));
          if (data.estabelecimento) {
            setDescription(data.estabelecimento);
          }
          toast.success('Valor extraído automaticamente!');
        } else {
          toast.info('Não foi possível identificar o valor. Digite manualmente.');
        }
      } catch (err) {
        console.error('OCR processing error:', err);
        toast.error('Erro ao processar imagem');
      } finally {
        setIsProcessingOCR(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!amount || !description || !paymentSource) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const amountValue = unformatCurrency(amount);
    if (amountValue <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Você precisa estar logado');
        return;
      }

      // Upload image if exists
      let receiptUrl = null;
      if (imagePreview) {
        const fileName = `${user.id}/${Date.now()}.jpg`;
        const base64Data = imagePreview.split(',')[1];
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, decode(base64Data), {
            contentType: 'image/jpeg'
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('receipts')
            .getPublicUrl(fileName);
          receiptUrl = publicUrl;
        }
      }

      const { error } = await supabase.from('financial_transactions').insert({
        transaction_type: 'expense',
        description,
        category: category || 'Outros',
        amount: amountValue,
        payment_method: 'N/A',
        transaction_date: new Date().toISOString(),
        created_by: user.id,
        payment_source: paymentSource,
        reimbursement_status: paymentSource === 'personal' ? 'pending' : null,
        receipt_url: receiptUrl,
        is_paid: true,
      });

      if (error) throw error;

      toast.success(
        paymentSource === 'personal' 
          ? 'Despesa registrada! Pendente de reembolso.' 
          : 'Despesa registrada com sucesso!'
      );

      // Reset form
      setAmount('');
      setDescription('');
      setCategory('');
      setPaymentSource(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      queryClient.invalidateQueries({ queryKey: ['financial_transactions'] });
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Erro ao salvar despesa');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to decode base64
  function decode(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  return (
    <Card className="shadow-sm border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          Despesa Rápida
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image upload area */}
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          
          {!imagePreview ? (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4 mr-2" />
                Tirar Foto
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                    fileInputRef.current.setAttribute('capture', 'environment');
                  }
                }}
              >
                <Upload className="h-4 w-4 mr-2" />
                Escolher
              </Button>
            </div>
          ) : (
            <div className="relative">
              <img 
                src={imagePreview} 
                alt="Comprovante" 
                className="w-full h-24 object-cover rounded-lg"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={clearImage}
              >
                <X className="h-3 w-3" />
              </Button>
              {isProcessingOCR && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm">Lendo valor...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Amount and description */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Valor (R$)</Label>
            <CurrencyInput
              placeholder="0,00"
              value={amount}
              onChange={setAmount}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {quickCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Descrição</Label>
          <Input
            placeholder="Ex: Supermercado Dia"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-9"
          />
        </div>

        {/* Payment source toggle */}
        <div className="space-y-1.5">
          <Label className="text-xs">Quem pagou?</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={paymentSource === 'personal' ? 'default' : 'outline'}
              size="sm"
              className="h-10"
              onClick={() => setPaymentSource('personal')}
            >
              <User className="h-4 w-4 mr-2" />
              Meu Cartão
            </Button>
            <Button
              type="button"
              variant={paymentSource === 'company' ? 'default' : 'outline'}
              size="sm"
              className="h-10"
              onClick={() => setPaymentSource('company')}
            >
              <Store className="h-4 w-4 mr-2" />
              Cartão Loja
            </Button>
          </div>
          {paymentSource === 'personal' && (
            <p className="text-xs text-muted-foreground mt-1">
              ⚠️ Ficará pendente de reembolso
            </p>
          )}
        </div>

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !amount || !description || !paymentSource}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Despesa'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
