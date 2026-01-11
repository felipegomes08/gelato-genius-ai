import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface MenuCategoryNavProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export function MenuCategoryNav({
  categories,
  selectedCategory,
  onSelectCategory,
}: MenuCategoryNavProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 p-1">
        <button
          onClick={() => onSelectCategory(null)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all",
            "border border-border hover:border-primary/50",
            selectedCategory === null
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-foreground hover:bg-accent"
          )}
        >
          Todos
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              "border border-border hover:border-primary/50",
              selectedCategory === category.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground hover:bg-accent"
            )}
          >
            {category.name}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
