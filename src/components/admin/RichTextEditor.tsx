import { useEffect, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  ImageIcon,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

const HEADING_OPTIONS = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
];

function getActiveHeading(editor: Editor): string {
  if (editor.isActive('heading', { level: 1 })) return 'h1';
  if (editor.isActive('heading', { level: 2 })) return 'h2';
  if (editor.isActive('heading', { level: 3 })) return 'h3';
  return 'paragraph';
}

function LinkPopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setUrl(editor.getAttributes('link')['href'] || '');
      }}
    >
      <PopoverTrigger asChild>
        <Toggle
          type="button"
          size="sm"
          pressed={editor.isActive('link')}
          aria-label="Link"
        >
          <LinkIcon />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Input
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
              setOpen(false);
            }
          }}
        />
        <div className="flex justify-end gap-2">
          {editor.isActive('link') && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                editor.chain().focus().unsetLink().run();
                setOpen(false);
              }}
            >
              Remove
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
              setOpen(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ImagePopover({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setUrl('');
      }}
    >
      <PopoverTrigger asChild>
        <Toggle type="button" size="sm" aria-label="Image">
          <ImageIcon />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-72 space-y-2" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Input
          placeholder="https://example.com/image.png"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (url) editor.chain().focus().setImage({ src: url }).run();
              setOpen(false);
            }
          }}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              if (url) editor.chain().focus().setImage({ src: url }).run();
              setOpen(false);
            }}
          >
            Insert
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex flex-wrap items-center gap-1 border border-b-0 rounded-t-md bg-muted/30 p-2">
      <Select
        value={getActiveHeading(editor)}
        onValueChange={(v) => {
          if (v === 'paragraph') {
            editor.chain().focus().setParagraph().run();
          } else {
            const level = Number(v.replace('h', '')) as 1 | 2 | 3;
            editor.chain().focus().toggleHeading({ level }).run();
          }
        }}
      >
        <SelectTrigger className="h-9 w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {HEADING_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle
        type="button"
        size="sm"
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <Bold />
      </Toggle>
      <Toggle
        type="button"
        size="sm"
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <Italic />
      </Toggle>
      <Toggle
        type="button"
        size="sm"
        pressed={editor.isActive('underline')}
        onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
        aria-label="Underline"
      >
        <UnderlineIcon />
      </Toggle>
      <Toggle
        type="button"
        size="sm"
        pressed={editor.isActive('strike')}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
      >
        <Strikethrough />
      </Toggle>
      <Toggle
        type="button"
        size="sm"
        pressed={editor.isActive('code')}
        onPressedChange={() => editor.chain().focus().toggleCode().run()}
        aria-label="Inline code"
      >
        <Code />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle
        type="button"
        size="sm"
        pressed={editor.isActive({ textAlign: 'left' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('left').run()}
        aria-label="Align left"
      >
        <AlignLeft />
      </Toggle>
      <Toggle
        type="button"
        size="sm"
        pressed={editor.isActive({ textAlign: 'center' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('center').run()}
        aria-label="Align center"
      >
        <AlignCenter />
      </Toggle>
      <Toggle
        type="button"
        size="sm"
        pressed={editor.isActive({ textAlign: 'right' })}
        onPressedChange={() => editor.chain().focus().setTextAlign('right').run()}
        aria-label="Align right"
      >
        <AlignRight />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle
        type="button"
        size="sm"
        pressed={editor.isActive('bulletList')}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Bullet list"
      >
        <List />
      </Toggle>
      <Toggle
        type="button"
        size="sm"
        pressed={editor.isActive('orderedList')}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Ordered list"
      >
        <ListOrdered />
      </Toggle>
      <Toggle
        type="button"
        size="sm"
        pressed={editor.isActive('blockquote')}
        onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        aria-label="Blockquote"
      >
        <Quote />
      </Toggle>
      <Toggle
        type="button"
        size="sm"
        onPressedChange={() => editor.chain().focus().setHorizontalRule().run()}
        aria-label="Horizontal rule"
      >
        <Minus />
      </Toggle>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <LinkPopover editor={editor} />
      <ImagePopover editor={editor} />

      <Separator orientation="vertical" className="h-6 mx-1" />

      <Toggle
        type="button"
        size="sm"
        onPressedChange={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        aria-label="Undo"
      >
        <Undo />
      </Toggle>
      <Toggle
        type="button"
        size="sm"
        onPressedChange={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        aria-label="Redo"
      >
        <Redo />
      </Toggle>
    </div>
  );
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const editor = useEditor({
    // This app renders with SSR; without this, Tiptap throws because it
    // can't safely render the same content on the server and client on
    // first paint. The editor only ever mounts inside client-authenticated
    // admin routes, so there's no real SSR content to preserve here.
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
      Image,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Start writing...',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[350px] px-4 py-3 focus:outline-none',
      },
    },
  });

  // Keep the editor in sync when the form resets/loads a different post,
  // without fighting the user's own typing (only when content actually
  // differs from what's currently in the editor).
  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={className}>
      <Toolbar editor={editor} />
      <div className="rounded-b-md border">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
