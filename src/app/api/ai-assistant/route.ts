import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { prompt, selectedText, type } = await req.json();

        // Validation
        if (!prompt || typeof prompt !== "string") {
            return NextResponse.json(
                { success: false, error: "Prompt is required" },
                { status: 400 }
            );
        }

        if (prompt.length > 2000) {
            return NextResponse.json(
                { success: false, error: "Prompt is too long (max 2000 characters)" },
                { status: 400 }
            );
        }

        // Build the full prompt
        let fullPrompt = "";

        if (type === "edit" && selectedText) {
            fullPrompt = `${prompt}

Text to modify:
${selectedText}

IMPORTANT: Provide ONLY the modified text as plain text. Do not use HTML tags, markdown formatting, code blocks, or any other formatting. Return only the improved text that can directly replace the original.`;
        } else if (type === "generate") {
            fullPrompt = `${prompt}

Generate a well-structured document in clean HTML format for a rich text editor.

IMPORTANT FORMATTING RULES:
1. Use proper semantic HTML tags: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>
2. Do NOT include any markdown code blocks or backticks
3. Do NOT add excessive newlines or blank lines between elements
4. Write the HTML in a compact format with minimal spacing
5. Each HTML tag should flow directly to the next without extra line breaks
6. Only include the HTML content - no explanations, no comments

Example of desired compact format:
<h1>Title</h1><p>Introduction paragraph.</p><h2>Section</h2><p>Content here.</p><ul><li>Item 1</li><li>Item 2</li></ul>

Now generate the document:`;
        } else {
            fullPrompt = prompt;
        }

        // Call OpenRouter API with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL!,
                    'X-Title': process.env.NEXT_PUBLIC_APP_NAME!,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: process.env.MODEL_NAME,
                    messages: [
                        {
                            role: 'user',
                            content: fullPrompt,
                        },
                    ],
                }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('OpenRouter API Error:', errorData);

                if (response.status === 429) {
                    return NextResponse.json(
                        { success: false, error: "Too many requests. Please try again in a moment." },
                        { status: 429 }
                    );
                }

                if (response.status === 503) {
                    return NextResponse.json(
                        { success: false, error: "AI service temporarily unavailable. Please try again." },
                        { status: 503 }
                    );
                }

                return NextResponse.json(
                    { success: false, error: "Failed to generate content. Please try again." },
                    { status: 500 }
                );
            }

            const data = await response.json();
            let text = data.choices?.[0]?.message?.content;

            if (!text) {
                return NextResponse.json(
                    { success: false, error: "No response from AI" },
                    { status: 500 }
                );
            }

            // Clean up the response
            text = text.trim();

            // Remove markdown code blocks (```html ... ``` or ``` ... ```)
            text = text.replace(/```html\s*/gi, '');
            text = text.replace(/```\s*$/g, '');
            text = text.replace(/^```\s*/g, '');

            // For edit mode, also remove any HTML tags (keep only text content)
            if (type === "edit") {
                // Remove any remaining inline code markers
                text = text.replace(/`([^`]+)`/g, '$1');
                // Remove HTML tags if present (keep only text content)
                text = text.replace(/<[^>]*>/g, '');
                text = text.trim();
            }

            // Minimal cleanup for generate mode - let the prompt do the work
            if (type === "generate") {
                // Only remove the aggressive whitespace between tags that AI might add
                text = text.replace(/>\s+</g, '><');
                text = text.trim();
            }

            return NextResponse.json({
                success: true,
                content: text,
            });

        } catch (fetchError: any) {
            clearTimeout(timeoutId);

            if (fetchError.name === 'AbortError') {
                return NextResponse.json(
                    { success: false, error: "Request took too long. Please try again." },
                    { status: 504 }
                );
            }

            throw fetchError;
        }

    } catch (error: any) {
        console.error("AI Assistant Error:", error);

        return NextResponse.json(
            { success: false, error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
