import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare } from "lucide-react";

interface EditCouponMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMessage: string;
  customerPhone: string;
  onConfirm: (editedMessage: string) => void;
}

export function EditCouponMessageDialog({
  open,
  onOpenChange,
  initialMessage,
  customerPhone,
  onConfirm,
}: EditCouponMessageDialogProps) {
  const [message, setMessage] = useState(initialMessage);

  const handleConfirm = () => {
    onConfirm(message);
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setMessage(initialMessage);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Editar Mensagem do Cupom
          </DialogTitle>
          <DialogDescription>
            Edite a mensagem antes de compartilhar via WhatsApp com o cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Mensagem</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite a mensagem..."
              className="min-h-[200px] resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/1000 caracteres
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Para:</p>
            <p className="text-sm">{customerPhone}</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!message.trim()}
          >
            Enviar para WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
