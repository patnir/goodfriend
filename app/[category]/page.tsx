import ChatInterface from '@/app/components/ChatInterface'
import { getOrCreateUser } from '@/app/utils/user'
import { redirect } from 'next/navigation'

const VALID_CATEGORIES = ['gratitude', 'anxiety']

interface CategoryPageProps {
  params: Promise<{ category: string }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  try {
    const { category } = await params
    console.log('CategoryPage - category:', category)

    // Validate category first
    if (!VALID_CATEGORIES.includes(category)) {
      console.log('Invalid category, redirecting to home')
      redirect('/')
    }

    // Check if user is authenticated
    console.log('Getting user...')
    const user = await getOrCreateUser()
    console.log('User result:', user ? 'User found' : 'No user')

    if (!user) {
      console.log('No user, redirecting to home')
      redirect('/')
    }

    console.log('Rendering ChatInterface for category:', category)
    return <ChatInterface category={category} />
  } catch (error) {
    console.error('CategoryPage Error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}