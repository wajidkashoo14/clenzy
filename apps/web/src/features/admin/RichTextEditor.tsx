'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Quote, Strikethrough } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';

export interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (html: string) => void;
  error?: string;
  required?: boolean;
}

/**
 * Minimal Tiptap editor for the FAQ answer field — see
 * docs/ADMIN_DASHBOARD.md §12 ("Use Tiptap for rich text"). Output HTML is
 * sanitized again server-side (adminContent.service.ts) before it's ever
 * stored, since this is rendered on the public site.
 */
export function RichTextEditor({
  label,
  value,
  onChange,
  error,
  required,
}: RichTextEditorProps): ReactNode {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-24 focus:outline-none',
      },
    },
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) editor.commands.setContent(value, { emitUpdate: false });
    // Only re-sync when the external value changes (e.g. modal reopened with different data) —
    // not on every keystroke, or the editor would fight the user's cursor position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const buttons: { icon: typeof Bold; label: string; onClick: () => void; active: boolean }[] =
    editor
      ? [
          {
            icon: Bold,
            label: 'Bold',
            onClick: () => editor.chain().focus().toggleBold().run(),
            active: editor.isActive('bold'),
          },
          {
            icon: Italic,
            label: 'Italic',
            onClick: () => editor.chain().focus().toggleItalic().run(),
            active: editor.isActive('italic'),
          },
          {
            icon: Strikethrough,
            label: 'Strikethrough',
            onClick: () => editor.chain().focus().toggleStrike().run(),
            active: editor.isActive('strike'),
          },
          {
            icon: List,
            label: 'Bullet list',
            onClick: () => editor.chain().focus().toggleBulletList().run(),
            active: editor.isActive('bulletList'),
          },
          {
            icon: ListOrdered,
            label: 'Numbered list',
            onClick: () => editor.chain().focus().toggleOrderedList().run(),
            active: editor.isActive('orderedList'),
          },
          {
            icon: Quote,
            label: 'Quote',
            onClick: () => editor.chain().focus().toggleBlockquote().run(),
            active: editor.isActive('blockquote'),
          },
        ]
      : [];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-text text-sm font-medium">
        {label}
        {required && (
          <span className="text-error ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </span>

      <div
        className={cn(
          'border-border-strong bg-surface-alt overflow-hidden rounded-md border',
          error && 'border-error',
        )}
      >
        <div className="border-border-strong flex flex-wrap gap-0.5 border-b p-1.5">
          {buttons.map(({ icon: Icon, label: btnLabel, onClick, active }) => (
            <button
              key={btnLabel}
              type="button"
              onClick={onClick}
              aria-label={btnLabel}
              aria-pressed={active}
              className={cn(
                'text-text-muted hover:bg-surface hover:text-text rounded p-1.5',
                active && 'bg-surface text-text',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="px-3.5 py-2.5">
          <EditorContent editor={editor} />
        </div>
      </div>

      {error && <p className="text-error text-[13px]">{error}</p>}
    </div>
  );
}
