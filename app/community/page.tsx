import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/app-header'
import { CommunityContent } from '@/components/community-content'

export default async function CommunityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: threads } = await supabase
    .from('threads')
    .select(`
      *,
      comments:comments(count)
    `)
    .order('created_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const username = profile?.full_name || user.email || 'Member'

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <CommunityContent threads={threads || []} userId={user.id} username={username} />
    </div>
  )
}
