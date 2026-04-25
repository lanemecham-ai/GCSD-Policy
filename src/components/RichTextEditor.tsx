import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export default function RichTextEditor({ value, onChange }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const btn = (label: string, action: () => void, active: boolean, title?: string) => (
    <button type="button" title={title ?? label} onClick={action} className={active ? 'active' : ''}>
      {label}
    </button>
  );

  return (
    <div className="rich-editor">
      <div className="rich-editor-toolbar">
        {btn('B', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'Bold')}
        {btn('I', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'Italic')}
        <div className="rich-editor-divider" />
        {btn('H1', () => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }))}
        {btn('H2', () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }))}
        {btn('H3', () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }))}
        <div className="rich-editor-divider" />
        {btn('• List', () => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), 'Bullet list')}
        {btn('1. List', () => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Numbered list')}
        <div className="rich-editor-divider" />
        {btn('" Quote', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), 'Blockquote')}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
