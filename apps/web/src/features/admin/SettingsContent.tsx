'use client';

import type { Settings } from '@clenzy/shared';
import { settingsSchema } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Textarea } from '@/components/ui/Textarea';
import { getSettings, updateSettings } from '@/features/admin/settingsApi';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/lib/toast';

const DAYS: { key: keyof Settings['businessHours']; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

function moneyToRupees(paise: number | undefined): number | '' {
  return paise === undefined ? '' : paise / 100;
}
function rupeesToMoney(value: string): number {
  return Math.round(Number(value || 0) * 100);
}

export function SettingsContent(): ReactNode {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<Settings>({ resolver: zodResolver(settingsSchema) });

  useEffect(() => {
    getSettings()
      .then(({ settings }) => {
        reset(settings);
        setLoaded(true);
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'Could not load settings.'),
      );
  }, [reset]);

  async function onSubmit(data: Settings): Promise<void> {
    try {
      const { settings } = await updateSettings(data);
      reset(settings);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save settings.');
    }
  }

  if (error) return <ErrorState title="Couldn't load settings" description={error} />;
  if (!loaded) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      noValidate
      className="flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-text text-xl font-semibold">Settings</h1>
        <Button type="submit" isLoading={isSubmitting} disabled={!isDirty}>
          Save changes
        </Button>
      </div>

      <Card>
        <h2 className="text-text mb-3 text-sm font-semibold">Business</h2>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <Input label="Support phone" required {...register('supportPhone')} />
            <Input label="Support WhatsApp" required {...register('supportWhatsapp')} />
            <Input label="Support email" required type="email" {...register('supportEmail')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-text text-sm font-medium">Business hours</span>
            {DAYS.map(({ key, label }) => (
              <Controller
                key={key}
                control={control}
                name={`businessHours.${key}`}
                render={({ field }) => (
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted w-24 text-sm">{label}</span>
                    <Checkbox
                      label="Closed"
                      checked={field.value === null}
                      onCheckedChange={(checked) =>
                        field.onChange(checked ? null : { open: '09:00', close: '18:00' })
                      }
                    />
                    {field.value !== null && (
                      <>
                        <Input
                          label=""
                          className="w-24"
                          value={field.value?.open ?? ''}
                          onChange={(e) => field.onChange({ ...field.value, open: e.target.value })}
                        />
                        <span className="text-text-muted">–</span>
                        <Input
                          label=""
                          className="w-24"
                          value={field.value?.close ?? ''}
                          onChange={(e) =>
                            field.onChange({ ...field.value, close: e.target.value })
                          }
                        />
                      </>
                    )}
                  </div>
                )}
              />
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-text mb-3 text-sm font-semibold">Orders</h2>
        <div className="grid grid-cols-2 gap-3">
          <Controller
            control={control}
            name="minOrderValue"
            render={({ field }) => (
              <Input
                label="Minimum order value (₹)"
                type="number"
                value={moneyToRupees(field.value)}
                onChange={(e) => field.onChange(rupeesToMoney(e.target.value))}
              />
            )}
          />
          <Input
            label="Max reschedules"
            type="number"
            {...register('maxReschedules', { valueAsNumber: true })}
          />
          <Input
            label="Re-clean window (hours)"
            type="number"
            {...register('recleanWindowHours', { valueAsNumber: true })}
          />
          <Input
            label="Price-revision approval threshold (%)"
            type="number"
            {...register('priceRevisionApprovalThresholdPercent', { valueAsNumber: true })}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-text mb-3 text-sm font-semibold">Delivery</h2>
        <div className="grid grid-cols-2 gap-3">
          <Controller
            control={control}
            name="deliveryFee"
            render={({ field }) => (
              <Input
                label="Delivery fee (₹)"
                type="number"
                value={moneyToRupees(field.value)}
                onChange={(e) => field.onChange(rupeesToMoney(e.target.value))}
              />
            )}
          />
          <Controller
            control={control}
            name="freeDeliveryThreshold"
            render={({ field }) => (
              <Input
                label="Free delivery above (₹)"
                type="number"
                value={moneyToRupees(field.value)}
                onChange={(e) => field.onChange(rupeesToMoney(e.target.value))}
              />
            )}
          />
          <Input
            label="Express surcharge (fraction, e.g. 0.4 = 40%)"
            type="number"
            step="0.01"
            {...register('expressMultiplier', { valueAsNumber: true })}
          />
          <Controller
            control={control}
            name="expressMinCharge"
            render={({ field }) => (
              <Input
                label="Express minimum charge (₹)"
                type="number"
                value={moneyToRupees(field.value)}
                onChange={(e) => field.onChange(rupeesToMoney(e.target.value))}
              />
            )}
          />
          <Input
            label="Same-day pickup cutoff (HH:MM)"
            placeholder="16:00"
            {...register('sameDayCutoffTime')}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-text mb-3 text-sm font-semibold">Payments</h2>
        <div className="grid grid-cols-2 gap-3">
          <Controller
            control={control}
            name="codMaxOrderValue"
            render={({ field }) => (
              <Input
                label="COD maximum order value (₹)"
                type="number"
                value={moneyToRupees(field.value)}
                onChange={(e) => field.onChange(rupeesToMoney(e.target.value))}
              />
            )}
          />
          <Input label="GST number" {...register('gstNumber')} />
        </div>
        <div className="mt-3">
          <Controller
            control={control}
            name="gstEnabled"
            render={({ field }) => (
              <Checkbox
                label="GST enabled"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            )}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-text mb-3 text-sm font-semibold">Maintenance</h2>
        <div className="flex flex-col gap-3">
          <Controller
            control={control}
            name="maintenanceMode.enabled"
            render={({ field }) => (
              <Checkbox
                label="Maintenance mode"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            )}
          />
          <Textarea
            label="Maintenance message"
            maxLength={500}
            helperText="Shown to customers while maintenance mode is on."
            {...register('maintenanceMode.message')}
          />
        </div>
      </Card>
    </form>
  );
}
