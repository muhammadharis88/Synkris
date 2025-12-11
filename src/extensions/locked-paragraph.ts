import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, EditorView } from "@tiptap/pm/view";

interface LockedParagraph {
    position: number;
    length: number;
    lockedBy: string;
}

interface LockedParagraphExtensionOptions {
    getLockedParagraphs: () => LockedParagraph[];
    currentUserId: string | null;
}

export const LockedParagraphExtension = Extension.create<LockedParagraphExtensionOptions>({
    name: "lockedParagraph",

    addOptions() {
        return {
            getLockedParagraphs: () => [],
            currentUserId: null,
        };
    },

    addProseMirrorPlugins() {
        const self = this;
        const key = new PluginKey("lockedParagraph");
        return [
            new Plugin({
                key,
                state: {
                    init: (_, { doc }) => {
                        return DecorationSet.empty;
                    },
                    apply: (tr, old) => {
                        // Recompute decorations whenever something changes
                        const lockedParagraphs = self.options.getLockedParagraphs();
                        const currentUserId = self.options.currentUserId;

                        if (!lockedParagraphs || lockedParagraphs.length === 0) {
                            return DecorationSet.empty;
                        }

                        const decorations: Decoration[] = [];
                        for (const lock of lockedParagraphs) {
                            const from = Math.max(0, lock.position);
                            const to = Math.max(from, lock.position + lock.length);
                            const isMine = currentUserId && lock.lockedBy === currentUserId;
                            const bg = isMine ? 'rgba(250, 204, 21, 0.25)' : 'rgba(239, 68, 68, 0.12)';
                            const border = isMine ? '#f59e0b' : '#ef4444';
                            decorations.push(
                                Decoration.inline(from, to, {
                                    style: `background-color: ${bg}; box-shadow: inset 3px 0 0 0 ${border};`,
                                    'data-locked': 'true',
                                    'data-locked-by': lock.lockedBy,
                                })
                            );
                        }
                        return DecorationSet.create(tr.doc, decorations);
                    },
                },
                props: {
                    decorations(state) {
                        // @ts-ignore – access plugin state
                        return key.getState(state) as DecorationSet;
                    },
                    handleClick(view: EditorView, pos: number, event: MouseEvent) {
                        try {
                            const target = event.target as HTMLElement | null;
                            if (!target) return false;
                            // Find element with data-locked in ancestors
                            const el = target.closest('[data-locked="true"]') as HTMLElement | null;
                            if (!el) return false;

                            const lockedBy = el.getAttribute('data-locked-by');
                            if (!lockedBy) return false;

                            const showPopup = async () => {
                                let userName = 'Unknown User';
                                const currentUserId = self.options.currentUserId;
                                if (currentUserId && lockedBy === currentUserId) {
                                    userName = 'you';
                                } else {
                                    try {
                                        const res = await fetch(`/api/user-info?userId=${lockedBy}`);
                                        if (res.ok) {
                                            const data = await res.json();
                                            userName = data?.name || userName;
                                        }
                                    } catch {}
                                }

                                const rect = el.getBoundingClientRect();
                                const popup = document.createElement('div');
                                popup.className = 'locked-paragraph-popup';
                                popup.style.cssText = `
                                    position: absolute;
                                    top: 0;
                                    left: 0;
                                    background: #111827;
                                    color: white;
                                    padding: 6px 10px;
                                    border-radius: 6px;
                                    font-size: 12px;
                                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1);
                                    z-index: 1000;
                                    white-space: nowrap;
                                    transform: translate(-50%, -100%);
                                `;
                                popup.textContent = `Text locked by ${userName}`;

                                const caret = document.createElement('div');
                                caret.style.cssText = `
                                    position: absolute;
                                    bottom: -5px;
                                    left: 50%;
                                    transform: translateX(-50%);
                                    width: 0; height: 0;
                                    border-left: 6px solid transparent;
                                    border-right: 6px solid transparent;
                                    border-top: 6px solid #111827;
                                `;
                                popup.appendChild(caret);

                                document.body.appendChild(popup);
                                const top = rect.top + window.scrollY - 8;
                                const left = rect.left + window.scrollX + rect.width / 2;
                                popup.style.top = `${top}px`;
                                popup.style.left = `${left}px`;

                                const remove = () => { popup.remove(); document.removeEventListener('click', onDocClick); };
                                const onDocClick = (e: MouseEvent) => {
                                    if (!popup.contains(e.target as Node)) remove();
                                };
                                setTimeout(() => document.addEventListener('click', onDocClick), 0);
                                setTimeout(remove, 3000);
                            };

                            showPopup();
                            return true;
                        } catch {
                            return false;
                        }
                    },
                },
                filterTransaction: (transaction) => {
                    // Allow selection-only transactions
                    if (transaction.steps.length === 0) return true;

                    const lockedParagraphs = self.options.getLockedParagraphs();
                    if (!lockedParagraphs || lockedParagraphs.length === 0) return true;

                    // Check each step range against locks
                    // We conservatively read step.from/to if present; otherwise fall back to selection
                    // This blocks edits that touch any locked range (for everyone)
                    // but allows other operations to proceed for realtime sync.
                    // @ts-ignore generic step typing
                    for (const step of transaction.steps) {
                        // Default to selection if positions not available
                        let stepFrom = (transaction.selection && transaction.selection.from) || 0;
                        let stepTo = (transaction.selection && transaction.selection.to) || 0;
                        if ('from' in step && typeof step.from === 'number') stepFrom = step.from;
                        if ('to' in step && typeof step.to === 'number') stepTo = step.to;

                        for (const lock of lockedParagraphs) {
                            const lockStart = lock.position;
                            const lockEnd = lock.position + lock.length;
                            if (!(stepTo <= lockStart || stepFrom >= lockEnd)) {
                                return false;
                            }
                        }
                    }

                    return true;
                },
            }),
        ];
    },
});

