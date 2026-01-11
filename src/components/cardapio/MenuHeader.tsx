import { MapPin, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoDefault from "@/assets/logo-churrosteria.png";

interface MenuHeaderProps {
  bannerUrl: string | null;
  logoUrl: string | null;
  storeName: string;
  description: string;
  address: string;
  openingHours: string;
  whatsapp: string;
}

export function MenuHeader({
  bannerUrl,
  logoUrl,
  storeName,
  description,
  address,
  openingHours,
  whatsapp,
}: MenuHeaderProps) {
  const handleWhatsApp = () => {
    if (whatsapp) {
      const cleanNumber = whatsapp.replace(/\D/g, "");
      window.open(`https://wa.me/55${cleanNumber}`, "_blank");
    }
  };

  return (
    <header className="relative">
      {/* Banner */}
      <div className="h-40 sm:h-56 bg-gradient-to-r from-primary/20 to-accent/20 overflow-hidden">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10" />
        )}
      </div>

      {/* Logo and Info */}
      <div className="relative px-4 pb-4 -mt-12">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          {/* Logo */}
          <div className="w-24 h-24 rounded-2xl border-4 border-background bg-background shadow-lg overflow-hidden flex-shrink-0">
            <img
              src={logoUrl || logoDefault}
              alt={storeName}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Store Info */}
          <div className="flex-1 sm:pb-2">
            <h1 className="text-2xl font-bold text-foreground">{storeName}</h1>
            <p className="text-muted-foreground text-sm mt-1">{description}</p>
            
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
              {address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{address}</span>
                </div>
              )}
              {openingHours && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{openingHours}</span>
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Button */}
          {whatsapp && (
            <Button
              onClick={handleWhatsApp}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
