'use client';

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
import { Textarea } from '@/components/ui/Textarea';
import { listReviews, moderateReview, type AdminReview } from '@/features/admin/reviewsApi';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/lib/toast';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_COLOR: Record<AdminReview['status'], 'neutral' | 'success' | 'error'> = {
  pending: 'neutral',
  approved: 'success',
  rejected: 'error',
};

export function ReviewsContent(): ReactNode {
  const [reviews, setReviews] = useState<AdminReview[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('pending');
  const [rejectTarget, setRejectTarget] = useState<AdminReview | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [replyTarget, setReplyTarget] = useState<AdminReview | null>(null);
  const [replyText, setReplyText] = useState('');

  function load(): void {
    listReviews({ status: status === 'all' ? undefined : status })
      .then(({ reviews: r }) => setReviews(r))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load reviews.'),
      );
  }
  useEffect(load, [status]);

  async function act(
    review: AdminReview,
    action: 'approve' | 'feature' | 'unfeature',
  ): Promise<void> {
    try {
      await moderateReview(review._id, { action });
      toast.success('Review updated');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update review.');
    }
  }

  async function submitReject(): Promise<void> {
    if (!rejectTarget || !rejectReason.trim()) return;
    try {
      await moderateReview(rejectTarget._id, { action: 'reject', reason: rejectReason.trim() });
      toast.success('Review rejected');
      setRejectTarget(null);
      setRejectReason('');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not reject review.');
    }
  }

  async function submitReply(): Promise<void> {
    if (!replyTarget || !replyText.trim()) return;
    try {
      await moderateReview(replyTarget._id, { action: 'reply', reply: replyText.trim() });
      toast.success('Reply posted');
      setReplyTarget(null);
      setReplyText('');
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not post reply.');
    }
  }

  const columns: TableColumn<AdminReview>[] = [
    {
      key: 'customer',
      header: 'Customer',
      render: (r) => {
        const user = typeof r.userId === 'object' ? r.userId : null;
        return (
          <div>
            <div className="font-medium">{user?.name ?? 'Unnamed'}</div>
            <div className="text-text-muted text-xs">{user?.phone ?? '—'}</div>
          </div>
        );
      },
    },
    {
      key: 'order',
      header: 'Order',
      render: (r) => (typeof r.orderId === 'object' ? (r.orderId?.orderNumber ?? '—') : '—'),
    },
    { key: 'rating', header: 'Rating', render: (r) => `${r.rating} ★` },
    {
      key: 'comment',
      header: 'Comment',
      render: (r) => <span className="line-clamp-2 max-w-xs">{r.comment ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge color={STATUS_COLOR[r.status]}>{r.status}</Badge>,
    },
    {
      key: 'featured',
      header: 'Featured',
      render: (r) =>
        r.isFeatured ? (
          <Badge color="accent">Yes</Badge>
        ) : (
          <span className="text-text-muted">No</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          {r.status === 'pending' && (
            <>
              <Button size="sm" variant="ghost" onClick={() => void act(r, 'approve')}>
                Approve
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRejectTarget(r)}>
                Reject
              </Button>
            </>
          )}
          {r.status === 'approved' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void act(r, r.isFeatured ? 'unfeature' : 'feature')}
            >
              {r.isFeatured ? 'Unfeature' : 'Feature'}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setReplyTarget(r);
              setReplyText(r.adminReply ?? '');
            }}
          >
            Reply
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-text text-xl font-semibold">Reviews</h1>
        <div className="w-48">
          <Select label="" options={STATUS_OPTIONS} value={status} onValueChange={setStatus} />
        </div>
      </div>

      {error && <ErrorState title="Couldn't load reviews" description={error} />}

      <Table
        columns={columns}
        data={reviews ?? []}
        getRowKey={(r) => r._id}
        isLoading={reviews === null && !error}
        emptyState={
          <EmptyState title="No reviews here" description="Nothing matches this filter." />
        }
      />

      <Modal
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="Reject review"
      >
        <div className="flex flex-col gap-4">
          <Textarea
            label="Reason"
            required
            maxLength={500}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            helperText="Kept internally in the audit log — not shown to the customer."
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={!rejectReason.trim()}
              onClick={() => void submitReject()}
            >
              Reject review
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(replyTarget)}
        onOpenChange={(open) => !open && setReplyTarget(null)}
        title="Public reply"
      >
        <div className="flex flex-col gap-4">
          <Textarea
            label="Reply"
            required
            maxLength={1000}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            helperText="Shown publicly alongside this review."
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReplyTarget(null)}>
              Cancel
            </Button>
            <Button disabled={!replyText.trim()} onClick={() => void submitReply()}>
              Post reply
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
