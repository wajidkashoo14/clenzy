import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../Tabs';

function renderTabs() {
  return render(
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All orders</TabsTrigger>
        <TabsTrigger value="active">Active</TabsTrigger>
      </TabsList>
      <TabsContent value="all">Showing all orders.</TabsContent>
      <TabsContent value="active">Showing active orders.</TabsContent>
    </Tabs>,
  );
}

describe('Tabs', () => {
  it('shows the defaultValue panel and switches on click when uncontrolled', async () => {
    const user = userEvent.setup();
    renderTabs();

    expect(screen.getByText('Showing all orders.')).toBeVisible();

    await user.click(screen.getByRole('tab', { name: 'Active' }));

    expect(screen.getByText('Showing active orders.')).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Active' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByRole('tab', { name: 'All orders' })).toHaveAttribute(
      'data-state',
      'inactive',
    );
  });
});
