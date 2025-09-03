import ChatInterface from '@/app/components/ChatInterface'
import { getOrCreateUser } from '@/app/utils/user'
import { redirect } from 'next/navigation'

const VALID_CATEGORIES = ['gratitude', 'anxiety']

interface CategoryPageProps {
  params: Promise<{ category: string }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params

  // Check if user is authenticated
  const user = await getOrCreateUser()
  if (!user) {
    redirect('/')
  }

  // Validate category
  if (!VALID_CATEGORIES.includes(category)) {
    redirect('/')
  }

  return (
    <div className="min-h-screen">
      <ChatInterface category={category} />
    </div>
  )
}