// supabase/functions/gemini-chat/index.ts
//
// WebCraft Finance — "Financial Friend" conversational chat proxy.
// This runs on Supabase's servers (Deno runtime), NOT in the browser.
// The Gemini API key lives only here, as a secret — never in any file the browser loads.

const GEMINI_MODEL = "gemini-2.5-flash"; // free-tier model as of mid-2026; check aistudio.google.com if this changes
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Allow requests from any origin for now (this is a personal/dev project).
// Once you have a real deployed domain, tighten this to that exact origin.
const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function buildSystemPrompt(context: Record<string, unknown>): string {
    const persona = context?.persona === "professional" ? "professional" : "beginner";
    const currency = context?.currency || "INR";
    const activeCalculator = context?.activeCalculatorId || "none";
    const goalsSummary = context?.goalsSummary || "no saved goals yet";

    return `You are "Financial Friend," the built-in AI coach inside a financial planning web app called WebCraft Finance.

TONE — this matters a lot:
- You are a supportive peer who happens to have a finance degree. Not a compliance bot, not a corporate chatbot, not overly cheerful.
- Speak like a real person texting a friend back. Short sentences. No robotic phrasing like "Your debt-to-income ratio exceeds recommended parameters."
- Don't dodge the real number or the real risk to sound nice — name it plainly, then help.
- Default to 2-4 sentences. Only go longer if the question genuinely needs a structured breakdown, and even then keep it tight.
- Avoid bullet-point walls of text unless explicitly asked for a list.
- You are not a licensed financial advisor. For big irreversible decisions (large lump-sum moves, tax filing specifics, legal/estate matters), say so plainly and suggest a professional. For everyday questions ("should I bump my SIP", "how big should my emergency fund be"), just answer directly like a knowledgeable friend would — don't hedge everything into mush.

CURRENT USER CONTEXT (use this naturally if relevant, don't just recite it back):
- Interface mode: ${persona}
- Currency in use: ${currency}
- Calculator they're currently looking at: ${activeCalculator}
- Their saved goals: ${goalsSummary}

Answer the user's message now, in character, following the rules above.`;
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: CORS_HEADERS });
    }

    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    }

    try {
        const { message, context } = await req.json();

        if (!message || typeof message !== "string") {
            return new Response(JSON.stringify({ error: "Missing 'message' in request body." }), {
                status: 400,
                headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
            });
        }

        const apiKey = Deno.env.get("GEMINI_API_KEY");
        if (!apiKey) {
            console.error("GEMINI_API_KEY secret is not set on this Edge Function.");
            return new Response(
                JSON.stringify({ reply: "I'm not fully wired up yet on the backend — my API key hasn't been configured." }),
                { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
            );
        }

        const systemPrompt = buildSystemPrompt(context || {});

        const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: systemPrompt }],
                },
                contents: [
                    {
                        role: "user",
                        parts: [{ text: message }],
                    },
                ],
                generationConfig: {
                    maxOutputTokens: 300,
                    temperature: 0.8,
                },
            }),
        });

        if (!geminiRes.ok) {
            const errBody = await geminiRes.text();
            console.error("Gemini API error:", geminiRes.status, errBody);

            // Friendly fallback instead of a raw error, per spec
            if (geminiRes.status === 429) {
                return new Response(
                    JSON.stringify({ reply: "I'm getting a lot of questions right now — give me a few seconds and try again." }),
                    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
                );
            }
            return new Response(
                JSON.stringify({ reply: "Something hiccupped on my end. Mind trying that again in a moment?" }),
                { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
            );
        }

        const data = await geminiRes.json();
        const replyText =
            data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
            "I'm not sure how to answer that one — could you rephrase it?";

        return new Response(JSON.stringify({ reply: replyText }), {
            status: 200,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("Unexpected error in gemini-chat function:", err);
        return new Response(
            JSON.stringify({ reply: "Something went wrong on my end. Give it another try in a moment." }),
            { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
    }
});