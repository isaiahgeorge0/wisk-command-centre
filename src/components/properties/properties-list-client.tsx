"use client";

import { Building2, Plus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { PageTransition } from "@/components/layout/page-transition";
import { DeletePropertyDialog } from "@/components/properties/delete-property-dialog";
import { PropertyCard } from "@/components/properties/property-card";
import { PropertyFormDialog } from "@/components/properties/property-form-dialog";
import { Button } from "@/components/ui/button";
import { PROPERTIES_ACCENT } from "@/lib/properties/constants";
import type { Property, PropertyWithStats } from "@/lib/properties/types";

type PropertiesListClientProps = {
  initialProperties: PropertyWithStats[];
};

export function PropertiesListClient({
  initialProperties,
}: PropertiesListClientProps) {
  const router = useRouter();
  const [properties, setProperties] = useState(initialProperties);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PropertyWithStats | null>(
    null
  );

  useEffect(() => {
    setProperties(initialProperties);
  }, [initialProperties]);

  const handleAdd = useCallback(() => {
    setEditingProperty(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((property: PropertyWithStats) => {
    setEditingProperty(property);
    setFormOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((property: PropertyWithStats) => {
    setDeleteTarget(property);
  }, []);

  const handleDeleted = useCallback(
    (id: string) => {
      setProperties((prev) => prev.filter((property) => property.id !== id));
      router.refresh();
    },
    [router]
  );

  const handleSaved = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <PageTransition>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          className="mb-0"
          title="Properties"
          subtitle="Manage your property portfolio."
          icon={
            <Building2 className="size-6" style={{ color: PROPERTIES_ACCENT }} />
          }
        />
        <Button
          onClick={handleAdd}
          className="min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90"
        >
          <Plus className="size-4" />
          Add property
        </Button>
      </div>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/20 bg-card/40 px-6 py-16 text-center">
          <Building2 className="mb-4 size-10 text-amber-500" />
          <h2 className="text-lg font-medium text-foreground">No properties yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Add your first property to start tracking tenants, maintenance, and
            portfolio performance.
          </p>
          <Button
            className="mt-6 min-h-11 gap-2 bg-amber-500 text-white hover:bg-amber-500/90"
            onClick={handleAdd}
          >
            <Plus className="size-4" />
            Add property
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property, index) => (
            <PropertyCard
              key={property.id}
              property={property}
              index={index}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      <PropertyFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        property={editingProperty}
        onSaved={handleSaved}
      />

      <DeletePropertyDialog
        property={deleteTarget}
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={handleDeleted}
      />
    </PageTransition>
  );
}
