'use client';

import type { AuthUser } from '@clenzy/shared';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { updateProfile } from '@/features/profile/api';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';

/**
 * Keyed by `user.id` in the parent so this only ever mounts once the real
 * profile has loaded — `useState(user.name ?? '')` then initializes
 * correctly on that single mount, no effect needed to "catch up" once an
 * asynchronously-loaded `user` prop arrives.
 */
function ProfileDetailsForm({
  user,
  setUser,
}: {
  user: AuthUser;
  setUser: (user: AuthUser) => void;
}): ReactNode {
  const [name, setName] = useState(user.name ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [emailError, setEmailError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(): Promise<void> {
    setEmailError(undefined);
    setIsSaving(true);
    try {
      const { user: updated } = await updateProfile({
        name: name.trim() || undefined,
        email: email.trim() || undefined,
      });
      setUser(updated);
      toast.success('Profile updated');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_TAKEN') {
        setEmailError(err.message);
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Could not update your profile.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-text text-sm font-semibold">Your details</h2>
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={emailError}
        helperText="Used for order receipts and updates."
      />
      <Input
        label="Phone"
        value={user.phone}
        disabled
        helperText="Contact support to change your phone number."
      />
      <Button
        size="sm"
        className="self-start"
        isLoading={isSaving}
        onClick={() => void handleSave()}
      >
        Save changes
      </Button>
    </Card>
  );
}

export function ProfileContent(): ReactNode {
  const { user, setUser } = useAuthStore();
  const [savingPref, setSavingPref] = useState<string | null>(null);

  if (!user) return null;

  async function handlePrefChange(
    key: 'email' | 'sms' | 'marketing',
    value: boolean,
  ): Promise<void> {
    setSavingPref(key);
    try {
      const { user: updated } = await updateProfile({ notificationPrefs: { [key]: value } });
      setUser(updated);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not update this preference.');
    } finally {
      setSavingPref(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-text text-2xl font-semibold">Profile</h1>

      <ProfileDetailsForm key={user.id} user={user} setUser={setUser} />

      <Card className="flex flex-col gap-4">
        <h2 className="text-text text-sm font-semibold">Notifications</h2>
        <Switch
          label="Email updates"
          description="Order confirmations, receipts, and delivery updates."
          checked={user.notificationPrefs.email}
          disabled={savingPref === 'email'}
          onCheckedChange={(checked) => void handlePrefChange('email', checked)}
        />
        <Switch
          label="SMS alerts"
          description="Time-critical texts — pickup reminders, out for delivery."
          checked={user.notificationPrefs.sms}
          disabled={savingPref === 'sms'}
          onCheckedChange={(checked) => void handlePrefChange('sms', checked)}
        />
        <Switch
          label="Offers & promotions"
          description="Occasional discounts and announcements."
          checked={user.notificationPrefs.marketing}
          disabled={savingPref === 'marketing'}
          onCheckedChange={(checked) => void handlePrefChange('marketing', checked)}
        />
      </Card>
    </div>
  );
}
