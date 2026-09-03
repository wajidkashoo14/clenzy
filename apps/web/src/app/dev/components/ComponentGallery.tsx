'use client';

import { Home, Package, ShoppingCart, Sparkles, User as UserIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/Accordion';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { OTPInput } from '@/components/ui/OTPInput';
import { Pagination } from '@/components/ui/Pagination';
import { PincodeInput, type PincodeCheckStatus } from '@/components/ui/PincodeInput';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { StatusPill } from '@/components/ui/StatusPill';
import { Switch } from '@/components/ui/Switch';
import { Table, type TableColumn } from '@/components/ui/Table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Textarea } from '@/components/ui/Textarea';
import { Toaster } from '@/components/ui/Toast';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { BottomBar } from '@/components/layout/BottomBar';
import { Container } from '@/components/layout/Container';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { ORDER_STATUS_META } from '@/lib/orderStatus';
import { toast } from '@/lib/toast';
import type { ORDER_STATUSES } from '@clenzy/shared';

function Section({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <section className="border-border flex flex-col gap-4 border-b py-10">
      <h2 className="text-text text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ children }: { children: ReactNode }): ReactNode {
  return <div className="flex flex-wrap items-center gap-4">{children}</div>;
}

const SAMPLE_NAV = [
  { label: 'Pricing', href: '#' },
  { label: 'How it works', href: '#' },
  { label: 'Locations', href: '#' },
];
const SAMPLE_MOBILE_GROUPS = [
  {
    title: 'Services',
    items: [
      { label: 'Dry Cleaning', href: '#' },
      { label: 'Laundry', href: '#' },
    ],
  },
  {
    title: 'Company',
    items: [
      { label: 'About', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
];
const SAMPLE_ACCOUNT_LINKS = [
  { label: 'My account', href: '#' },
  { label: 'Log in', href: '#' },
];

interface SampleOrder {
  id: string;
  orderNumber: string;
  customer: string;
  status: (typeof ORDER_STATUSES)[number];
  total: number;
  date: string;
}

const SAMPLE_ORDERS: SampleOrder[] = [
  {
    id: '1',
    orderNumber: 'CLZ-260903-0041',
    customer: 'Aisha Rather',
    status: 'OUT_FOR_DELIVERY',
    total: 89900,
    date: '3 Sep',
  },
  {
    id: '2',
    orderNumber: 'CLZ-260903-0040',
    customer: 'Bilal Ahmad',
    status: 'PROCESSING',
    total: 45000,
    date: '3 Sep',
  },
  {
    id: '3',
    orderNumber: 'CLZ-260902-0039',
    customer: 'Sana Wani',
    status: 'DELIVERED',
    total: 129900,
    date: '2 Sep',
  },
  {
    id: '4',
    orderNumber: 'CLZ-260902-0038',
    customer: 'Junaid Malik',
    status: 'CANCELLED',
    total: 32000,
    date: '2 Sep',
  },
];

const ORDER_COLUMNS: TableColumn<SampleOrder>[] = [
  { key: 'orderNumber', header: 'Order', render: (r) => r.orderNumber, sortable: true },
  { key: 'customer', header: 'Customer', render: (r) => r.customer, sortable: true },
  {
    key: 'status',
    header: 'Status',
    render: (r) => {
      const meta = ORDER_STATUS_META[r.status];
      return <StatusPill label={meta.label} color={meta.color} icon={meta.icon} />;
    },
  },
  {
    key: 'total',
    header: 'Total',
    render: (r) => `₹${(r.total / 100).toLocaleString('en-IN')}`,
    sortable: true,
    className: 'text-right',
    mobileLabel: 'Total',
  },
  { key: 'date', header: 'Date', render: (r) => r.date },
];

export function ComponentGallery(): ReactNode {
  const [modalOpen, setModalOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<PincodeCheckStatus>('idle');
  const [date, setDate] = useState<Date | null>(null);
  const [page, setPage] = useState(4);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableEmpty, setTableEmpty] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState('orderNumber');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Table is a controlled-sort component: it renders the sort UI and reports
  // clicks via onSortChange, but leaves reordering `data` to the caller (the
  // real use case is server-side sorting). This is that reordering, for the demo.
  const sortedOrders = useMemo(() => {
    const sorted = [...SAMPLE_ORDERS].sort((a, b) => {
      const aVal = a[sortKey as keyof SampleOrder];
      const bVal = b[sortKey as keyof SampleOrder];
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [sortKey, sortDirection]);

  function handlePincodeComplete(): void {
    setPincodeStatus('loading');
    setTimeout(() => setPincodeStatus(pincode === '190001' ? 'success' : 'error'), 800);
  }

  function triggerLoadingToast(): void {
    const id = toast.loading('Placing your order…');
    setTimeout(() => {
      toast.update(id, {
        variant: 'success',
        title: 'Order placed',
        description: 'CLZ-260903-0042',
        duration: 4000,
      });
    }, 1500);
  }

  return (
    <TooltipProvider>
      <Toaster />

      <Header
        logo={<span className="font-heading text-primary text-xl font-semibold">Clenzy</span>}
        navItems={SAMPLE_NAV}
        phone="+91 90000 00000"
        whatsappHref="https://wa.me/919000000000"
        cartHref="#"
        cartCount={3}
        accountHref="#"
        bookingHref="#"
        mobileNavGroups={SAMPLE_MOBILE_GROUPS}
        accountLinks={SAMPLE_ACCOUNT_LINKS}
      />

      <Container className="pb-24">
        <div className="py-10">
          <h1 className="font-heading text-text text-3xl font-semibold">Component Gallery</h1>
          <p className="text-text-muted mt-1 text-sm">
            Every design-system primitive, in every state. Dev-only — 404s in production.
          </p>
        </div>

        <Section title="Buttons">
          <Row>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="link">Link</Button>
          </Row>
          <Row>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Row>
          <Row>
            <Button disabled>Disabled</Button>
            <Button isLoading>Loading</Button>
            <Button asChild variant="secondary">
              <a href="#buttons">asChild (renders an &lt;a&gt;)</a>
            </Button>
          </Row>
        </Section>

        <Section title="Inputs">
          <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Full name" placeholder="Aisha Rather" required />
            <Input
              label="Phone"
              prefix="+91"
              placeholder="98765 43210"
              helperText="We'll text you an OTP"
            />
            <Input label="Email" error="Enter a valid email address" defaultValue="not-an-email" />
            <Input label="Disabled field" disabled defaultValue="Can't edit this" />
          </div>
          <Textarea
            label="Pickup notes"
            placeholder="e.g. Ring the upper bell"
            maxLength={200}
            className="max-w-2xl"
          />
        </Section>

        <Section title="Selection controls">
          <Row>
            <Checkbox label="Unchecked" />
            <Checkbox label="Checked" defaultChecked />
            <Checkbox label="Disabled" disabled />
          </Row>
          <RadioGroup
            label="Payment method"
            className="max-w-xs"
            options={[
              { value: 'online', label: 'Pay online', description: 'UPI, card, netbanking' },
              { value: 'cod', label: 'Cash on delivery' },
            ]}
            defaultValue="online"
          />
          <Row>
            <Switch label="SMS notifications" defaultChecked />
            <Switch label="Marketing emails" />
          </Row>
          <Select
            label="Pickup window"
            className="max-w-xs"
            placeholder="Choose a window"
            options={[
              { value: '9-11', label: '9:00 – 11:00 AM' },
              { value: '11-1', label: '11:00 AM – 1:00 PM' },
              { value: '2-4', label: '2:00 – 4:00 PM', disabled: true },
            ]}
          />
        </Section>

        <Section title="Specialized inputs">
          <OTPInput value={otp} onChange={setOtp} label="Enter the 6-digit code" />
          <div className="flex items-center gap-3">
            <span className="text-text-muted text-sm">Quantity</span>
            <QuantityStepper value={quantity} onChange={setQuantity} aria-label="Shirt quantity" />
          </div>
          <PincodeInput
            value={pincode}
            onChange={setPincode}
            onComplete={handlePincodeComplete}
            status={pincodeStatus}
            className="max-w-xs"
          />
          <DatePicker
            label="Pickup date"
            value={date}
            onChange={setDate}
            minDate={new Date()}
            helperText="Resize below 640px to see the native picker"
          />
        </Section>

        <Section title="Cards">
          <div className="grid max-w-2xl grid-cols-2 gap-4">
            <Card>Static card</Card>
            <Card interactive>Interactive card (hover me)</Card>
          </div>
        </Section>

        <Section title="Badges & status">
          <Row>
            <Badge color="primary">Primary</Badge>
            <Badge color="secondary">Secondary</Badge>
            <Badge color="accent">Accent</Badge>
            <Badge color="success" dot>
              Success
            </Badge>
            <Badge color="warning">Warning</Badge>
            <Badge color="error">Error</Badge>
            <Badge color="info">Info</Badge>
            <Badge color="neutral">Neutral</Badge>
          </Row>
          <Row>
            {Object.entries(ORDER_STATUS_META).map(([status, meta]) => (
              <StatusPill key={status} label={meta.label} color={meta.color} icon={meta.icon} />
            ))}
          </Row>
        </Section>

        <Section title="Tabs & Accordion">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All orders</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            <TabsContent value="all">Showing all orders.</TabsContent>
            <TabsContent value="active">Showing active orders.</TabsContent>
            <TabsContent value="past">Showing past orders.</TabsContent>
          </Tabs>

          <Accordion type="single" collapsible className="max-w-xl">
            <AccordionItem value="a">
              <AccordionTrigger>How does pickup work?</AccordionTrigger>
              <AccordionContent>
                Choose a slot at checkout — our agent collects your items from your doorstep.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="b">
              <AccordionTrigger>What if I&apos;m not home?</AccordionTrigger>
              <AccordionContent>
                You can reschedule from your order tracking page any time before pickup.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Section>

        <Section title="Tooltip, Modal & Toast">
          <Row>
            <Tooltip content="This appears after a short delay">
              <Button variant="secondary" size="sm">
                Hover me
              </Button>
            </Tooltip>
            <Button onClick={() => setModalOpen(true)}>Open modal</Button>
          </Row>
          <Row>
            <Button size="sm" variant="secondary" onClick={() => toast.success('Address saved')}>
              Success toast
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => toast.error('Could not save address')}
            >
              Error toast
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => toast.warning('Cutoff is in 10 minutes')}
            >
              Warning toast
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => toast.info('Your invoice is ready')}
            >
              Info toast
            </Button>
            <Button size="sm" variant="secondary" onClick={triggerLoadingToast}>
              Loading → success
            </Button>
          </Row>

          <Modal
            open={modalOpen}
            onOpenChange={setModalOpen}
            title="Cancel this order?"
            description="This can't be undone once pickup has started."
          >
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Keep order
              </Button>
              <Button variant="danger" onClick={() => setModalOpen(false)}>
                Cancel order
              </Button>
            </div>
          </Modal>
        </Section>

        <Section title="Loading, empty & error states">
          <Row>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-24 w-40" />
          </Row>
          <Row>
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </Row>
          <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
            <Card padding="none">
              <EmptyState
                icon={Package}
                title="No orders yet"
                description="Your orders will show up here."
                action={{ label: 'Browse services', onClick: () => {} }}
              />
            </Card>
            <Card padding="none">
              <ErrorState onRetry={() => {}} />
            </Card>
          </div>
        </Section>

        <Section title="Pagination & Breadcrumb">
          <Pagination currentPage={page} totalPages={20} onPageChange={setPage} />
          <Breadcrumb
            items={[
              { label: 'Home', href: '#' },
              { label: 'Services', href: '#' },
              { label: 'Dry Cleaning' },
            ]}
          />
        </Section>

        <Section title="Avatar">
          <Row>
            <Avatar name="Aisha Rather" size="sm" />
            <Avatar name="Bilal Ahmad" size="md" />
            <Avatar name="Sana Wani" size="lg" />
          </Row>
        </Section>

        <Section title="Table">
          <Row>
            <Button size="sm" variant="secondary" onClick={() => setTableLoading((v) => !v)}>
              Toggle loading
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setTableEmpty((v) => !v)}>
              Toggle empty
            </Button>
          </Row>
          <Table
            columns={ORDER_COLUMNS}
            data={tableEmpty ? [] : sortedOrders}
            getRowKey={(r) => r.id}
            isLoading={tableLoading}
            selectable
            selectedKeys={selectedRows}
            onSelectionChange={setSelectedRows}
            bulkActions={
              <Button size="sm" variant="secondary">
                Assign agent
              </Button>
            }
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortChange={(key) => {
              if (key === sortKey) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
              else {
                setSortKey(key);
                setSortDirection('asc');
              }
            }}
            emptyState={<EmptyState icon={Sparkles} title="No orders match these filters" />}
          />
        </Section>
      </Container>

      <Footer
        brandName="Clenzy"
        columns={[
          {
            title: 'Services',
            links: [
              { label: 'Dry Cleaning', href: '#' },
              { label: 'Laundry', href: '#' },
            ],
          },
          {
            title: 'Company',
            links: [
              { label: 'About', href: '#' },
              { label: 'Contact', href: '#' },
            ],
          },
          {
            title: 'Support',
            links: [
              { label: 'FAQ', href: '#' },
              { label: 'Track order', href: '#' },
            ],
          },
        ]}
        outlets={[{ name: 'Rajbagh', address: 'Boulevard Road, Srinagar 190001' }]}
        phone="+91 90000 00000"
        whatsappHref="https://wa.me/919000000000"
        email="hello@clenzy.in"
        hours="Mon–Sat, 9 AM – 8 PM"
        socialLinks={[{ label: 'Instagram', href: '#' }]}
        legalLinks={[
          { label: 'Terms', href: '#' },
          { label: 'Privacy', href: '#' },
          { label: 'Refund policy', href: '#' },
        ]}
      />

      <BottomBar
        items={[
          { label: 'Home', href: '#', icon: <Home className="size-5" aria-hidden="true" /> },
          {
            label: 'Services',
            href: '#services',
            icon: <Sparkles className="size-5" aria-hidden="true" />,
          },
          {
            label: 'Cart',
            href: '#cart',
            icon: <ShoppingCart className="size-5" aria-hidden="true" />,
            badge: 3,
          },
          {
            label: 'Orders',
            href: '#orders',
            icon: <Package className="size-5" aria-hidden="true" />,
          },
          {
            label: 'Account',
            href: '#account',
            icon: <UserIcon className="size-5" aria-hidden="true" />,
          },
        ]}
      />
    </TooltipProvider>
  );
}
