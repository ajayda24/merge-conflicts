'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { X, ArrowRight, ChevronRight, Phone } from 'lucide-react'
import {
  STAGE_COLORS, MOOD_TILES,
  ALL_MOOD_FACTORS, MOOD_FACTOR_EXCLUDES,
  SLEEP_OPTIONS, APPETITE_OPTIONS,
  BASE_SYMPTOMS, STAGE_SYMPTOMS,
  STAGE_CHECKIN_QUESTIONS,
  CRISIS_RESOURCES, AFFIRMATIONS, TECHNIQUES
} from '@/lib/matriai-data'
import {
  getUser, saveUser,
  computeCheckInScore,
  getRandomAffirmation,
  saveCheckInToDB,
  type CheckInData,
} from '@/lib/matriai-storage'

// ─── SVG MOOD FACES ──────────────────────────────────────
function MoodFace({ type, size = 40 }: { type: string; size?: number }) {
  const s = size
  const hs = s / 2
  return (
    <svg viewBox={`0 0 ${s} ${s}`} width={s} height={s} className="mx-auto">
      <circle cx={hs} cy={hs} r={hs - 2} fill="none" strokeWidth="2" className="stroke-current opacity-30" />
      {/* Eyes */}
      {type === 'numb' ? (
        <>
          <line x1={hs - 8} y1={hs - 4} x2={hs - 4} y2={hs - 4} strokeWidth="2" className="stroke-current" />
          <line x1={hs + 4} y1={hs - 4} x2={hs + 8} y2={hs - 4} strokeWidth="2" className="stroke-current" />
        </>
      ) : (
        <>
          <circle cx={hs - 6} cy={hs - 4} r="2" className="fill-current" />
          <circle cx={hs + 6} cy={hs - 4} r="2" className="fill-current" />
        </>
      )}
      {/* Mouth based on type */}
      {(type === 'radiant' || type === 'content') && (
        <path d={`M${hs - 7} ${hs + 5} Q${hs} ${hs + 12} ${hs + 7} ${hs + 5}`} fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-current" />
      )}
      {type === 'calm' && (
        <path d={`M${hs - 6} ${hs + 6} Q${hs} ${hs + 10} ${hs + 6} ${hs + 6}`} fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-current" />
      )}
      {(type === 'sad' || type === 'exhausted') && (
        <path d={`M${hs - 6} ${hs + 8} Q${hs} ${hs + 3} ${hs + 6} ${hs + 8}`} fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-current" />
      )}
      {(type === 'anxious' || type === 'overwhelmed') && (
        <path d={`M${hs - 5} ${hs + 7} Q${hs} ${hs + 4} ${hs + 5} ${hs + 7}`} fill="none" strokeWidth="2" strokeLinecap="round" className="stroke-current" />
      )}
      {type === 'irritable' && (
        <line x1={hs - 5} y1={hs + 6} x2={hs + 5} y2={hs + 6} strokeWidth="2" strokeLinecap="round" className="stroke-current" />
      )}
      {type === 'numb' && (
        <line x1={hs - 5} y1={hs + 6} x2={hs + 5} y2={hs + 6} strokeWidth="2" strokeLinecap="round" className="stroke-current" />
      )}
    </svg>
  )
}

interface MoodCheckinProps {
  onComplete?: () => void
}

