"use client";

import { useState } from "react";
import { Loader2, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AIDocumentGeneratorProps {
    open: boolean;
    onClose: () => void;
    onInsert: (content: string) => void;
}

export const AIDocumentGenerator = ({ open, onClose, onInsert }: AIDocumentGeneratorProps) => {
    const [prompt, setPrompt] = useState("");
    const [aiResponse, setAiResponse] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error("Please enter a description of the document you want to create");
            return;
        }

        setIsLoading(true);
        setAiResponse("");

        try {
            const response = await fetch("/api/ai-assistant", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    type: "generate",
                }),
            });

            const data = await response.json();

            if (!data.success) {
                toast.error(data.error || "Failed to generate document");
                return;
            }

            setAiResponse(data.content);
            toast.success("Document generated successfully!");
        } catch (error) {
            console.error("AI Error:", error);
            toast.error("Failed to connect to AI service");
        } finally {
            setIsLoading(false);
        }
    };

    const handleInsert = () => {
        if (aiResponse) {
            onInsert(aiResponse);
            handleClose();
            toast.success("Document inserted successfully!");
        }
    };

    const handleClose = () => {
        setPrompt("");
        setAiResponse("");
        setIsLoading(false);
        onClose();
    };

    // Template prompts
    const templates = [
        {
            title: "Meeting Notes",
            prompt: "Create a meeting notes template with sections for attendees, agenda, discussion points, action items, and next steps",
        },
        {
            title: "Project Proposal",
            prompt: "Create a project proposal template with executive summary, objectives, scope, timeline, budget, and team structure",
        },
        {
            title: "Business Letter",
            prompt: "Create a professional business letter template with proper formatting",
        },
        {
            title: "Technical Documentation",
            prompt: "Create a technical documentation template with overview, requirements, architecture, implementation details, and usage examples",
        },
    ];

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="size-5 text-purple-600" />
                        AI Document Generator
                    </DialogTitle>
                    <DialogDescription>
                        Describe the document you want to create, and AI will generate it for you
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Templates */}
                    <div>
                        <Label className="text-sm font-medium mb-2 block">Quick Templates</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {templates.map((template) => (
                                <Button
                                    key={template.title}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPrompt(template.prompt)}
                                    disabled={isLoading}
                                    className="justify-start"
                                >
                                    <FileText className="size-3.5 mr-2" />
                                    {template.title}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Prompt Input */}
                    <div>
                        <Label htmlFor="document-prompt">Describe your document</Label>
                        <Textarea
                            id="document-prompt"
                            placeholder="E.g., Create a professional resume for a software engineer with 5 years of experience in web development..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            disabled={isLoading}
                            className="mt-1.5 min-h-[120px]"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                    handleGenerate();
                                }
                            }}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Be specific about the structure, content, and format you want. Press Ctrl+Enter to generate.
                        </p>
                    </div>

                    {/* Generate Button */}
                    <Button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        className="w-full"
                        size="lg"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="size-5 mr-2 animate-spin" />
                                Generating Document...
                            </>
                        ) : (
                            <>
                                <Sparkles className="size-5 mr-2" />
                                Generate Document
                            </>
                        )}
                    </Button>

                    {/* AI Response Preview */}
                    {aiResponse && (
                        <div>
                            <Label className="text-sm font-medium">Generated Document Preview</Label>
                            <div
                                className="mt-1.5 p-4 bg-green-50 border border-green-200 rounded-md text-sm max-h-96 overflow-y-auto"
                                dangerouslySetInnerHTML={{ __html: aiResponse }}
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Review the generated content above. Click "Insert Document" to add it to your editor.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleInsert}
                        disabled={!aiResponse || isLoading}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        <FileText className="size-4 mr-2" />
                        Insert Document
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
