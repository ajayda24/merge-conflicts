'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Home, ClipboardCheck, Lightbulb, Stethoscope, Clock, ChevronDown } from 'lucide-react'
import { STAGE_COLORS, TECHNIQUES, getSymptomFlag } from '@/lib/matriai-data'
import { getUser } from '@/lib/matriai-storage'

// ─── BOX BREATHING ANIMATION ─────────────────────────────
function BoxBreathingAnimation() {
  const [phase, setPhase] = useState(0) // 0=inhale, 1=hold, 2=exhale, 3=hold
  const [count, setCount] = useState(4)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          setPhase(p => (p + 1) % 4)
          return 4
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [running])

  const labels = ['Breathe in', 'Hold', 'Breathe out', 'Hold']
  const positions = [
    { x: 10, y: 10 },  // top-left (inhale: go right)
    { x: 90, y: 10 },  // top-right (hold: go down)
    { x: 90, y: 90 },  // bottom-right (exhale: go left)
    { x: 10, y: 90 },  // bottom-left (hold: go up)
  ]
  const pos = positions[phase]

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 100 100" className="w-32 h-32">
        <rect x="10" y="10" width="80" height="80" rx="4" fill="none" strokeWidth="2" className="stroke-primary/30" />
        {running && (
          <circle cx={pos.x} cy={pos.y} r="5" className="fill-primary transition-all duration-1000" />
        )}
      </svg>
      <p className="text-sm font-medium">{running ? `${labels[phase]} · ${count}` : 'Tap Start to begin'}</p>
      <Button size="sm" onClick={() => { setRunning(!running); setPhase(0); setCount(4) }}>
        {running ? 'Stop' : 'Start'}
      </Button>
    </div>
  )
}

export default function TechniquesPage() {
  const [user, setUser] = useState(getUser())
  const [expanded, setExpanded] = useState<string | null>(null)
  const stage = user?.lifeStage || 'unsure'
  const stageColor = STAGE_COLORS[stage] || STAGE_COLORS.unsure

  useEffect(() => { setUser(getUser()) }, [])

  // Get recent symptoms and mood
  const recentCheckIn = user?.checkIns[user.checkIns.length - 1]

  // Filter and sort techniques by relevance
  const relevantTechniques = useMemo(() => {
    const allSymptoms = recentCheckIn?.symptoms || []
    const allTriggers = [...allSymptoms, recentCheckIn?.mood || '']

    return TECHNIQUES
      .filter(t => t.stages.includes(stage))
      .sort((a, b) => {
        const aMatch = a.triggers.filter(tr => allTriggers.some(at => at.toLowerCase().includes(tr.toLowerCase()))).length
        const bMatch = b.triggers.filter(tr => allTriggers.some(at => at.toLowerCase().includes(tr.toLowerCase()))).length
        return bMatch - aMatch
      })
      .slice(0, 6)
  }, [stage, recentCheckIn])

  // Symptom → specialist flag
  const specialistFlag = useMemo(() => {
    const symptoms = recentCheckIn?.symptoms || []
    return getSymptomFlag(symptoms)
  }, [recentCheckIn])

  const SPECIALIST_LABELS: Record<string, { label: string; desc: string }> = {
    gynaecologist: { label: 'Gynaecologist', desc: 'Based on your recent symptoms, a gynaecologist may be the right person to speak to.' },
    general_physician: { label: 'General Physician', desc: 'Based on your recent symptoms, a general physician could help assess your physical health.' },
    psychiatrist: { label: 'Psychiatrist or Psychologist', desc: 'Based on how you\'ve been feeling, speaking with a mental health professional may help.' },
  }

  // Check for joint family
  const hasJointFamily = user?.culturalContext?.cq1 === 'With in-laws'

  const displayTechniques = useMemo(() => {
    const list = [...relevantTechniques]
    if (hasJointFamily && !list.find(t => t.id === 'social-scripts')) {
      const ss = TECHNIQUES.find(t => t.id === 'social-scripts')
      if (ss) list.push(ss)
    }
    return list.slice(0, 6)
  }, [relevantTechniques, hasJointFamily])

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-8 pb-4 max-w-2xl mx-auto">
        <h1 className="font-serif text-2xl font-medium">Techniques for you</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Based on {stage} · Tailored to your check-in
        </p>
      </div>

      {/* Specialist recommendation (from symptom flags) */}
      {specialistFlag && SPECIALIST_LABELS[specialistFlag] && (
        <div className="px-4 max-w-2xl mx-auto mb-2">
          <div className="rounded-xl bg-primary/8 border border-primary/20 p-4">
            <p className="text-xs font-semibold text-primary mb-1 uppercase tracking-wide">Recommended for you</p>
            <p className="text-sm font-medium">{SPECIALIST_LABELS[specialistFlag].label}</p>
            <p className="text-xs text-muted-foreground mt-1">{SPECIALIST_LABELS[specialistFlag].desc}</p>
            <Link href="/doctors" className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-2 hover:underline">
              Find a specialist <Stethoscope className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
      <div className="px-4 max-w-2xl mx-auto space-y-3">
        {displayTechniques.map(tech => (
          <Card key={tech.id} className="border-0 shadow-sm overflow-hidden">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-bold">{tech.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${stageColor.light} ${stageColor.text}`}>
                      <Clock className="h-3 w-3" /> {tech.duration}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{tech.description}</p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(expanded === tech.id ? null : tech.id)}
                className="mt-3 gap-1 text-xs px-0 hover:bg-transparent"
              >
                {expanded === tech.id ? 'Close' : 'Try it'}
                <ChevronDown className={`h-3 w-3 transition-transform ${expanded === tech.id ? 'rotate-180' : ''}`} />
              </Button>

              {/* Expanded content */}
              {expanded === tech.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-3">
                  {tech.id === 'box-breathing' ? (
                    <BoxBreathingAnimation />
                  ) : (
                    <ol className="space-y-2">
                      {tech.steps.map((s, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${stageColor.light}`}>
                            <span className={`text-xs font-bold ${stageColor.text}`}>{i + 1}</span>
                          </div>
                          <p className="text-sm text-muted-foreground pt-0.5">{s}</p>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-around py-2">
          {[
            { href: '/dashboard',  icon: Home,           label: 'Home' },
            { href: '/dashboard',  icon: ClipboardCheck, label: 'Check-in' },
            { href: '/techniques', icon: Lightbulb,      label: 'Techniques', active: true },
            { href: '/counselors', icon: Stethoscope,    label: 'Counselors' },
          ].map(item => (
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
          ))}
        </div>
      </nav>
    </div>
  )
}
