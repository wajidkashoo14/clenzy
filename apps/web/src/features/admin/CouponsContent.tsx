'use client';

import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import type { TableColumn } from '@/components/ui/Table';
import { Table } from '@/components/ui/Table';
import { CouponModal } from '@/features/admin/CouponModal';
import {
  deactivateCoupon,
  getCouponRedemptions,
  listCoupons,
  type AdminCoupon,
  type AdminCouponRedemption,
} from '@/features/admin/couponsApi';
import { ApiError } from '@/lib/api-client';
import { formatDateTime, formatRupees } from '@/lib/format';
import { toast } from '@/lib/toast';

export function CouponsContent(): ReactNode {
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('all');
  const [coupons, setCoupons] = useState<AdminCoupon[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [redemptionsFor, setRedemptionsFor] = useState<AdminCoupon | null>(null);
  const [redemptions, setRedemptions] = useState<AdminCouponRedemption[] | null>(null);

  function load(): void {
    listCoupons({ status, page: 1, pageSize: 100 })
      .then(({ coupons: c }) => setCoupons(c))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load coupons.'),
      );
  }
  useEffect(load, [status]);

  async function handleDeactivate(coupon: AdminCoupon): Promise<void> {
    try {
      await deactivateCoupon(coupon._id);
      toast.success('Coupon deactivated');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not deactivate coupon.');
    }
  }

  function openRedemptions(coupon: AdminCoupon): void {
    setRedemptionsFor(coupon);
    setRedemptions(null);
    getCouponRedemptions(coupon._id)
      .then(({ redemptions: r }) => setRedemptions(r))
      .catch(() => setRedemptions([]));
  }

  const columns: TableColumn<AdminCoupon>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (c) => <span className="font-mono font-medium">{c.code}</span>,
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (c) =>
        c.discountType === 'percentage' ? `${c.discountValue}%` : formatRupees(c.discountValue),
    },
    {
      key: 'validity',
      header: 'Validity',
      render: (c) => `${formatDateTime(c.validFrom)} – ${formatDateTime(c.validUntil)}`,
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (c) => `${c.usedCount}${c.usageLimitTotal ? ` / ${c.usageLimitTotal}` : ''}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) =>
        c.isActive ? (
          <Badge color="success">Active</Badge>
        ) : (
          <Badge color="neutral">Inactive</Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => openRedemptions(c)}>
            Redemptions
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(c);
              setModalOpen(true);
            }}
          >
            Edit
          </Button>
          {c.isActive && (
            <Button size="sm" variant="ghost" onClick={() => void handleDeactivate(c)}>
              Deactivate
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-text text-xl font-semibold">Coupons</h1>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          New coupon
        </Button>
      </div>

      <div className="w-40">
        <Select
          label="Status"
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
          value={status}
          onValueChange={(v) => setStatus(v as typeof status)}
        />
      </div>

      <Table
        columns={columns}
        data={coupons ?? []}
        getRowKey={(c) => c._id}
        isLoading={coupons === null && !error}
        errorState={
          error ? <ErrorState title="Couldn't load coupons" description={error} /> : undefined
        }
        emptyState={<EmptyState title="No coupons yet" description="Create one to get started." />}
      />

      <CouponModal open={modalOpen} onOpenChange={setModalOpen} coupon={editing} onSaved={load} />

      <Modal
        open={Boolean(redemptionsFor)}
        onOpenChange={(open) => !open && setRedemptionsFor(null)}
        title={`Redemptions — ${redemptionsFor?.code ?? ''}`}
        size="md"
      >
        {redemptions === null ? (
          <p className="text-text-muted text-sm">Loading…</p>
        ) : redemptions.length === 0 ? (
          <p className="text-text-muted text-sm">No redemptions yet.</p>
        ) : (
          <ul className="divide-border flex flex-col divide-y">
            {redemptions.map((r) => (
              <li key={r._id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="text-text">
                    {r.userId?.name ?? r.userId?.phone ?? 'Unknown customer'}
                  </p>
                  <p className="text-text-muted text-xs">
                    {r.orderId?.orderNumber ?? '—'} · {formatDateTime(r.redeemedAt)}
                  </p>
                </div>
                <span className="text-text font-medium">{formatRupees(r.discountAmount)}</span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
