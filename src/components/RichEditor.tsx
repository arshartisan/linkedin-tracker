"use client";

import { useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import {
  BoldIcon,
  CodeIcon,
  ItalicIcon,
  LinkIcon,
  ListChecksIcon,
  ListIcon,
  ListOrderedIcon,
  Redo2Icon,
  StrikethroughIcon,
  UnderlineIcon,
  Undo2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as Select from "@/components/ui/select";
import { cn } from "@/lib/utils";

/*
  The editor behind SOPs. Same feature set as shadcn.io's rich editor - block
  styles, marks, nested lists, links, undo and live counts - plus checklists,
  since most SOPs are a sequence of steps. Built on Tiptap rather than raw
  contentEditable so pasted markup is reduced to this schema instead of being
  stored as whatever the clipboard held.
*/

const BLOCKS = {
  paragraph: "Paragraph",
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  blockquote: "Quote",
  codeBlock: "Code block",
} as const;
type Block = keyof typeof BLOCKS;

function currentBlock(editor: Editor): Block {
  for (const level of [1, 2, 3] as const) if (editor.isActive("heading", { level })) return `h${level}`;
  if (editor.isActive("codeBlock")) return "codeBlock";
  if (editor.isActive("blockquote")) return "blockquote";
  return "paragraph";
}

function setBlock(editor: Editor, block: Block) {
  const chain = editor.chain().focus();
  // Leave a quote first so "Paragraph" always means a plain paragraph.
  if (block !== "blockquote" && editor.isActive("blockquote")) chain.lift("blockquote");
  if (block === "paragraph") chain.setParagraph();
  else if (block === "codeBlock") chain.setCodeBlock();
  else if (block === "blockquote") { if (!editor.isActive("blockquote")) chain.setParagraph().setBlockquote(); }
  else chain.setHeading({ level: Number(block.slice(1)) as 1 | 2 | 3 });
  chain.run();
}

function ToolButton({ label, shortcut, active, disabled, onClick, children }: {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      static
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      disabled={disabled}
      // Keep the selection in the document while the button is pressed.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="rounded-control aria-pressed:bg-surface-2 aria-pressed:text-text aria-pressed:shadow-raised"
    >
      {children}
    </Button>
  );
}

const Divider = () => <span aria-hidden className="mx-1 h-4 w-px bg-line" />;

function Toolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      block: currentBlock(editor),
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
      code: editor.isActive("code"),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      taskList: editor.isActive("taskList"),
      link: editor.isActive("link"),
      href: (editor.getAttributes("link").href as string | undefined) ?? "",
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    }),
  });
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");

  function openLink() {
    setHref(state.href);
    setLinkOpen((open) => !open);
  }
  function applyLink() {
    const url = href.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!url) chain.unsetLink().run();
    else chain.setLink({ href: /^(https?:|mailto:)/i.test(url) ? url : `https://${url}` }).run();
    setLinkOpen(false);
  }
  const mod = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl+";

  return (
    <div className="sticky top-[var(--topbar-h,0px)] z-10 border-b border-line-soft bg-surface/95 backdrop-blur-xl">
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 p-2">
        <Select.Root value={state.block} onValueChange={(value) => setBlock(editor, value as Block)}>
          <Select.Trigger aria-label="Text style" className="h-[26px] w-32 rounded-control py-1"><Select.Value /></Select.Trigger>
          <Select.Content>
            {(Object.keys(BLOCKS) as Block[]).map((block) => <Select.Item key={block} value={block}>{BLOCKS[block]}</Select.Item>)}
          </Select.Content>
        </Select.Root>
        <Divider />
        <ToolButton label="Bold" shortcut={`${mod}B`} active={state.bold} onClick={() => editor.chain().focus().toggleBold().run()}><BoldIcon /></ToolButton>
        <ToolButton label="Italic" shortcut={`${mod}I`} active={state.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><ItalicIcon /></ToolButton>
        <ToolButton label="Underline" shortcut={`${mod}U`} active={state.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon /></ToolButton>
        <ToolButton label="Strikethrough" active={state.strike} onClick={() => editor.chain().focus().toggleStrike().run()}><StrikethroughIcon /></ToolButton>
        <ToolButton label="Inline code" active={state.code} onClick={() => editor.chain().focus().toggleCode().run()}><CodeIcon /></ToolButton>
        <Divider />
        <ToolButton label="Bulleted list" active={state.bulletList} onClick={() => editor.chain().focus().toggleBulletList().run()}><ListIcon /></ToolButton>
        <ToolButton label="Numbered list" active={state.orderedList} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrderedIcon /></ToolButton>
        <ToolButton label="Checklist" active={state.taskList} onClick={() => editor.chain().focus().toggleTaskList().run()}><ListChecksIcon /></ToolButton>
        <Divider />
        <ToolButton label={state.link ? "Edit link" : "Add link"} active={state.link || linkOpen} onClick={openLink}><LinkIcon /></ToolButton>
        <div className="ml-auto flex items-center gap-0.5">
          <ToolButton label="Undo" shortcut={`${mod}Z`} disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}><Undo2Icon /></ToolButton>
          <ToolButton label="Redo" shortcut={`${mod}Shift+Z`} disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}><Redo2Icon /></ToolButton>
        </div>
      </div>
      {linkOpen && (
        <form
          className="flex items-center gap-2 border-t border-line-soft px-2 py-2"
          onSubmit={(event) => { event.preventDefault(); applyLink(); }}
        >
          <Input
            autoFocus
            aria-label="Link URL"
            placeholder="https://… (leave empty to remove the link)"
            value={href}
            onChange={(event) => setHref(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Escape") { setLinkOpen(false); editor.commands.focus(); } }}
            className="h-[26px] bg-well text-xs md:text-xs"
          />
          <Button type="submit" size="sm">{href.trim() ? "Apply" : "Remove"}</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => { setLinkOpen(false); editor.commands.focus(); }}>Cancel</Button>
        </form>
      )}
    </div>
  );
}

function Counts({ editor }: { editor: Editor }) {
  const { words, characters } = useEditorState({
    editor,
    selector: ({ editor }) => ({
      words: editor.storage.characterCount.words(),
      characters: editor.storage.characterCount.characters(),
    }),
  });
  return (
    <p aria-live="polite" className="tabular border-t border-line-soft px-4 py-2 text-[11px] text-muted">
      {words} word{words === 1 ? "" : "s"} · {characters} character{characters === 1 ? "" : "s"}
    </p>
  );
}

/**
 * Uncontrolled: `content` seeds the editor once. Remount with a `key` to load a
 * different document.
 */
export function RichEditor({ content, onChange, editable = true, placeholder = "Write the steps…", label, className }: {
  content: string;
  onChange?: (html: string) => void;
  editable?: boolean;
  placeholder?: string;
  label: string;
  className?: string;
}) {
  const editor = useEditor({
    // The app shell is server-rendered; mounting the view on the client avoids a hydration mismatch.
    immediatelyRender: false,
    editable,
    content,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          protocols: ["mailto"],
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    editorProps: {
      attributes: {
        class: cn("rich-content min-h-full px-4 py-4 outline-none sm:px-6", editable && "min-h-[360px]"),
        "aria-label": label,
        ...(editable ? { "aria-multiline": "true", role: "textbox" } : {}),
      },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  });

  if (!editor) return <div className={cn("min-h-[360px]", className)} aria-busy="true" />;
  return (
    <div className={cn("flex flex-col", className)}>
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} className="flex-1" />
      {editable && <Counts editor={editor} />}
    </div>
  );
}
