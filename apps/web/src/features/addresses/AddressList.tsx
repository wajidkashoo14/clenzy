'use client';

import type { AddressPayload } from '@clenzy/shared';
import { Check, MapPinOff, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

const LABEL_TEXT: Record<AddressPayload['label'], string> = {
  home: 'Home',
  work: 'Work',
  other: 'Other',
};

interface AddressCardProps {
  address: AddressPayload;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

function AddressCard({
  address,
  selected,
  onSelect,
  onEdit,
  onDelete,
}: AddressCardProps): ReactNode {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        'border-border-strong bg-surface flex cursor-pointer flex-col gap-2 rounded-lg border p-4',
        'duration-fast ease-standard transition-[border-color,box-shadow]',
        selected && 'border-primary shadow-focus',
        !address.isServiceable && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge color={selected ? 'primary' : 'neutral'}>{LABEL_TEXT[address.label]}</Badge>
          {address.isDefault && <Badge color="secondary">Default</Badge>}
          {!address.isServiceable && (
            <Badge color="error" dot>
              <MapPinOff className="size-3" aria-hidden="true" />
              Not serviceable
            </Badge>
          )}
        </div>
        {selected && (
          <span className="bg-primary text-text-inverse flex size-5 shrink-0 items-center justify-center rounded-full">
            <Check className="size-3.5" aria-hidden="true" />
          </span>
        )}
      </div>

      <div className="text-sm">
        <p className="text-text font-medium">{address.contactName}</p>
        <p className="text-text-muted">
          {address.line1}
          {address.line2 ? `, ${address.line2}` : ''}
          {address.landmark ? ` (near ${address.landmark})` : ''}
        </p>
        <p className="text-text-muted">
          {address.area}, {address.city} – {address.pincode}
        </p>
        <p className="text-text-muted">{address.contactPhone}</p>
      </div>

      <div className="mt-1 flex items-center gap-4 text-[13px]">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="text-text-muted hover:text-text flex items-center gap-1 underline"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          Edit
        </button>
        {confirmingDelete ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <span className="text-text-muted">Remove this address?</span>
            <button
              type="button"
              disabled={isDeleting}
              onClick={async () => {
                setIsDeleting(true);
                await onDelete();
              }}
              className="text-error font-semibold underline disabled:opacity-45"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="text-text-muted underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setConfirmingDelete(true);
            }}
            className="text-text-muted hover:text-error flex items-center gap-1 underline"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

interface AddressListProps {
  addresses: AddressPayload[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (address: AddressPayload) => void;
  onDelete: (id: string) => Promise<void>;
}

/** Selectable radio-card list — see docs/DESIGN_SYSTEM.md §5 "Checkout components". */
export function AddressList({
  addresses,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: AddressListProps): ReactNode {
  return (
    <div role="radiogroup" aria-label="Delivery address" className="flex flex-col gap-3">
      {addresses.map((address) => (
        <AddressCard
          key={address.id}
          address={address}
          selected={address.id === selectedId}
          onSelect={() => onSelect(address.id)}
          onEdit={() => onEdit(address)}
          onDelete={() => onDelete(address.id)}
        />
      ))}
    </div>
  );
}
