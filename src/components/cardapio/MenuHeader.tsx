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
      <div className="h-32 sm:h-44 bg-gradient-to-r from-primary/20 to-accent/20 overflow-hidden">
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

      {/* Logo and Info Card */}
      <div className="relative px-4 -mt-10">
        <div className="bg-card rounded-xl shadow-lg border p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Logo */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-4 border-background bg-background shadow-md overflow-hidden flex-shrink-0 -mt-12 sm:-mt-14">
              <img
                src={logoUrl || logoDefault}
                alt={storeName}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Store Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                {storeName}
              </h1>
              {description && (
                <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                  {description}
                </p>
              )}
              
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 mt-3 text-sm text-muted-foreground">
                {address && (
                  <div className="flex items-start gap-1.5">
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span className="break-words">{address}</span>
                  </div>
                )}
                {openingHours && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{openingHours}</span>
                  </div>
                )}
              </div>
            </div>

            {/* WhatsApp Button */}
            {whatsapp && (
              <div className="sm:self-start">
                <Button
                  onClick={handleWhatsApp}
                  className="w-full sm:w-auto gap-2 bg-green-600 hover:bg-green-700 text-white shadow-md"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
