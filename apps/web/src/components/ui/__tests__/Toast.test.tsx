import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from '@/lib/toast';
import { useToastStore } from '@/stores/toastStore';
import { Toaster } from '../Toast';

describe('Toast', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a toast and removes it after its duration elapses', async () => {
    vi.useFakeTimers();
    render(<Toaster />);

    toast.success('Address saved', { duration: 1000 });
    await vi.advanceTimersByTimeAsync(0);
    expect(screen.getByText('Address saved')).toBeInTheDocument();

    // Duration elapses, then the dismiss animation window.
    await vi.advanceTimersByTimeAsync(1000 + 300);
    expect(screen.queryByText('Address saved')).not.toBeInTheDocument();
  });

  it('removes a toast when its dismiss button is clicked — regression test for the AnimatePresence exit bug', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<Toaster />);

    toast.error('Could not save address');
    expect(await screen.findByText('Could not save address')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    await waitFor(() =>
      expect(screen.queryByText('Could not save address')).not.toBeInTheDocument(),
    );
  });

  it('updates a loading toast into a success toast', async () => {
    vi.useRealTimers();
    render(<Toaster />);

    const id = toast.loading('Placing your order…');
    expect(await screen.findByText('Placing your order…')).toBeInTheDocument();

    toast.update(id, { variant: 'success', title: 'Order placed', duration: 1000 });

    expect(await screen.findByText('Order placed')).toBeInTheDocument();
    expect(screen.queryByText('Placing your order…')).not.toBeInTheDocument();
  });
});
