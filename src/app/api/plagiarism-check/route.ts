import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text || typeof text !== "string") {
            return NextResponse.json(
                { success: false, error: "Text is required" },
                { status: 400 }
            );
        }

        if (text.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: "Text cannot be empty" },
                { status: 400 }
            );
        }

        // Get API key from environment
        const apiKey = process.env.PLAGIARISM_CHECKER_API_KEY;

        if (!apiKey) {
            console.error("PLAGIARISM_CHECKER_API_KEY is not set in environment variables");
            return NextResponse.json(
                { success: false, error: "Plagiarism checker is not configured" },
                { status: 500 }
            );
        }

        // Call PrePostSEO API
        const formData = new URLSearchParams();
        formData.append('key', apiKey);
        formData.append('data', text.trim()); // Use 'data' instead of 'query'

        const response = await fetch('https://www.prepostseo.com/apis/checkPlag', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        // Get response as text first to check if it's JSON or HTML
        const responseText = await response.text();

        if (!response.ok) {
            console.error('PrePostSEO API Error:', {
                status: response.status,
                statusText: response.statusText,
                body: responseText.substring(0, 500),
                apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'missing'
            });
            return NextResponse.json(
                { success: false, error: `API Error (${response.status}): ${responseText.substring(0, 100)}` },
                { status: 500 }
            );
        }

        // Check if response is HTML instead of JSON
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
            console.error('API returned HTML instead of JSON:', responseText.substring(0, 500));
            return NextResponse.json(
                { success: false, error: 'API endpoint returned HTML. Please check the endpoint URL and API key.' },
                { status: 500 }
            );
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Failed to parse API response:', responseText.substring(0, 500));
            return NextResponse.json(
                { success: false, error: 'Invalid API response format' },
                { status: 500 }
            );
        }


        // Parse checkPlag endpoint response format
        const plagPercent = data.plagPercent || 0;
        const uniquePercent = data.uniquePercent || 0;
        const sources = data.sources || [];
        const details = data.details || [];

        // Determine if content is unique
        const isUnique = plagPercent === 0 || uniquePercent === 100;

        // Format the response
        return NextResponse.json({
            success: true,
            score: plagPercent,
            analysis: isUnique
                ? "Content appears to be unique!"
                : `Found ${plagPercent}% plagiarism in ${sources.length} online source${sources.length !== 1 ? 's' : ''}.`,
            details: details.map((detail: any) => ({
                source: detail.display?.url || "Unknown source",
                title: detail.display?.url || "No title",
                description: detail.display?.des || detail.query || "",
                unique: detail.unique, // Include unique field for frontend filtering
                percentage: detail.percentage || 0
            })),
            isUnique: isUnique,
            totalMatches: sources.length,
            plagPercent: plagPercent,
            uniquePercent: uniquePercent
        });

    } catch (error: any) {
        console.error("Plagiarism Check Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Something went wrong." },
            { status: 500 }
        );
    }
}