export function MoodCheckin({ onComplete }: MoodCheckinProps) {
  const router = useRouter()
  const user = getUser()
  const stage = user?.lifeStage || 'unsure'
  const stageColor = STAGE_COLORS[stage] || STAGE_COLORS.unsure

  const [step, setStep] = useState(0) // 0-5 = steps, 6 = result
  const [mood, setMood] = useState('')
  const [factors, setFactors] = useState<string[]>([])
  const [sleep, setSleep] = useState('')
  const [appetite, setAppetite] = useState('')
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [stageAnswer, setStageAnswer] = useState('')
  const [notes, setNotes] = useState('')
  const [result, setResult] = useState<{ score: number; severity: 'low' | 'moderate' | 'severe' } | null>(null)
  const [dismissed, setDismissed] = useState(false)

  // Stage-filtered mood factors
  const moodFactors = useMemo(() => {
    const excludes = MOOD_FACTOR_EXCLUDES[stage] || []
    return ALL_MOOD_FACTORS.filter(f => !excludes.includes(f))
  }, [stage])

  // Stage symptoms
  const allSymptoms = useMemo(() => {
    return [...BASE_SYMPTOMS, ...(STAGE_SYMPTOMS[stage] || [])]
  }, [stage])

  const stageQ = STAGE_CHECKIN_QUESTIONS[stage] || STAGE_CHECKIN_QUESTIONS.unsure

  const toggleFactor = (f: string) => setFactors(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  const toggleSymptom = (s: string) => setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  // ─── SAVE ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return

    const { score, severity } = computeCheckInScore(
      {mood, sleep, appetite, symptoms, stageAnswer},
      stage,
      user.screenings
    )

    const checkIn: CheckInData = {
      date: new Date().toISOString().split('T')[0],
      mood, factors, sleep, appetite, symptoms, stageAnswer, notes,
      computedScore: score, severity,
    }

    user.checkIns.push(checkIn)
    user.analytics.lastCheckIn = checkIn.date

    // Update streak
    const dates = user.checkIns.map(c => c.date)
    let streak = 1
    for (let i = 1; i < 365; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      if (dates.includes(d.toISOString().split('T')[0])) streak++
      else break
    }
    user.analytics.streak = streak

    saveUser(user)
    setResult({ score, severity })
    setStep(6)

    // Persist to Supabase (full data — DB is source of truth)
    saveCheckInToDB(checkIn)

    // Also save simplified record to legacy 'checkins' table
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        await supabase.from('checkins').insert({
          user_id: authUser.id,
          mood: MOOD_TILES.findIndex(m => m.label === mood) + 1,
          energy: sleep === 'Very well' || sleep === 'Well' ? 4 : sleep === 'Okay' ? 3 : 2,
          sleep_quality: SLEEP_OPTIONS.indexOf(sleep) + 1,
          notes: notes || null,
        })
      }
    } catch (e) {
      console.error('Supabase checkin error:', e)
    }
  }

  if (dismissed) return null

  // ─── STEP DOTS ─────────────────────────────────────────
  const totalSteps = 6
  const ProgressDots = () => (
    <div className="flex justify-center gap-1.5 mb-4">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all ${
          i < step ? 'w-4 bg-primary' :
          i === step ? `w-4 ${stageColor.bg}` :
          'w-1.5 bg-border'
        }`} />
      ))}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
        style={{ borderTop: `3px solid ${stageColor.accent}` }}>

        {/* Handle bar */}
        <div className="flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-muted" />
        </div>

        {/* Skip */}
        <button
          onClick={() => { setDismissed(true); onComplete?.() }}
          className="absolute top-4 right-4 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <X className="h-4 w-4" /> Skip for now
        </button>

        <div className="px-6 pb-6 pt-4">
          {/* Header */}
          {step < 6 && (
            <div className="text-center mb-4">
              <h2 className="font-serif text-xl">How are you doing today?</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Takes about 2 minutes · {stage} check-in
              </p>
            </div>
          )}

          {step < 6 && <ProgressDots />}

          {/* ═══ STEP 0: MOOD GRID ═══ */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-center">How are you feeling overall today?</p>
              <div className="grid grid-cols-3 gap-3">
                {MOOD_TILES.map(m => (
                  <button
                    key={m.label}
                    onClick={() => setMood(m.label)}
                    className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all active:scale-[0.97] ${
                      mood === m.label
                        ? `${stageColor.border} ${stageColor.light}`
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    <MoodFace type={m.svg} />
                    <span className="text-xs mt-1.5 font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
              <Button onClick={() => setStep(1)} disabled={!mood} className="w-full gap-1">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ═══ STEP 1: MOOD FACTORS ═══ */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">What&apos;s been on your mind today?</p>
                <p className="text-xs text-muted-foreground">Select everything that applies</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {moodFactors.map(f => (
                  <button
                    key={f}
                    onClick={() => toggleFactor(f)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-[0.97] ${
                      factors.includes(f)
                        ? `${stageColor.border} ${stageColor.light}`
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button onClick={() => setStep(2)} className="flex-1 gap-1">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 2: SLEEP & APPETITE ═══ */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-sm font-medium">How did you sleep last night?</p>
                <div className="flex gap-1.5">
                  {SLEEP_OPTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => setSleep(s)}
                      className={`flex-1 py-2 px-1 rounded-lg text-[10px] sm:text-xs font-medium border-2 transition-all active:scale-[0.97] ${
                        sleep === s
                          ? `${stageColor.border} ${stageColor.light}`
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">How has your appetite been today?</p>
                <div className="flex gap-1.5 flex-wrap">
                  {APPETITE_OPTIONS.map(a => (
                    <button
                      key={a}
                      onClick={() => setAppetite(a)}
                      className={`py-2 px-3 rounded-lg text-[10px] sm:text-xs font-medium border-2 transition-all active:scale-[0.97] ${
                        appetite === a
                          ? `${stageColor.border} ${stageColor.light}`
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} disabled={!sleep || !appetite} className="flex-1 gap-1">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 3: PHYSICAL SYMPTOMS ═══ */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Any physical symptoms today?</p>
                <p className="text-xs text-muted-foreground">Tap all that apply</p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto">
                {allSymptoms.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSymptom(s)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium border-2 transition-all text-left active:scale-[0.97] ${
                      symptoms.includes(s)
                        ? `${stageColor.border} ${stageColor.light}`
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={() => setStep(4)} className="flex-1 gap-1">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 4: STAGE-SPECIFIC QUESTION ═══ */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm font-medium">{stageQ.question}</p>
              <div className="space-y-2">
                {stageQ.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setStageAnswer(opt)}
                    className={`w-full px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all text-left active:scale-[0.97] ${
                      stageAnswer === opt
                        ? `${stageColor.border} ${stageColor.light}`
                        : 'border-border hover:border-primary/30'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => setStep(3)}>Back</Button>
                <Button onClick={() => setStep(5)} disabled={!stageAnswer} className="flex-1 gap-1">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 5: OPEN REFLECTION ═══ */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm font-medium">Anything else you want to note? (optional)</p>
              <div className="relative">
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value.slice(0, 300))}
                  maxLength={300}
                  rows={4}
                  placeholder="You can write anything here — or skip it."
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
                  {notes.length}/300
                </span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={() => setStep(4)}>Back</Button>
                <Button onClick={handleSave} className="flex-1 gap-1">
                  Save check-in
                </Button>
              </div>
            </div>
          )}

          {/* ═══ STEP 6: RESULT CARD ═══ */}
          {step === 6 && result && (
            <div className="space-y-5 py-2">
              {result.severity === 'low' && (
                <div className="text-center space-y-3">
                  <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="font-serif text-xl text-green-600">You&apos;re doing well today</h3>
                  <p className="text-sm text-muted-foreground italic leading-relaxed">
                    &quot;{getRandomAffirmation(stage)}&quot;
                  </p>
                  <Button onClick={() => { setDismissed(true); onComplete?.() }} className="w-full">
                    View your dashboard
                  </Button>
                </div>
              )}

              {result.severity === 'moderate' && (
                <div className="text-center space-y-3">
                  <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <svg viewBox="0 0 40 40" className="w-7 h-7 text-amber-500"><circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="14" cy="16" r="2" fill="currentColor" /><circle cx="26" cy="16" r="2" fill="currentColor" /><line x1="14" y1="26" x2="26" y2="26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </div>
                  <h3 className="font-serif text-xl text-amber-600">A gentle check-in with yourself</h3>
                  <p className="text-sm text-muted-foreground">
                    Here&apos;s something you can try today:
                  </p>
                  {/* Show a relevant technique */}
                  {(() => {
                    const t = TECHNIQUES.find(t => symptoms.some(s => t.triggers.includes(s)) && t.stages.includes(stage)) || TECHNIQUES[0]
                    return (
                      <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 text-left">
                        <p className="text-sm font-medium">{t.title} · {t.duration}</p>
                        <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                      </div>
                    )
                  })()}
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push('/techniques')} className="flex-1 gap-1 text-xs">
                      See more techniques <ChevronRight className="h-3 w-3" />
                    </Button>
                    <Button onClick={() => { setDismissed(true); onComplete?.() }} className="flex-1 text-xs">
                      View dashboard
                    </Button>
                  </div>
                </div>
              )}

              {result.severity === 'severe' && (
                <div className="text-center space-y-3">
                  <div className="mx-auto w-14 h-14 rounded-full bg-pink-500/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-7 h-7 text-pink-500" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" /></svg>
                  </div>
                  <h3 className="font-serif text-xl text-pink-600 dark:text-pink-400">You don&apos;t have to carry this alone</h3>
                  <p className="text-sm text-muted-foreground">
                    Based on how you&apos;re feeling, talking to someone could really help right now.
                  </p>
                  <div className="space-y-2">
                    {CRISIS_RESOURCES.map(r => (
                      <a key={r.number} href={`tel:${r.number.replace(/-/g, '')}`}
                        className="flex items-center justify-between p-3 rounded-xl bg-pink-50 dark:bg-pink-500/10 hover:bg-pink-100 dark:hover:bg-pink-500/20 transition-colors">
                        <div className="text-left">
                          <p className="text-xs font-medium">{r.name}</p>
                          <p className="text-sm font-mono">{r.number}</p>
                        </div>
                        <Phone className="h-4 w-4 text-pink-500" />
                      </a>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push('/counselors')} className="flex-1 gap-1 text-xs">
                      Talk to a counselor <ChevronRight className="h-3 w-3" />
                    </Button>
                    <Button onClick={() => { setDismissed(true); onComplete?.() }} className="flex-1 text-xs">
                      View dashboard
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
