// import { openai } from "@/lib/openai";
import { gemini } from "@/lib/gemini";

export async function POST(req: Request) {
  const { title, description } = await req.json();

//   const completion = await openai.chat.completions.create({
//     model: "gpt-3.5-turbo",
//     messages: [
//       {
//         role: "system",
//         content: "Summarize this proposal in 3 concise sentences and assess impact."
//       },
//       {
//         role: "user",
//         content: `${title}\n\n${description}`
//       }
//     ],
//   });

//   return Response.json({
//     summary: completion.choices[0].message.content,
//   });

  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: `Summarize this proposal in 3 concise sentences and assess impact. ${title}\n\n${description}`,
  });

  return Response.json({
    summary: response.text,
  });
}
