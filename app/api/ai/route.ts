import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt, maxTokens = 1000 } = (await req.json()) as {
    prompt: string;
    maxTokens?: number;
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return NextResponse.json({ error: err }, { status: response.status });
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text =
    data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("") ?? "";

  return NextResponse.json({ text });
}
