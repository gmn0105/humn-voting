import { getGemini } from "@/lib/gemini";

export async function POST(req: Request) {
  const { title, description } = await req.json();
  const gemini = getGemini();
  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: `Summarize this proposal in 3 concise sentences and assess impact. ${title}\n\n${description}`,
  });
  return Response.json({
    summary: response.text,
  });
}
