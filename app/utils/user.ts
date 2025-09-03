import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export const getOrCreateUser = async () => {
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
}