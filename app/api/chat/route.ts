import { getOrCreateUser } from '@/app/utils/user'
import { callOpenAI } from '@/lib/openai'
import prisma from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { category, message, conversationId, selectedChoice } = await req.json()

    // Get or create conversation
    const conversation = conversationId
      ? await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { order: 'asc' } } }
      })
      : await prisma.conversation.create({
        data: {
          userId: user.id,
          category,
          totalSteps: category === 'anxiety' ? 4 : 3
        },
        include: { messages: { orderBy: { order: 'asc' } } }
      })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // If brand new conversation, send initial prompt
    if (conversation.messages.length === 0) {
      const initialPrompt = category === 'gratitude'
        ? 'What are you grateful for today?'
        : 'What are you feeling anxious about?'

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: initialPrompt,
          messageType: 'text',
          step: 1,
          order: 1
        }
      })

      const updatedConversation = await prisma.conversation.findUnique({
        where: { id: conversation.id },
        include: { messages: { orderBy: { order: 'asc' } } }
      })

      return NextResponse.json({
        conversation: updatedConversation,
        isComplete: false
      })
    }

    // User is responding to something
    if (message || selectedChoice !== undefined) {
      const currentOrder = conversation.messages.length + 1

      // Save user message
      const userContent = selectedChoice !== undefined
        ? conversation.messages[conversation.messages.length - 1]?.choices?.[selectedChoice] || message
        : message

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'user',
          content: userContent,
          messageType: selectedChoice !== undefined ? 'choice_selection' : 'text',
          selectedChoice,
          step: conversation.currentStep,
          order: currentOrder
        }
      })

      // Count user messages to determine what AI should do next
      const userMessageCount = await prisma.message.count({
        where: { conversationId: conversation.id, role: 'user' }
      })

      // Generate AI response based on user message count
      let aiContent = ''
      let messageType = 'text'
      let choices: string[] = []

      if (category === 'gratitude') {
        if (userMessageCount === 1) {
          // First user message - reflect and ask follow-up
          const gratitudeText = userContent
          aiContent = await callOpenAI(
            `Here's what I'm grateful for today: ${gratitudeText}`,
            `You are a positive, encouraging gratitude coach. The user just shared things they're grateful for. Your job is to:
1. Reflect back ONE specific item that stands out 
2. Ask a brief, thoughtful follow-up question about why it matters to them
3. Keep it warm, personal, and under 2 sentences

Example: "I love that you mentioned your morning coffee! What is it about that moment that makes your day better?"

Be conversational and genuine.`
          )
        } else if (userMessageCount === 2) {
          // Second user message - final encouragement
          const allUserMessages = await prisma.message.findMany({
            where: { conversationId: conversation.id, role: 'user' },
            orderBy: { order: 'asc' }
          })
          const gratitudeText = allUserMessages[0]?.content || ''
          const reflectionText = allUserMessages[1]?.content || ''

          aiContent = await callOpenAI(
            `My gratitude: ${gratitudeText}\nMy reflection: ${reflectionText}\n\nGive me an encouraging wrap-up message.`,
            `You are a gratitude coach. Based on what the user shared, give them a brief, uplifting message that:
1. Acknowledges their gratitude practice
2. Highlights the positive impact of what they shared  
3. Ends with encouragement for tomorrow
4. Keep it to 2-3 sentences max

Be warm and authentic, not preachy.`
          )
        }
      } else if (category === 'anxiety') {
        if (userMessageCount === 1) {
          // First user message - identify negative thoughts as choices
          const anxietyText = userContent
          messageType = 'choices'

          aiContent = await callOpenAI(
            `I'm feeling anxious about this: "${anxietyText}"

Can you help me identify the specific negative thoughts that might be behind this concern?`,
            `You are a helpful CBT (Cognitive Behavioral Therapy) assistant. The user will share a concern or anxiety. Your job is to identify 2-3 specific negative thoughts that might be behind their concern. Format your response as a simple numbered list, with each thought as a complete "I" statement from the user's perspective.

Example format:
1. I will embarrass myself
2. Everyone will judge me  
3. I have nothing interesting to say

Keep it concise and focused.`
          )

          // Extract choices from AI response and clean them up
          const lines = aiContent.split('\n').filter(line => line.trim() && /^\d+\./.test(line.trim()))
          choices = lines.map(line => line.replace(/^\d+\.\s*/, '').trim())

          // Create a cleaner message for display
          aiContent = "I can see some negative thoughts behind your concern. Which one feels strongest right now?"
        } else if (userMessageCount === 2) {
          // Second user message - user selected a negative thought, ask challenge question
          const selectedThought = userContent

          aiContent = await callOpenAI(
            `I want to challenge this negative thought: "${selectedThought}"

Help me examine this thought with a good CBT-style question.`,
            `You are a CBT assistant helping someone challenge a negative thought. Ask ONE clear, supportive question that will help them examine the evidence or consider alternative perspectives. Use proven CBT techniques. Keep it conversational and brief.

Examples of good questions:
- "What evidence do you actually have that this will happen?"
- "What would you tell a close friend who said this about themselves?"
- "What's the most realistic outcome here?"

Just return the question, nothing else.`
          )
        } else if (userMessageCount === 3) {
          // Third user message - user reflected, now give complete response with balanced thought + actions
          const allUserMessages = await prisma.message.findMany({
            where: { conversationId: conversation.id, role: 'user' },
            orderBy: { order: 'asc' }
          })
          const originalConcern = allUserMessages[0]?.content || ''
          const selectedThought = allUserMessages[1]?.content || ''
          const userReflection = allUserMessages[2]?.content || ''

          // Generate balanced thought (shorter prompt)
          const balancedThought = await callOpenAI(
            `Negative thought: "${selectedThought}"
User reflection: "${userReflection}"

Create a balanced, realistic replacement thought in first person.`,
            `Create a short, balanced "I" statement that's realistic and empowering. Keep it concise.`
          )

          // Generate actions (shorter prompt for concise response)
          const actions = await callOpenAI(
            `Original concern: "${originalConcern}"
Balanced thought: "${balancedThought}"

Suggest 3 small, specific actions to help with this concern.`,
            `Give 3 short, actionable steps. Format as simple numbered list. Be concise and practical.`
          )

          // Combine everything into one smooth response with better formatting
          aiContent = `💡 **Balanced thought:**  
"${balancedThought}"

**Quick actions:**  
${actions}

✨ **You've got this!** Remember your balanced thought when this comes up again.`
        }
      }

      // Save AI response
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: 'assistant',
          content: aiContent,
          messageType,
          choices,
          step: conversation.currentStep,
          order: currentOrder + 1
        }
      })

      // Update conversation step and completion
      const maxMessages = category === 'gratitude' ? 2 : 3  // Anxiety: 3 user messages (streamlined)
      const isComplete = userMessageCount >= maxMessages

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          currentStep: conversation.currentStep + 1,
          isComplete
        }
      })
    }

    // Return final state
    const finalConversation = await prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: { messages: { orderBy: { order: 'asc' } } }
    })

    return NextResponse.json({
      conversation: finalConversation,
      isComplete: finalConversation?.isComplete || false
    })

  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}