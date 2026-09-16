'use client';

import type { CreateAgentInput } from '@clenzy/shared';
import { createAgentInputSchema } from '@clenzy/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { AdminArea } from '@/features/admin/areasApi';
import { createAgent, updateAgent, type AdminAgent } from '@/features/admin/staffApi';
import { ApiError } from '@/lib/api-client';
import { applyApiErrorToForm } from '@/lib/form-helpers';
import { toast } from '@/lib/toast';

export interface AgentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: AdminAgent | null;
  areas: AdminArea[];
  onSaved: () => void;
}

export function AgentModal({
  open,
  onOpenChange,
  agent,
  areas,
  onSaved,
}: AgentModalProps): ReactNode {
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAgentInput>({
    resolver: zodResolver(createAgentInputSchema),
    defaultValues: { name: '', phone: '', assignedAreas: [] },
  });

  useEffect(() => {
    if (!open) return;
    reset(
      agent
        ? {
            name: agent.name ?? '',
            phone: agent.phone ?? '',
            employeeId: agent.staffProfile?.employeeId,
            assignedAreas: agent.staffProfile?.assignedAreas ?? [],
            vehicleNumber: agent.staffProfile?.vehicleNumber,
            shiftStart: agent.staffProfile?.shiftStart,
            shiftEnd: agent.staffProfile?.shiftEnd,
          }
        : { name: '', phone: '', assignedAreas: [] },
    );
  }, [open, agent, reset]);

  async function onSubmit(data: CreateAgentInput): Promise<void> {
    try {
      if (agent) await updateAgent(agent._id, data);
      else await createAgent(data);
      toast.success(agent ? 'Agent updated' : 'Agent created');
      onSaved();
      onOpenChange(false);
    } catch (error) {
      const message = applyApiErrorToForm(error, setError);
      toast.error(
        error instanceof ApiError ? error.code.replace(/_/g, ' ') : 'Could not save agent',
        {
          description: message,
        },
      );
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={agent ? 'Edit agent' : 'New agent'}>
      <form
        onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input label="Name" required error={errors.name?.message} {...register('name')} />
        <Input
          label="Phone"
          required
          disabled={Boolean(agent)}
          helperText={agent ? 'Locked after creation.' : undefined}
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input label="Employee ID" error={errors.employeeId?.message} {...register('employeeId')} />
        <Input
          label="Vehicle number"
          error={errors.vehicleNumber?.message}
          {...register('vehicleNumber')}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Shift start"
            placeholder="09:00"
            error={errors.shiftStart?.message}
            {...register('shiftStart')}
          />
          <Input
            label="Shift end"
            placeholder="18:00"
            error={errors.shiftEnd?.message}
            {...register('shiftEnd')}
          />
        </div>

        {areas.length > 0 && (
          <Controller
            control={control}
            name="assignedAreas"
            render={({ field }) => (
              <div className="flex flex-col gap-1.5">
                <span className="text-text text-sm font-medium">Assigned areas</span>
                <div className="flex flex-col gap-1.5">
                  {areas.map((a) => (
                    <Checkbox
                      key={a._id}
                      label={a.area}
                      checked={field.value?.includes(a._id) ?? false}
                      onCheckedChange={(checked) => {
                        const current = field.value ?? [];
                        field.onChange(
                          checked ? [...current, a._id] : current.filter((id) => id !== a._id),
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {agent ? 'Save changes' : 'Create agent'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
