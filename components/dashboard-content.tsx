'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MoodCheckin } from '@/components/mood-checkin'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  MessageCircle, ChevronDown, Home, ClipboardCheck,
  Lightbulb, Stethoscope, TrendingUp, Flame, Download, Heart,
} from 'lucide-react'
import { STAGE_COLORS } from '@/lib/matriai-data'
import {
  getUser, saveUser, createNewUser, todayCheckedIn,
  getWeeklyData, getAvgScore7d, getStreak, generateContextBullets,
  type MatriAIUser,
} from '@/lib/matriai-storage'

interface CheckinData {
  id: string
  mood: number
  energy: number
  sleep_quality: number
  notes: string | null
  created_at: string
}

interface ProfileData {
  full_name: string | null
  life_stage: string | null
}

interface DashboardContentProps {
  profile: ProfileData
  recentCheckins: CheckinData[]
  hasCheckedInToday: boolean
}

export function DashboardContent({
  profile,
  recentCheckins,
  hasCheckedInToday,
}: DashboardContentProps) {
  const [localUser, setLocalUser] = useState<MatriAIUser | null>(null)
  const [showCheckin, setShowCheckin] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const firstName = profile.full_name?.split(' ')[0] || localUser?.pseudonym || 'there'
  const stage = localUser?.lifeStage || profile.life_stage || 'unsure'
  const stageColor = STAGE_COLORS[stage] || STAGE_COLORS.unsure

  // Time-based greeting (client-only)
  const [greeting, setGreeting] = useState('')
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  // Load local user — NO seed data generated
  useEffect(() => {
    let user = getUser()
    if (!user) {
      const newUser = createNewUser()
      newUser.lifeStage = stage
      newUser.pseudonym = firstName
      newUser.onboardingComplete = true
      saveUser(newUser)
      user = newUser
    }
    setLocalUser(user)

    // Show check-in modal: prefer server-side truth (avoids false positive on new device)
    if (!hasCheckedInToday && !todayCheckedIn(user.checkIns)) {
      setShowCheckin(true)
    }
  }, [stage, firstName, hasCheckedInToday])

  // Computed data — use localStorage check-ins as primary, fall back to DB checkins prop
  const weeklyData = useMemo(() => {
    // If localStorage has check-ins, use them (rich data with computed scores)
    if (localUser && localUser.checkIns.length > 0) {
      return getWeeklyData(localUser.checkIns)
    }
    // Fall back: build chart from server-side DB checkins (mood 1-5 scaled to 0-100)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (6 - i))
      const dateStr = d.toISOString().split('T')[0]
      const match = recentCheckins.find(
        (c) => new Date(c.created_at).toISOString().split('T')[0] === dateStr
      )
      return {
        day: days[d.getDay()],
        date: dateStr,
        score: match ? Math.round((match.mood / 5) * 100) : -1,
      }
    })
  }, [localUser, recentCheckins])

  const avgScore = useMemo(() => {
    if (localUser && localUser.checkIns.length > 0) return getAvgScore7d(localUser.checkIns)
    // Fall back to server checkins average (mood scaled to 100)
    const scores = recentCheckins
      .filter(c => {
        const diff = Date.now() - new Date(c.created_at).getTime()
        return diff <= 7 * 86400000
      })
      .map(c => Math.round((c.mood / 5) * 100))
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : -1
  }, [localUser, recentCheckins])

  const streak = useMemo(() => localUser ? getStreak(localUser.checkIns) : 0, [localUser])
  const contextBullets = useMemo(() => localUser ? generateContextBullets(localUser) : [], [localUser])

  const latestCheckIn = localUser?.checkIns[localUser.checkIns.length - 1]
  const latestScreening = localUser?.screenings[localUser.screenings.length - 1]
  const weekCheckIns = localUser?.checkIns.filter(c => {
    const diff = Date.now() - new Date(c.date).getTime()
    return diff <= 7 * 86400000
  }).length || 0

  const hasAnyData = (localUser?.checkIns.length || 0) > 0

  const maxBarScore = 100

  const getSeverityClass = (s: number) => {
    if (s >= 70) return { bg: 'bg-green-500', text: 'text-green-600', label: 'Low' }
    if (s >= 40) return { bg: 'bg-amber-500', text: 'text-amber-600', label: 'Moderate' }
    return { bg: 'bg-pink-500', text: 'text-pink-600', label: 'Severe' }
  }

  // ─── PDF REPORT GENERATION ─────────────────────────────
  const handleDownloadReport = useCallback(() => {
    if (!localUser) return
    setIsGeneratingPDF(true)

    const today = new Date()
    const dateStr = today.toISOString().split('T')[0]

    // Get last 7 days of data
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

    const recentCheckIns = localUser.checkIns.filter(c => {
      const d = new Date(c.date)
      return d >= sevenDaysAgo && d <= today
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const latestScreen = localUser.screenings[localUser.screenings.length - 1]
    const userName = profile.full_name || localUser.pseudonym || 'Patient'

    // Build chart bars HTML
    const chartBars = weeklyData.map(d => {
      const hasData = d.score >= 0
      const heightPct = hasData ? Math.max((d.score / 100) * 80, 4) : 4
      const color = hasData
        ? d.score >= 70 ? '#22c55e' : d.score >= 40 ? '#f59e0b' : '#ec4899'
        : '#e5e7eb'
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1">
        <div style="font-size:9px;color:#6b7280">${hasData ? d.score : ''}</div>
        <div style="height:${heightPct}mm;width:12mm;background:${color};border-radius:3px 3px 0 0"></div>
        <div style="font-size:9px;color:#374151;font-weight:600">${d.day}</div>
      </div>`
    }).join('')

    // Build check-in rows
    const checkInRows = recentCheckIns.map(c =>
      `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${c.date}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${c.mood}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${c.computedScore}/100</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${c.sleep}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${c.symptoms.join(', ') || 'None'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #f3f4f6">${c.notes || '—'}</td>
      </tr>`
    ).join('')

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>MatriAI Report — ${dateStr}</title>
  <style>
    @page { size: A4; margin: 20mm 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; font-size: 11px; }
    h1 { font-size: 22px; color: #be185d; margin: 0 0 4px 0; }
    h2 { font-size: 14px; color: #374151; margin: 16px 0 8px 0; border-bottom: 2px solid #fce7f3; padding-bottom: 4px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .header-right { text-align: right; color: #6b7280; font-size: 10px; }
    .meta { color: #6b7280; font-size: 10px; margin-bottom: 16px; }
    .chart-container { display: flex; align-items: flex-end; gap: 3px; height: 90px; margin: 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #fdf2f8; padding: 6px 8px; text-align: left; font-weight: 600; color: #be185d; }
    td { vertical-align: top; }
    .screening-box { background: #fdf2f8; border-radius: 8px; padding: 12px 16px; margin-top: 8px; }
    .screening-score { font-size: 28px; font-weight: 700; color: #be185d; }
    .tag { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 9px; font-weight: 600; margin-left: 8px; }
    .tag-low { background: #dcfce7; color: #166534; }
    .tag-moderate { background: #fef9c3; color: #854d0e; }
    .tag-severe { background: #fce7f3; color: #831843; }
    .cultural-box { background: #f9fafb; border-radius: 8px; padding: 10px 14px; font-size: 10px; color: #4b5563; }
    .disclaimer { font-size: 9px; color: #9ca3af; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>MatriAI Wellbeing Report</h1>
      <div class="meta">Patient: ${userName} &nbsp;·&nbsp; Life stage: ${stage} &nbsp;·&nbsp; Generated: ${today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
    </div>
    <div class="header-right">
      <div>For healthcare professional use</div>
      <div>Report period: last 7 days</div>
    </div>
  </div>

  <h2>Mood Chart — Past 7 Days</h2>
  <div class="chart-container">${chartBars}</div>
  ${avgScore > 0 ? `<p style="text-align:center; font-size:10px; margin-top:6px; color:#6b7280">7-day average score: <strong style="color:#be185d">${avgScore}/100</strong></p>` : '<p style="text-align:center; font-size:10px; color:#9ca3af">No check-ins recorded this week</p>'}

  <h2>Daily Check-In Log</h2>
  ${recentCheckIns.length > 0 ? `
  <table>
    <thead><tr><th>Date</th><th>Mood</th><th>Score</th><th>Sleep</th><th>Symptoms</th><th>Notes</th></tr></thead>
    <tbody>${checkInRows}</tbody>
  </table>` : '<p style="color:#9ca3af; font-size:10px">No check-ins this week.</p>'}

  ${latestScreen ? `
  <h2>Wellbeing Screening Result (${latestScreen.type === 'EPDS' ? 'EPDS' : 'PHQ-4'})</h2>
  <div class="screening-box">
    <div>
      <span class="screening-score">${latestScreen.score}</span>
      <span style="color:#6b7280; font-size: 11px">/ ${latestScreen.type === 'EPDS' ? '30' : '12'}</span>
      <span class="tag tag-${latestScreen.severity}">${latestScreen.severity.toUpperCase()}</span>
    </div>
    <div style="margin-top:6px; font-size:10px; color:#4b5563">Date taken: ${latestScreen.date} &nbsp;·&nbsp; Type: ${latestScreen.type}</div>
  </div>` : ''}

  ${localUser.culturalContext && Object.keys(localUser.culturalContext).length > 0 ? `
  <h2>Cultural Context Summary</h2>
  <div class="cultural-box">
    ${Object.entries(localUser.culturalContext).map(([k, v]) => `<div><strong>${k}:</strong> ${Array.isArray(v) ? v.join(', ') : v}</div>`).join('')}
  </div>` : ''}

  <div class="disclaimer">
    This report is a digital self-report tool and is not a clinical diagnosis. Scores should be interpreted by a qualified healthcare professional in context.
    MatriAI is not a substitute for professional mental health care.
  </div>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.onload = () => {
        win.focus()
        win.print()
        // After print, the user can save as PDF
      }
    }

    setIsGeneratingPDF(false)
  }, [localUser, profile, weeklyData, stage, avgScore])

  // ─── CHECK-IN MODAL ────────────────────────────────────
  if (showCheckin) {
    return (
      <>
        <main className="px-4 py-8 max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="font-serif text-3xl font-medium">{greeting}, {firstName}</h1>
            <p className="text-muted-foreground mt-1">Your daily check-in is ready</p>
          </div>
        </main>
        <MoodCheckin onComplete={() => {
          setShowCheckin(false)
          setLocalUser(getUser())
        }} />
      </>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      <main className="px-4 py-6 max-w-2xl mx-auto pb-24 space-y-5">

        {/* ═══ HEADER ═══ */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <h1 className="font-serif text-2xl sm:text-3xl font-medium">{greeting}, {firstName}</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadReport}
              disabled={isGeneratingPDF || !hasAnyData}
              className="gap-1.5 text-xs shrink-0"
            >
              <Download className="h-3.5 w-3.5" />
              Share with doctor
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${stageColor.light} ${stageColor.text}`}>
              {stage.charAt(0).toUpperCase() + stage.slice(1)}
            </span>
            {streak >= 2 && (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-pink-500/10 text-pink-600 dark:text-pink-400">
                <Flame className="h-3.5 w-3.5" /> {streak} day streak
              </span>
            )}
          </div>
        </div>

        {/* ═══ EMPTY STATE (no check-ins yet) ═══ */}
        {!hasAnyData && (
          <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-pink-500/5">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Heart className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl mb-2">Welcome, {firstName}</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                Start your first check-in to see your mood chart, streak, and personalised insights here.
              </p>
              <Button onClick={() => setShowCheckin(true)} className="gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Start your first check-in
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ═══ WEEKLY MOOD CHART ═══ */}
        {hasAnyData && (
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="font-serif text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Your week at a glance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1.5 h-36">
                {weeklyData.map((d, i) => {
                  const hasData = d.score >= 0
                  const heightPct = hasData ? (d.score / maxBarScore) * 100 : 0
                  const sev = hasData ? getSeverityClass(d.score) : null
                  const isToday = d.date === today
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      {hasData ? (
                        <div className="w-full relative flex flex-col justify-end h-full">
                          <div
                            className={`w-full rounded-t-md transition-all duration-500 ${sev?.bg} ${isToday ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                            style={{ height: `${Math.max(heightPct, 8)}%` }}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-end">
                          <div className="w-full h-2 rounded-t-md bg-muted/30" />
                        </div>
                      )}
                      <span className={`text-[10px] ${isToday ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>
                        {d.day}
                      </span>
                    </div>
                  )
                })}
              </div>
              {avgScore > 0 && (
                <p className="text-sm text-center mt-3">
                  Average this week: <span className={`font-semibold ${stageColor.text}`}>{avgScore}/100</span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══ STATUS CARD ═══ */}
        {hasAnyData && avgScore > 0 && (
          <Card className={`border-0 shadow-md ${
            avgScore >= 70 ? 'bg-green-500/5' : avgScore >= 40 ? 'bg-amber-500/5' : 'bg-pink-500/5'
          }`}>
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  avgScore >= 70 ? 'bg-green-500/10' : avgScore >= 40 ? 'bg-amber-500/10' : 'bg-pink-500/10'
                }`}>
                  {avgScore >= 70 ? (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 14s1.5-2 4-2 5 4 8 4 4-2 4-2" strokeLinecap="round" /></svg>
                  ) : avgScore >= 40 ? (
                    <svg viewBox="0 0 40 40" className="w-5 h-5 text-amber-500"><circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="14" cy="16" r="2" fill="currentColor" /><circle cx="26" cy="16" r="2" fill="currentColor" /></svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" /></svg>
                  )}
                </div>
                <div>
                  <h3 className="font-serif text-base font-medium">
                    {avgScore >= 70 ? "You're maintaining well" : avgScore >= 40 ? 'Some days are harder than others' : 'It might help to talk to someone'}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {avgScore >= 70 ? 'Your recent check-ins show positive patterns. Keep nurturing yourself.' :
                     avgScore >= 40 ? "Here are techniques that may help with what you're experiencing." :
                     "Your scores suggest you may benefit from professional support. You don't have to navigate this alone."}
                  </p>
                  <Button asChild variant="ghost" size="sm" className="mt-2 gap-1 px-0 hover:bg-transparent">
                    <Link href={avgScore >= 70 ? '#' : avgScore >= 40 ? '/techniques' : '/counselors'}>
                      {avgScore >= 70 ? 'View affirmations' : avgScore >= 40 ? 'See techniques for you' : 'Find a counselor'}
                      <ChevronDown className="h-3 w-3 -rotate-90" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ QUICK STATS ═══ */}
        {hasAnyData && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-[11px] text-muted-foreground mb-1">Latest score</p>
                <p className={`text-xl font-bold ${latestCheckIn ? getSeverityClass(latestCheckIn.computedScore).text : ''}`}>
                  {latestCheckIn ? latestCheckIn.computedScore : '--'}
                  <span className="text-xs font-normal text-muted-foreground">/100</span>
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-[11px] text-muted-foreground mb-1">This week</p>
                <p className="text-xl font-bold">
                  {weekCheckIns}<span className="text-xs font-normal text-muted-foreground">/7</span>
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-[11px] text-muted-foreground mb-1">Wellbeing check</p>
                <p className={`text-xl font-bold ${latestScreening ? getSeverityClass(latestScreening.severity === 'low' ? 70 : latestScreening.severity === 'moderate' ? 50 : 20).text : ''}`}>
                  {latestScreening ? latestScreening.score : '--'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ═══ AI COMPANION CONTEXT ═══ */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-5">
            <h3 className="font-serif text-base font-medium mb-3">Your companion knows:</h3>
            <ul className="space-y-2 mb-4">
              {contextBullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  {b}
                </li>
              ))}
              {contextBullets.length === 0 && (
                <li className="text-sm text-muted-foreground">Complete your first check-in to see personalised insights.</li>
              )}
            </ul>
            <Button asChild className="w-full gap-2">
              <Link href="/chat">
                <MessageCircle className="h-4 w-4" />
                Chat with your companion
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* ═══ SCREENING HISTORY ═══ */}
        {localUser && localUser.screenings.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <Card className="border-0 shadow-sm">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-secondary/50 rounded-t-xl transition-colors py-4">
                  <CardTitle className="font-serif text-sm flex items-center justify-between">
                    Your wellbeing check history
                    <ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-2">
                  {localUser.screenings.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-medium">How you&apos;ve been feeling</p>
                        <p className="text-xs text-muted-foreground">{s.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{s.score}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          s.severity === 'low' ? 'bg-green-500/10 text-green-600' :
                          s.severity === 'moderate' ? 'bg-amber-500/10 text-amber-600' :
                          'bg-pink-500/10 text-pink-600'
                        }`}>{s.severity}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}
      </main>

      {/* ═══ BOTTOM NAVIGATION ═══ */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-around py-2">
          {[
            { href: '/dashboard',  icon: Home,           label: 'Home',       active: true },
            { href: '/dashboard',  icon: ClipboardCheck, label: 'Check-in',   active: false, onClick: () => setShowCheckin(true) },
            { href: '/techniques', icon: Lightbulb,      label: 'Techniques', active: false },
            { href: '/doctors',    icon: Stethoscope,    label: 'Doctors',    active: false },
          ].map(item => (
            item.onClick ? (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                  item.active ? stageColor.text : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className={`h-5 w-5 ${item.active ? 'stroke-[2.5]' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            )
          ))}
        </div>
      </nav>
    </>
  )
}
