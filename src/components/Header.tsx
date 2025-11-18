import { User } from "lucide-react";
import { Button } from "./ui/button";

interface HeaderProps {
  title?: string;
}

export const Header = ({ title = "SorvetIA" }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-card border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 max-w-md mx-auto">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {title}
        </h1>
        <Button variant="ghost" size="icon" className="rounded-full">
          <User className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};
