'use client';

import { ArrowDown, ArrowUp, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Switch } from '@/components/ui/Switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import type { TableColumn } from '@/components/ui/Table';
import { Table } from '@/components/ui/Table';
import { BannerModal } from '@/features/admin/BannerModal';
import {
  deactivateBanner,
  deactivateFaq,
  deactivateTestimonial,
  listBanners,
  listFaqs,
  listTestimonials,
  reorderFaqs,
  updateBanner,
  updateFaq,
  updateTestimonial,
  type AdminBanner,
  type AdminFaq,
  type AdminTestimonial,
} from '@/features/admin/contentApi';
import { FaqModal } from '@/features/admin/FaqModal';
import { TestimonialModal } from '@/features/admin/TestimonialModal';
import { ApiError } from '@/lib/api-client';
import { formatSlotDate } from '@/lib/format';
import { toast } from '@/lib/toast';

function FaqsSection(): ReactNode {
  const [faqs, setFaqs] = useState<AdminFaq[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminFaq | null>(null);

  function load(): void {
    listFaqs()
      .then(({ faqs: f }) => setFaqs(f))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load FAQs.'),
      );
  }
  useEffect(load, []);

  async function move(index: number, direction: -1 | 1): Promise<void> {
    if (!faqs) return;
    const target = index + direction;
    if (target < 0 || target >= faqs.length) return;
    const reordered = [...faqs];
    [reordered[index], reordered[target]] = [reordered[target]!, reordered[index]!];
    setFaqs(reordered);
    try {
      await reorderFaqs({ orderedIds: reordered.map((f) => f._id) });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not reorder FAQs.');
      load();
    }
  }

  async function toggleActive(faq: AdminFaq): Promise<void> {
    try {
      if (faq.isActive) await deactivateFaq(faq._id);
      else await updateFaq(faq._id, { isActive: true });
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update FAQ.');
    }
  }

  const columns: TableColumn<AdminFaq>[] = [
    {
      key: 'order',
      header: '',
      className: 'w-20',
      render: (f) => {
        const index = faqs!.indexOf(f);
        return (
          <div className="flex gap-1">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => void move(index, -1)}
              className="text-text-muted hover:text-text disabled:opacity-30"
              aria-label="Move up"
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              disabled={index === faqs!.length - 1}
              onClick={() => void move(index, 1)}
              className="text-text-muted hover:text-text disabled:opacity-30"
              aria-label="Move down"
            >
              <ArrowDown className="size-4" aria-hidden="true" />
            </button>
          </div>
        );
      },
    },
    {
      key: 'question',
      header: 'Question',
      render: (f) => <span className="font-medium">{f.question}</span>,
    },
    { key: 'category', header: 'Category', render: (f) => f.category },
    {
      key: 'active',
      header: 'Active',
      render: (f) => (
        <Switch label="" checked={f.isActive} onCheckedChange={() => void toggleActive(f)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (f) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditing(f);
            setModalOpen(true);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          New FAQ
        </Button>
      </div>
      {error && <ErrorState title="Couldn't load FAQs" description={error} />}
      <Table
        columns={columns}
        data={faqs ?? []}
        getRowKey={(f) => f._id}
        isLoading={faqs === null && !error}
        emptyState={
          <EmptyState title="No FAQs yet" description="Add one to help customers self-serve." />
        }
      />
      <FaqModal open={modalOpen} onOpenChange={setModalOpen} faq={editing} onSaved={load} />
    </div>
  );
}

function TestimonialsSection(): ReactNode {
  const [testimonials, setTestimonials] = useState<AdminTestimonial[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTestimonial | null>(null);

  function load(): void {
    listTestimonials()
      .then(({ testimonials: t }) => setTestimonials(t))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load testimonials.'),
      );
  }
  useEffect(load, []);

  async function toggleActive(testimonial: AdminTestimonial): Promise<void> {
    try {
      if (testimonial.isActive) await deactivateTestimonial(testimonial._id);
      else await updateTestimonial(testimonial._id, { isActive: true });
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update testimonial.');
    }
  }

  async function toggleFeatured(testimonial: AdminTestimonial): Promise<void> {
    try {
      await updateTestimonial(testimonial._id, { isFeatured: !testimonial.isFeatured });
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update testimonial.');
    }
  }

  const columns: TableColumn<AdminTestimonial>[] = [
    { key: 'name', header: 'Name', render: (t) => <span className="font-medium">{t.name}</span> },
    { key: 'area', header: 'Area', render: (t) => t.area ?? '—' },
    { key: 'rating', header: 'Rating', render: (t) => `${t.rating} ★` },
    {
      key: 'featured',
      header: 'Featured',
      render: (t) => (
        <Switch label="" checked={t.isFeatured} onCheckedChange={() => void toggleFeatured(t)} />
      ),
    },
    {
      key: 'active',
      header: 'Active',
      render: (t) => (
        <Switch label="" checked={t.isActive} onCheckedChange={() => void toggleActive(t)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (t) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditing(t);
            setModalOpen(true);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          New testimonial
        </Button>
      </div>
      {error && <ErrorState title="Couldn't load testimonials" description={error} />}
      <Table
        columns={columns}
        data={testimonials ?? []}
        getRowKey={(t) => t._id}
        isLoading={testimonials === null && !error}
        emptyState={<EmptyState title="No testimonials yet" description="" />}
      />
      <TestimonialModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        testimonial={editing}
        onSaved={load}
      />
    </div>
  );
}

const PLACEMENT_LABELS: Record<AdminBanner['placement'], string> = {
  home_hero: 'Home — hero',
  home_strip: 'Home — strip',
  offers: 'Offers',
};

function BannersSection(): ReactNode {
  const [banners, setBanners] = useState<AdminBanner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBanner | null>(null);

  function load(): void {
    listBanners()
      .then(({ banners: b }) => setBanners(b))
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load banners.'),
      );
  }
  useEffect(load, []);

  async function toggleActive(banner: AdminBanner): Promise<void> {
    try {
      if (banner.isActive) await deactivateBanner(banner._id);
      else await updateBanner(banner._id, { isActive: true });
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update banner.');
    }
  }

  const columns: TableColumn<AdminBanner>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (b) => <span className="font-medium">{b.title}</span>,
    },
    { key: 'placement', header: 'Placement', render: (b) => PLACEMENT_LABELS[b.placement] },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (b) =>
        b.startsAt || b.endsAt ? (
          `${b.startsAt ? formatSlotDate(b.startsAt.slice(0, 10)) : 'Always'} – ${b.endsAt ? formatSlotDate(b.endsAt.slice(0, 10)) : 'Always'}`
        ) : (
          <span className="text-text-muted">Always on</span>
        ),
    },
    {
      key: 'active',
      header: 'Active',
      render: (b) => (
        <Switch label="" checked={b.isActive} onCheckedChange={() => void toggleActive(b)} />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (b) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditing(b);
            setModalOpen(true);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          New banner
        </Button>
      </div>
      {error && <ErrorState title="Couldn't load banners" description={error} />}
      <Table
        columns={columns}
        data={banners ?? []}
        getRowKey={(b) => b._id}
        isLoading={banners === null && !error}
        emptyState={<EmptyState title="No banners yet" description="" />}
      />
      <BannerModal open={modalOpen} onOpenChange={setModalOpen} banner={editing} onSaved={load} />
    </div>
  );
}

export function ContentContent(): ReactNode {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-text text-xl font-semibold">Content</h1>
      <Tabs defaultValue="faqs">
        <TabsList>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
          <TabsTrigger value="testimonials">Testimonials</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
        </TabsList>
        <TabsContent value="faqs">
          <FaqsSection />
        </TabsContent>
        <TabsContent value="testimonials">
          <TestimonialsSection />
        </TabsContent>
        <TabsContent value="banners">
          <BannersSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
