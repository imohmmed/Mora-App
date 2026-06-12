import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Highlighter, Heading1, Heading2, List, ListOrdered,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

function ToolbarButton({
  active, onClick, title, children,
}: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={cn(
        "p-1.5 rounded text-sm transition-colors",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const lastValue = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
    ],
    content: value,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      lastValue.current = html;
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none min-h-[180px] px-3 py-2 text-foreground",
      },
    },
  });

  useEffect(() => {
    if (editor && value !== lastValue.current) {
      editor.commands.setContent(value || "");
      lastValue.current = value;
    }
  }, [value, editor]);

  if (!editor) return null;

  const COLORS = ["#000000", "#E53935", "#0274C1", "#2E7D32", "#F9A825", "#6A1B9A", "#ffffff"];

  return (
    <div className={cn("border rounded-lg overflow-hidden bg-background", className)}>
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b bg-muted/30">
        <ToolbarButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Underline"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Heading 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Heading 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered list"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          title="Align left"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          title="Align center"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          title="Align right"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          title="Justify"
        >
          <AlignJustify className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="w-px h-4 bg-border mx-1" />

        <ToolbarButton
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          title="Highlight"
        >
          <Highlighter className="w-3.5 h-3.5" />
        </ToolbarButton>

        <div className="flex items-center gap-0.5 ml-1">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={`Color: ${c}`}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().setColor(c).run();
              }}
              className="w-4 h-4 rounded-full border border-border/60 hover:scale-110 transition-transform"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div onClick={() => editor.commands.focus()}>
        {!editor.getText() && placeholder && (
          <div className="absolute pointer-events-none text-muted-foreground text-sm px-3 py-2">
            {placeholder}
          </div>
        )}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
