import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';

const MERGE_TAGS = ['{{business_name}}', '{{city}}', '{{country}}', '{{niche}}', '{{phone}}'];

export default function RichEditor({ value, onChange, placeholder = 'Write your email…' }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) editor.commands.setContent(value || '', false);
  }, [editor, value]);

  const [showHtml, setShowHtml] = useState(false);
  if (!editor) return null;

  const Btn = ({ active, onClick, children, title }) => (
    <button type="button" title={title}
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded text-charcoal-300 hover:bg-charcoal-800 hover:text-charcoal-100 transition-colors ${active ? 'bg-charcoal-800 text-brand-400' : ''}`}>
      {children}
    </button>
  );

  const insertTag = (tag) => editor.chain().focus().insertContent(tag).run();
  const setLink = () => {
    const url = prompt('URL?');
    if (!url) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };
  const insertImage = () => {
    const url = prompt('Image URL?');
    if (!url) return;
    editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="rounded-lg border border-charcoal-700 overflow-hidden bg-charcoal-850">
      <div className="flex flex-wrap gap-1 p-2 border-b border-charcoal-800 bg-charcoal-875">
        <Btn title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></Btn>
        <Btn title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></Btn>
        <Btn title="Strike" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>S</Btn>
        <span className="w-px bg-charcoal-700 mx-1" />
        <Btn title="H1" active={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</Btn>
        <Btn title="H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</Btn>
        <Btn title="H3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</Btn>
        <span className="w-px bg-charcoal-700 mx-1" />
        <Btn title="Bullets" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</Btn>
        <Btn title="Numbers" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1.</Btn>
        <Btn title="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()}>“”</Btn>
        <span className="w-px bg-charcoal-700 mx-1" />
        <Btn title="Link" onClick={setLink}>Link</Btn>
        <Btn title="Image (URL)" onClick={insertImage}>Image</Btn>
        <span className="w-px bg-charcoal-700 mx-1" />
        <span className="text-xs text-charcoal-500 self-center mr-1">Merge:</span>
        {MERGE_TAGS.map((t) => (
          <Btn key={t} onClick={() => insertTag(t)}>{t}</Btn>
        ))}
        <span className="ml-auto" />
        <Btn active={showHtml} onClick={() => setShowHtml((v) => !v)}>HTML</Btn>
      </div>
      {showHtml ? (
        <textarea
          className="w-full min-h-[280px] p-3 font-mono text-xs bg-charcoal-850 text-charcoal-100 outline-none border-0"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </div>
  );
}
