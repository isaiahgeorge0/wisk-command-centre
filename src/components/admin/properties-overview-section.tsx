"use client";

import { useState, useTransition } from "react";

import { refreshPropertiesOverview } from "@/app/(dashboard)/admin/actions";
import type {
  PropertiesOverview,
  PropertiesOverviewRow,
} from "@/lib/admin/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PropertiesOverviewSectionProps = {
  initialData: PropertiesOverview;
};

function getRow(
  rows: PropertiesOverviewRow[],
  pkg: PropertiesOverviewRow["package"]
): PropertiesOverviewRow {
  return (
    rows.find((r) => r.package === pkg) ?? {
      package: pkg,
      propertiesCount: 0,
      overdueCertificatesCount: 0,
      openMaintenanceTicketsCount: 0,
      missingRentDataCount: 0,
    }
  );
}

export function PropertiesOverviewSection({
  initialData,
}: PropertiesOverviewSectionProps) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const baseRow = getRow(data.rows, "properties");
  const proRow = getRow(data.rows, "properties_pro");

  function totalForMetric(
    key: keyof Omit<PropertiesOverviewRow, "package">
  ) {
    return baseRow[key] + proRow[key];
  }

  function metricCardLine(label: string, value: number) {
    return (
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-semibold">{value.toLocaleString()}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Properties</CardDescription>
            <CardTitle className="text-2xl">{baseRow.propertiesCount.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {metricCardLine("Overdue certificates", baseRow.overdueCertificatesCount)}
              {metricCardLine("Open maintenance", baseRow.openMaintenanceTicketsCount)}
              {metricCardLine("Missing rent data", baseRow.missingRentDataCount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Properties Pro</CardDescription>
            <CardTitle className="text-2xl">{proRow.propertiesCount.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {metricCardLine("Overdue certificates", proRow.overdueCertificatesCount)}
              {metricCardLine("Open maintenance", proRow.openMaintenanceTicketsCount)}
              {metricCardLine("Missing rent data", proRow.missingRentDataCount)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total properties (active package users)</CardDescription>
            <CardTitle className="text-2xl">
              {data.totalProperties.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-muted-foreground">Active package scope</span>
                <Badge variant="outline">Read-only</Badge>
              </div>
              {metricCardLine(
                "Overdue certificates (total)",
                totalForMetric("overdueCertificatesCount")
              )}
              {metricCardLine(
                "Open maintenance (total)",
                totalForMetric("openMaintenanceTicketsCount")
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Aggregated health signals</CardTitle>
            <CardDescription>
              Counts only across all users. No per-property drill-down yet.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await refreshPropertiesOverview();
                if (!result.success) {
                  setError(result.error);
                  return;
                }
                if (!result.data) {
                  setError("No properties overview data returned.");
                  return;
                }
                setData(result.data);
              });
            }}
          >
            {isPending ? "Refreshing…" : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Signal</th>
                  <th className="px-4 py-3 font-medium">Properties</th>
                  <th className="px-4 py-3 font-medium">Properties Pro</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">Overdue certificates</td>
                  <td className="px-4 py-3">{baseRow.overdueCertificatesCount.toLocaleString()}</td>
                  <td className="px-4 py-3">{proRow.overdueCertificatesCount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {totalForMetric("overdueCertificatesCount").toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">Open maintenance tickets</td>
                  <td className="px-4 py-3">{baseRow.openMaintenanceTicketsCount.toLocaleString()}</td>
                  <td className="px-4 py-3">{proRow.openMaintenanceTicketsCount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {totalForMetric("openMaintenanceTicketsCount").toLocaleString()}
                  </td>
                </tr>
                <tr className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">Missing rent data</td>
                  <td className="px-4 py-3">{baseRow.missingRentDataCount.toLocaleString()}</td>
                  <td className="px-4 py-3">{proRow.missingRentDataCount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {totalForMetric("missingRentDataCount").toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

