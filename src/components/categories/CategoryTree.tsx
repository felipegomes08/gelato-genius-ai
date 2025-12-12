import { useState } from "react";
import { Category } from "@/pages/Categorias";
import { CategoryTreeItem } from "./CategoryTreeItem";

interface CategoryTreeProps {
  categories: Category[];
  productCounts: Record<string, number>;
  onEdit: (category: Category) => void;
  onAddSubcategory: (parentId: string) => void;
}

export function CategoryTree({
  categories,
  productCounts,
  onEdit,
  onAddSubcategory,
}: CategoryTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const getChildren = (parentId: string | null): Category[] => {
    return categories
      .filter((c) => c.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  };

  const hasChildren = (categoryId: string): boolean => {
    return categories.some((c) => c.parent_id === categoryId);
  };

  // Calculate total products including subcategories
  const getTotalProducts = (categoryId: string): number => {
    let total = productCounts[categoryId] || 0;
    const children = getChildren(categoryId);
    for (const child of children) {
      total += getTotalProducts(child.id);
    }
    return total;
  };

  const rootCategories = getChildren(null);

  return (
    <div className="space-y-1">
      {rootCategories.map((category) => (
        <CategoryTreeItem
          key={category.id}
          category={category}
          level={0}
          isExpanded={expandedIds.has(category.id)}
          hasChildren={hasChildren(category.id)}
          productCount={getTotalProducts(category.id)}
          onToggle={() => toggleExpand(category.id)}
          onEdit={() => onEdit(category)}
          onAddSubcategory={() => onAddSubcategory(category.id)}
        >
          {expandedIds.has(category.id) && hasChildren(category.id) && (
            <div className="ml-4 mt-1 space-y-1 border-l pl-2">
              {getChildren(category.id).map((child) => (
                <CategoryTreeItemRecursive
                  key={child.id}
                  category={child}
                  level={1}
                  categories={categories}
                  expandedIds={expandedIds}
                  productCounts={productCounts}
                  onToggle={toggleExpand}
                  onEdit={onEdit}
                  onAddSubcategory={onAddSubcategory}
                  getChildren={getChildren}
                  hasChildren={hasChildren}
                  getTotalProducts={getTotalProducts}
                />
              ))}
            </div>
          )}
        </CategoryTreeItem>
      ))}
    </div>
  );
}

interface CategoryTreeItemRecursiveProps {
  category: Category;
  level: number;
  categories: Category[];
  expandedIds: Set<string>;
  productCounts: Record<string, number>;
  onToggle: (id: string) => void;
  onEdit: (category: Category) => void;
  onAddSubcategory: (parentId: string) => void;
  getChildren: (parentId: string | null) => Category[];
  hasChildren: (categoryId: string) => boolean;
  getTotalProducts: (categoryId: string) => number;
}

function CategoryTreeItemRecursive({
  category,
  level,
  categories,
  expandedIds,
  productCounts,
  onToggle,
  onEdit,
  onAddSubcategory,
  getChildren,
  hasChildren,
  getTotalProducts,
}: CategoryTreeItemRecursiveProps) {
  const isExpanded = expandedIds.has(category.id);
  const hasChildrenItems = hasChildren(category.id);

  return (
    <CategoryTreeItem
      category={category}
      level={level}
      isExpanded={isExpanded}
      hasChildren={hasChildrenItems}
      productCount={getTotalProducts(category.id)}
      onToggle={() => onToggle(category.id)}
      onEdit={() => onEdit(category)}
      onAddSubcategory={() => onAddSubcategory(category.id)}
    >
      {isExpanded && hasChildrenItems && (
        <div className="ml-4 mt-1 space-y-1 border-l pl-2">
          {getChildren(category.id).map((child) => (
            <CategoryTreeItemRecursive
              key={child.id}
              category={child}
              level={level + 1}
              categories={categories}
              expandedIds={expandedIds}
              productCounts={productCounts}
              onToggle={onToggle}
              onEdit={onEdit}
              onAddSubcategory={onAddSubcategory}
              getChildren={getChildren}
              hasChildren={hasChildren}
              getTotalProducts={getTotalProducts}
            />
          ))}
        </div>
      )}
    </CategoryTreeItem>
  );
}
