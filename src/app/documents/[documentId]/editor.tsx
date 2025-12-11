"use client"

import StarterKit from '@tiptap/starter-kit'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import Table from '@tiptap/extension-table'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import FontFamily from '@tiptap/extension-font-family'
import TextStyle from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import ImageResize from 'tiptap-extension-resize-image'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import { useEditor, EditorContent } from '@tiptap/react'
import { useLiveblocksExtension } from "@liveblocks/react-tiptap";
import { useStorage, useMutation as useLbMutation } from '@liveblocks/react'

import { useEditorStore } from '@/store/use-editor-store';
import { FontSizeExtension } from '@/extensions/font-size'
import { lineHeightExtension } from '@/extensions/line-height'
import { LEFT_MARGIN_DEFAULT, RIGHT_MARGIN_DEFAULT } from '@/constants/margins'
import { useEffect, useRef } from "react";
import { useVersionTracker } from '@/hooks/use-version-tracker'
import { useLockedParagraphs } from '@/hooks/use-locked-paragraphs'
import { EditorContextMenu } from './editor-context-menu'
import { LockedParagraphIndicator } from './locked-paragraph-indicator'
import { LockedParagraphExtension } from '@/extensions/locked-paragraph'
import { Id } from '../../../../convex/_generated/dataModel'
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from '../../../../convex/_generated/api'

import { Ruler } from './ruler'
import { Threads } from './threads'
import { useMutation } from "convex/react"

interface EditorProps {
  initialContent?: string | undefined;
  documentId: Id<"documents">;
  onOpenVersionHistory?: (position: number) => void;
};

export const Editor = ({ initialContent, documentId, onOpenVersionHistory }: EditorProps) => {
  const { user } = useUser();
  const leftMargin = useStorage((root) => root.leftMargin) ?? LEFT_MARGIN_DEFAULT;
  const rightMargin = useStorage((root) => root.rightMargin) ?? RIGHT_MARGIN_DEFAULT;
  const contentInitialized = useStorage((root) => root.contentInitialized);
  const setInitialized = useLbMutation(({ storage }) => {
    storage.set("contentInitialized", true);
  }, []);

  const liveblocks = useLiveblocksExtension({
    mentions: true,
    initialContent: contentInitialized === false ? initialContent : undefined,
    offlineSupport_experimental: true,
  });
  const { setEditor } = useEditorStore();
  const saveDocContent = useMutation(api.documents.updateContent);

  // Get locked paragraphs for the extension
  const lockedParagraphsQuery = useQuery(
    api.lockedParagraphs.getLockedParagraphs,
    { documentId }
  );

  // Create a ref to store locked paragraphs for the extension
  const lockedParagraphsRef = useRef<typeof lockedParagraphsQuery>(lockedParagraphsQuery || []);

  // Update ref when locked paragraphs change
  useEffect(() => {
    lockedParagraphsRef.current = lockedParagraphsQuery || [];
  }, [lockedParagraphsQuery]);

  const authInfo = useQuery(api.documents.getAuthInfo, { id: documentId });
  const isEditable = authInfo?.role === "editor";

  const editorInstance = useEditor({
    immediatelyRender: false,
    editable: false, // Start as non-editable, will be updated by authInfo
    onCreate({ editor }) {
      setEditor(editor);
      // Mark storage as initialized once editor is created and storage is loaded
      if (contentInitialized === false) {
        try { setInitialized(); } catch { }
      }
    },
    onDestroy() {
      setEditor(null);
    },
    onUpdate({ editor }) {
      setEditor(editor);
    },
    onSelectionUpdate({ editor }) {
      setEditor(editor);
    },
    onTransaction({ editor }) {
      setEditor(editor);
    },
    onFocus({ editor }) {
      setEditor(editor);
    },
    onBlur({ editor }) {
      setEditor(editor);
    },
    onContentError({ editor }) {
      setEditor(editor);
    },
    editorProps: {
      attributes: {
        style: `padding-left: ${leftMargin}px; padding-right: ${rightMargin}px;`,
        class: "focus:outline-none print:border-0 bg-white border border-[#C7C7C7] flex flex-col min-h-[1054px] w-[816px] pt-10 p4-14 pb-10 cursor-text"
      },
    },
    extensions: [
      liveblocks,
      LockedParagraphExtension.configure({
        getLockedParagraphs: () => lockedParagraphsRef.current || [],
        currentUserId: user?.id || null,
      }),
      StarterKit.configure({
        history: false,
      }),
      lineHeightExtension,
      FontSizeExtension,
      TextAlign.configure({
        types: ["heading", "paragraph"]
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https"
      }),
      Color,
      Highlight.configure({
        multicolor: true,
      }),
      TextStyle,
      FontFamily,
      Underline,
      Image,
      ImageResize,
      Table,
      TableCell,
      TableHeader,
      TableRow,
      TaskItem.configure({
        nested: true,
      }),
      TaskList,
    ],
  })

  // Update extension options when locked paragraphs or user changes
  useEffect(() => {
    if (!editorInstance) return;

    const extension = editorInstance.extensionManager.extensions.find(ext => ext.name === "lockedParagraph");
    if (extension) {
      extension.options.getLockedParagraphs = () => lockedParagraphsRef.current || [];
      extension.options.currentUserId = user?.id || null;
    }
  }, [lockedParagraphsQuery, user?.id, editorInstance]);

  // Track versions automatically
  useVersionTracker({ editor: editorInstance, documentId, enabled: isEditable });

  // Manage locked paragraphs
  const { lockedParagraphs } = useLockedParagraphs({ editor: editorInstance, documentId });

  // Force decoration recomputation when locks change (trigger a no-op transaction)
  useEffect(() => {
    if (!editorInstance) return;
    // Dispatch a meta-only transaction to let plugins re-evaluate decorations
    try {
      // @ts-ignore accessing internal view
      editorInstance.view.dispatch(editorInstance.state.tr.setMeta('lockedParagraphsUpdate', true));
    } catch { }
  }, [lockedParagraphs, editorInstance]);



  // Update editable state
  useEffect(() => {
    if (editorInstance && authInfo) {
      editorInstance.setEditable(isEditable);
    }
  }, [editorInstance, isEditable, authInfo]);

  // Debounced persist full document HTML to Convex for reload resilience
  useEffect(() => {
    if (!editorInstance || !isEditable) return;
    let timeout: any;
    const handle = () => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          const html = editorInstance.getHTML();
          await saveDocContent({ id: documentId, initialContent: html });
        } catch { }
      }, 2000); // 2s debounce
    };
    editorInstance.on("update", handle);
    return () => {
      editorInstance.off("update", handle);
      clearTimeout(timeout);
    };
  }, [editorInstance, documentId, saveDocContent, isEditable]);

  return (
    <div className='size-full overflow-x-auto bg-[#F9FBFD] px-4 print:p-0 print:bg-white print:overflow-visible'>
      <Ruler />
      <div className='min-w-max flex justify-center w-[816px] py-4 print:py-0 mx-auto print:w-full print:min-w-0'>
        <EditorContextMenu
          editor={editorInstance}
          documentId={documentId}
          onOpenVersionHistory={onOpenVersionHistory}
        >
          <EditorContent editor={editorInstance} />
        </EditorContextMenu>
        <Threads editor={editorInstance} />
        <LockedParagraphIndicator
          editor={editorInstance}
          lockedParagraphs={lockedParagraphs ?? []}
        />
      </div>
    </div>
  );
}
