import { auth, currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'

export default async function Home() {
  const { userId } = await auth()

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-semibold mb-4">Good Friend</h1>
        <p className="text-gray-600 mb-8 text-center">Please sign in to continue</p>
      </div>
    )
  }

  const user = await currentUser()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-semibold mb-8">Good Friend</h1>
      <p className="text-gray-600 mb-8 text-center">Welcome, {user?.firstName}!</p>
      <div className="w-full max-w-md space-y-4">
        <Link
          href="/gratitude"
          className="block w-full p-4 text-center bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          🙏 Gratitude Moment
        </Link>
        <Link
          href="/anxiety"
          className="block w-full p-4 text-center bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          🧠 Anxiety Helper
        </Link>
      </div>
    </div>
  )
}
