"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";

interface ItemRow {
  description: string;
  quantity: string;
  unitPrice: string;
}

function toNumber(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function InvoiceItemsField() {
  const [rows, setRows] = useState<ItemRow[]>([
    { description: "", quantity: "1", unitPrice: "" },
  ]);

  const subtotal = rows.reduce(
    (sum, r) => sum + toNumber(r.quantity) * toNumber(r.unitPrice),
    0,
  );

  const updateRow = (index: number, key: keyof ItemRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { description: "", quantity: "1", unitPrice: "" }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const itemsJson = JSON.stringify(
    rows
      .filter((r) => r.description.trim() !== "")
      .map((r) => ({
        description: r.description,
        quantity: toNumber(r.quantity),
        unitPrice: toNumber(r.unitPrice),
      })),
  );

  return (
    <div className="space-y-3">
      <input type="hidden" name="items" value={itemsJson} />
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground">
        <span className="col-span-6">Description</span>
        <span className="col-span-2">Qty</span>
        <span className="col-span-2">Unit price (AED)</span>
        <span className="col-span-1 text-right">Amount</span>
        <span className="col-span-1" />
      </div>
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-12 items-center gap-2">
          <div className="col-span-6 space-y-1">
            <Label htmlFor={`item-desc-${index}`} className="sr-only">
              Description
            </Label>
            <Input
              id={`item-desc-${index}`}
              value={row.description}
              placeholder="Service or item"
              onChange={(e) => updateRow(index, "description", e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={row.quantity}
              onChange={(e) => updateRow(index, "quantity", e.target.value)}
            />
          </div>
          <div className="col-span-2 space-y-1">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={row.unitPrice}
              onChange={(e) => updateRow(index, "unitPrice", e.target.value)}
            />
          </div>
          <div className="col-span-1 text-right text-sm">
            {formatCurrency(toNumber(row.quantity) * toNumber(row.unitPrice))}
          </div>
          <div className="col-span-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(index)} aria-label="Remove row">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button type="button" variant="secondary" size="sm" onClick={addRow}>
          <Plus className="size-4" /> Add item
        </Button>
        <div className="text-sm font-medium">
          Subtotal: <span className="font-semibold">{formatCurrency(subtotal)}</span>
        </div>
      </div>
    </div>
  );
}
