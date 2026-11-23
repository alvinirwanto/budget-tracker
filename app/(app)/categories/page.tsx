"use client";

import { useState } from "react";
import { PlusIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CategoryForm } from "@/components/category-form";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/page-bits";
import { Sheet } from "@/components/sheet";
import { CategoryBadge } from "@/components/visuals";
import { actions, useAppState } from "@/lib/store";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  const state = useAppState();
  const [editing, setEditing] = useState<{ category?: Category; n: number } | null>(null);
  const [confirm, setConfirm] = useState(false);

  if (!state.hydrated) return <Skeleton />;
  const uses = (id: string) => state.transactions.filter((t) => t.categoryId === id).length;

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Categories"
        back="/profile"
        subtitle="What you can tag an expense with"
        action={
          <Button
            className="h-11 rounded-full px-4 font-bold"
            onClick={() => setEditing({ n: Date.now() })}
          >
            <PlusIcon className="size-4" weight="bold" /> New
          </Button>
        }
      />

      {state.categories.length === 0 ? (
        <EmptyState
          title="No categories"
          body="Add a few, like Food or Gas, to tag expenses and split budgets."
          action={<Button className="h-11 rounded-full px-5" onClick={() => setEditing({ n: Date.now() })}>Add category</Button>}
        />
      ) : (
        <Card className="px-4 py-1">
          <ul className="grid md:grid-cols-2 md:gap-x-8 [&>li:not(:first-child)]:border-t md:[&>li:nth-child(2)]:border-t-0">
            {state.categories.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setEditing({ category: c, n: Date.now() })}
                  className="flex w-full items-center gap-3 py-3 text-left focus-visible:outline-3 focus-visible:outline-ring"
                >
                  <CategoryBadge category={c} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{c.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {uses(c.id)} transaction{uses(c.id) === 1 ? "" : "s"}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Sheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing?.category ? `Edit ${editing.category.name}` : "New category"}
        description="Pick a name, an icon and a color."
      >
        {editing && (
          <CategoryForm
            key={editing.n}
            category={editing.category}
            onDone={() => setEditing(null)}
            onDelete={editing.category ? () => setConfirm(true) : undefined}
          />
        )}
      </Sheet>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${editing?.category?.name ?? "category"}?`}
        description="Past transactions stay, but lose this tag. It is also removed from any budget split."
        confirmLabel="Delete"
        onConfirm={() => {
          if (editing?.category) actions.deleteCategory(editing.category.id);
          toast.success("Category deleted");
          setEditing(null);
        }}
      />
    </div>
  );
}
