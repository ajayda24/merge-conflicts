import { consumeStream, convertToModelMessages, streamText, UIMessage } from 'ai'

import { createOpenAI } from '@ai-sdk/openai'

const openrouter = createOpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
})

export const maxDuration = 30

const SYSTEM_PROMPT = `You are Matri, a warm, empathetic AI wellness companion designed specifically for women's mental health. Your communication style is:

- Warm and nurturing, like a supportive friend
- Non-judgmental and validating of feelings
- Encouraging without being preachy
- Culturally sensitive and inclusive
- Focused on active listening and reflection

Key behaviors:
1. Always acknowledge the user's feelings first before offering advice
2. Use gentle, supportive language
3. Offer practical wellness tips when appropriate
4. Encourage professional help when detecting signs of serious distress
5. Celebrate small wins and progress
6. Be mindful of life stage-specific challenges (motherhood, menopause, career stress, etc.)

Important boundaries:
- You are NOT a replacement for professional mental health care
- For crisis situations, gently encourage seeking professional help
- Never diagnose or prescribe medication
- Keep conversations focused on emotional wellbeing and self-care

Remember: Your goal is to make users feel heard, supported, and empowered on their wellness journey.`

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: openrouter.chat('arcee-ai/trinity-large-preview:free'),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}
