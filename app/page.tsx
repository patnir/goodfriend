import { auth, currentUser } from '@clerk/nextjs/server'

export default async function Home() {
  const { userId } = await auth()

  if (!userId) {
    return <div>Sign in to view this page</div>
  }

  const user = await currentUser()

  if (!user) {
    return <div>User not found</div>
  }

  if (!user.firstName) {
    return <div>Welcome, {user.emailAddresses[0].emailAddress}!</div>
  }

  return <div>Welcome, {user.firstName}!</div>
}
