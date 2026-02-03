"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "SNOOZED" | "ALL";

interface StatusFilterProps {
  value: ApprovalStatus;
  onChange: (status: ApprovalStatus) => void;
}

const STATUS_OPTIONS: { value: ApprovalStatus; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "SNOOZED", label: "Snoozed" },
];

export function StatusFilter({ value, onChange }: StatusFilterProps): JSX.Element {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ApprovalStatus)}>
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
