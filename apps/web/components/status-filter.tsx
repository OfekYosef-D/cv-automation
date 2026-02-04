"use client";

import type { ApprovalStatusFilter } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface StatusFilterProps {
  value: ApprovalStatusFilter;
  onChange: (status: ApprovalStatusFilter) => void;
}

const STATUS_OPTIONS: { value: ApprovalStatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SNOOZED", label: "Snoozed" },
];

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ApprovalStatusFilter)}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
