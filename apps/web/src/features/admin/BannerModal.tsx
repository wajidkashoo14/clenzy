'use client';

import type { CreateBannerInput } from '@clenzy/shared';
import { createBannerInputSchema } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { createBanner, updateBanner, type AdminBanner } from '@/features/admin/contentApi';
import { ApiError } from '@/lib/api-client';
import { applyApiErrorToForm } from '@/lib/form-helpers';
import { toast } from '@/lib/toast';

const PLACEMENT_OPTIONS = [
  { value: 'home_hero', label: 'Home — hero' },
  { value: 'home_strip', label: 'Home — promo strip' },
  { value: 'offers', label: 'Offers page' },
];

export interface BannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banner: AdminBanner | null;
  onSaved: () => void;
}

const EMPTY: CreateBannerInput = {
  title: '',
  subtitle: undefined,
  image: '',
  mobileImage: undefined,
  ctaText: undefined,
  ctaLink: undefined,
  placement: 'home_hero',
  startsAt: undefined,
  endsAt: undefined,
  sortOrder: 0,
};

export function BannerModal({ open, onOpenChange, banner, onSaved }: BannerModalProps): ReactNode {
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateBannerInput>({
    resolver: zodResolver(createBannerInputSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    reset(
      banner
        ? {
            title: banner.title,
            subtitle: banner.subtitle,
            image: banner.image,
            mobileImage: banner.mobileImage,
            ctaText: banner.ctaText,
            ctaLink: banner.ctaLink,
            placement: banner.placement,
            startsAt: banner.startsAt ? banner.startsAt.slice(0, 10) : undefined,
            endsAt: banner.endsAt ? banner.endsAt.slice(0, 10) : undefined,
            sortOrder: banner.sortOrder,
          }
        : EMPTY,
    );
  }, [open, banner, reset]);

  async function onSubmit(data: CreateBannerInput): Promise<void> {
    try {
      if (banner) await updateBanner(banner._id, data);
      else await createBanner(data);
      toast.success(banner ? 'Banner updated' : 'Banner created');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      const message = applyApiErrorToForm(error, setError);
      toast.error(
        error instanceof ApiError ? error.code.replace(/_/g, ' ') : 'Could not save banner',
        {
          description: message,
        },
      );
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={banner ? 'Edit banner' : 'New banner'}>
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input label="Title" required error={errors.title?.message} {...register('title')} />
        <Textarea
          label="Subtitle"
          maxLength={300}
          error={errors.subtitle?.message}
          {...register('subtitle')}
        />
        <Input
          label="Image URL"
          required
          helperText="A Cloudinary upload widget isn't wired up yet — paste a hosted image URL."
          error={errors.image?.message}
          {...register('image')}
        />
        <Input
          label="Mobile image URL"
          helperText="Optional — falls back to the image above on small screens."
          error={errors.mobileImage?.message}
          {...register('mobileImage')}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="CTA text" error={errors.ctaText?.message} {...register('ctaText')} />
          <Input label="CTA link" error={errors.ctaLink?.message} {...register('ctaLink')} />
        </div>
        <Controller
          control={control}
          name="placement"
          render={({ field }) => (
            <Select
              label="Placement"
              options={PLACEMENT_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
        <div className="grid grid-cols-2 gap-3">
          <Controller
            control={control}
            name="startsAt"
            render={({ field }) => (
              <DatePicker
                label="Starts"
                value={field.value ? new Date(field.value) : null}
                onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : undefined)}
              />
            )}
          />
          <Controller
            control={control}
            name="endsAt"
            render={({ field }) => (
              <DatePicker
                label="Ends"
                value={field.value ? new Date(field.value) : null}
                onChange={(d) => field.onChange(d ? format(d, 'yyyy-MM-dd') : undefined)}
                error={errors.endsAt?.message}
              />
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {banner ? 'Save changes' : 'Create banner'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
