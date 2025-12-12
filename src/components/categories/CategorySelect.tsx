import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
}

interface CategorySelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CategorySelect({
  value,
  onValueChange,
  placeholder = "Selecione uma categoria",
  disabled = false,
}: CategorySelectProps) {
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
  });

  // Build hierarchical display with indentation
  const buildOptions = (
    categories: Category[],
    parentId: string | null = null,
    level: number = 0
  ): { id: string; name: string; level: number }[] => {
    const result: { id: string; name: string; level: number }[] = [];
    
    const children = categories
      .filter((c) => c.parent_id === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const child of children) {
      result.push({ id: child.id, name: child.name, level });
      result.push(...buildOptions(categories, child.id, level + 1));
    }

    return result;
  };

  const options = buildOptions(categories);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger>
        <SelectValue placeholder={isLoading ? "Carregando..." : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            <span style={{ paddingLeft: `${option.level * 16}px` }}>
              {option.level > 0 && "└ "}
              {option.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
