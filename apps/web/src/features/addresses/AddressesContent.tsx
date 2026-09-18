'use client';

import type { AddressPayload } from '@clenzy/shared';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { AddressForm } from '@/features/addresses/AddressForm';
import { AddressList } from '@/features/addresses/AddressList';
import { deleteAddress, listAddresses, setDefaultAddress } from '@/features/addresses/api';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/lib/toast';

export function AddressesContent(): ReactNode {
  const [addresses, setAddresses] = useState<AddressPayload[] | null>(null);
  const [error, setError] = useState<string>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AddressPayload | undefined>(undefined);

  function load(): void {
    listAddresses()
      .then((result) => setAddresses(result.addresses))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load your addresses.'),
      );
  }

  useEffect(load, []);

  async function handleSetDefault(id: string): Promise<void> {
    try {
      await setDefaultAddress(id);
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not set default address.');
    }
  }

  async function handleDelete(id: string): Promise<void> {
    try {
      await deleteAddress(id);
      toast.success('Address removed');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not remove this address.');
    }
  }

  const defaultAddress = addresses?.find((a) => a.isDefault);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-text text-2xl font-semibold">Your addresses</h1>
        <Button
          size="sm"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add address
        </Button>
      </div>

      {error && <ErrorState title="Couldn't load your addresses" description={error} />}

      {!error && addresses === null && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {!error && addresses && addresses.length === 0 && (
        <EmptyState
          title="No saved addresses"
          description="Add an address to speed up checkout next time."
          action={{ label: 'Add address', onClick: () => setFormOpen(true) }}
        />
      )}

      {!error && addresses && addresses.length > 0 && (
        <AddressList
          addresses={addresses}
          selectedId={defaultAddress?.id ?? null}
          ariaLabel="Your saved addresses — select to set as default"
          onSelect={(id) => void handleSetDefault(id)}
          onEdit={(address) => {
            setEditing(address);
            setFormOpen(true);
          }}
          onDelete={handleDelete}
        />
      )}

      <Modal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? 'Edit address' : 'Add address'}
      >
        <AddressForm
          address={editing}
          onSaved={() => {
            setFormOpen(false);
            load();
          }}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>
    </div>
  );
}
