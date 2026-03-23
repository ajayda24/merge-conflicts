import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { ThreadContent } from '@/components/thread-content'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ThreadPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: thread } = await supabase
    .from('threads')
    .select('*')
    .eq('id', id)
    .single()

  if (!thread) {
    notFound()
  }

  const { data: comments } = await supabase
    .from('comments')
    .select('*')
    .eq('thread_id', id)
    .order('created_at', { ascending: true })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const username = profile?.full_name || user.email || 'Member'

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <ThreadContent thread={thread} comments={comments || []} userId={user.id} username={username} />
    </div>
  )
}
