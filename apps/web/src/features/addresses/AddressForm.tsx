'use client';

import type { AddressInput, AddressPayload } from '@clenzy/shared';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { createAddress, updateAddress } from '@/features/addresses/api';
import { ApiError } from '@/lib/api-client';

const LABEL_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'other', label: 'Other' },
];

interface AddressFormProps {
  /** Present when editing; omitted when creating. */
  address?: AddressPayload;
  onSaved: (address: AddressPayload) => void;
  onCancel: () => void;
}

/**
 * Manual address entry — no Google Places autocomplete or map pin yet
 * (docs/INTEGRATIONS.md §2.5: no Maps API key provisioned). Serviceability
 * resolves server-side from the pincode alone.
 */
export function AddressForm({ address, onSaved, onCancel }: AddressFormProps): ReactNode {
  const [label, setLabel] = useState(address?.label ?? 'home');
  const [contactName, setContactName] = useState(address?.contactName ?? '');
  const [contactPhone, setContactPhone] = useState(
    address?.contactPhone.replace(/^\+91/, '') ?? '',
  );
  const [line1, setLine1] = useState(address?.line1 ?? '');
  const [line2, setLine2] = useState(address?.line2 ?? '');
  const [landmark, setLandmark] = useState(address?.landmark ?? '');
  const [area, setArea] = useState(address?.area ?? '');
  const [city, setCity] = useState(address?.city ?? 'Srinagar');
  // Clenzy is single-state (J&K) for the MVP — no UI field for it.
  const state = address?.state ?? 'Jammu and Kashmir';
  const [pincode, setPincode] = useState(address?.pincode ?? '');
  const [isDefault, setIsDefault] = useState(address?.isDefault ?? false);

  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    setError(undefined);
    setIsSubmitting(true);
    try {
      const input: AddressInput = {
        label: label as AddressInput['label'],
        contactName,
        contactPhone: contactPhone.startsWith('+') ? contactPhone : `+91${contactPhone}`,
        line1,
        line2: line2 || undefined,
        landmark: landmark || undefined,
        area,
        city,
        state,
        pincode,
        isDefault,
      };
      const result = address ? await updateAddress(address.id, input) : await createAddress(input);
      onSaved(result.address);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this address.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit();
      }}
    >
      <Select
        label="Label"
        options={LABEL_OPTIONS}
        value={label}
        onValueChange={(value) => setLabel(value as AddressInput['label'])}
        required
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Contact name"
          required
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
        />
        <Input
          label="Contact phone"
          prefix="+91"
          required
          type="tel"
          inputMode="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      <Input
        label="Address line 1"
        required
        value={line1}
        onChange={(e) => setLine1(e.target.value)}
        placeholder="House no., street"
      />
      <Input
        label="Address line 2"
        value={line2}
        onChange={(e) => setLine2(e.target.value)}
        placeholder="Optional"
      />
      <Input
        label="Landmark"
        value={landmark}
        onChange={(e) => setLandmark(e.target.value)}
        placeholder="e.g. Near Nehru Park"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="Area" required value={area} onChange={(e) => setArea(e.target.value)} />
        <Input label="City" required value={city} onChange={(e) => setCity(e.target.value)} />
        <Input
          label="Pincode"
          required
          inputMode="numeric"
          maxLength={6}
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      <Checkbox
        label="Set as default address"
        checked={isDefault}
        onCheckedChange={(checked) => setIsDefault(checked === true)}
      />

      {error && <p className="text-error text-sm">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          {address ? 'Save changes' : 'Save address'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
