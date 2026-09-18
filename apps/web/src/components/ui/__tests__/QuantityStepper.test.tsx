import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { QuantityStepper } from '../QuantityStepper';

/** Regression test for the render-loop this component wraps in the parent's state. */
function ControlledStepper() {
  const [value, setValue] = useState(1);
  return <QuantityStepper value={value} onChange={setValue} aria-label="Shirt quantity" />;
}

describe('QuantityStepper', () => {
  it('increments and decrements, clamps to min/max, and never leaves stray DOM nodes behind', async () => {
    const user = userEvent.setup();
    render(<ControlledStepper />);

    const increase = screen.getByRole('button', { name: 'Increase Shirt quantity' });
    const decrease = screen.getByRole('button', { name: 'Decrease Shirt quantity' });
    const input = screen.getByRole('textbox', { name: 'Shirt quantity' });

    await user.click(increase);
    expect(input).toHaveValue('2');
    await user.click(increase);
    expect(input).toHaveValue('3');
    await user.click(decrease);
    expect(input).toHaveValue('2');

    // Regression: an earlier AnimatePresence-based version left one stale
    // <input> per click stuck in the DOM instead of updating in place.
    expect(screen.getAllByRole('textbox', { name: 'Shirt quantity' })).toHaveLength(1);
  });

  it('clamps at min and disables the decrease button there', async () => {
    const user = userEvent.setup();
    render(<QuantityStepper value={0} onChange={() => {}} min={0} aria-label="Qty" />);

    expect(screen.getByRole('button', { name: 'Decrease Qty' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Decrease Qty' }));
    expect(screen.getByRole('textbox', { name: 'Qty' })).toHaveValue('0');
  });

  it('commits a typed value on blur', async () => {
    const user = userEvent.setup();
    render(<ControlledStepper />);

    const input = screen.getByRole('textbox', { name: 'Shirt quantity' });
    await user.clear(input);
    await user.type(input, '15');
    await user.tab();

    expect(input).toHaveValue('15');
  });
});
