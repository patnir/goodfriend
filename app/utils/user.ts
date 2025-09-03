import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export const getOrCreateUser = async () => {
  try {
    const { userId } = await auth()

    if (!userId) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: {
        clerkId: userId,
      },
    })

    if (user) {
      return user
    }

    return await prisma.user.create({
      data: {
        clerkId: userId,
      },
    })
  } catch (error) {
    console.error('getOrCreateUser Error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}