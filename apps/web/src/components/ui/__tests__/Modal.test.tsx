import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Modal } from '../Modal';

function ControlledModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open modal</button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Cancel this order?"
        description="This can't be undone."
      >
        <button onClick={() => setOpen(false)}>Keep order</button>
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('opens on trigger click and fully unmounts on close — regression test for the AnimatePresence exit bug', async () => {
    const user = userEvent.setup();
    render(<ControlledModal />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open modal' }));
    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(screen.getByText('Cancel this order?')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    // An earlier AnimatePresence + forceMount version never reported exit
    // completion, so the dialog stayed mounted-but-invisible forever.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<ControlledModal />);

    await user.click(screen.getByRole('button', { name: 'Open modal' }));
    expect(await screen.findByRole('dialog')).toBeVisible();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes when a button inside the modal changes the open state', async () => {
    const user = userEvent.setup();
    render(<ControlledModal />);

    await user.click(screen.getByRole('button', { name: 'Open modal' }));
    await user.click(await screen.findByRole('button', { name: 'Keep order' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
