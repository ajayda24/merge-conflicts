'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CrisisModal } from '@/components/crisis-modal'
import { Heart, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import {
  LIFE_STAGES, CONDITIONS, STAGE_COLORS,
  EPDS_QUESTIONS, PHQ4_QUESTIONS,
  CULTURAL_QUESTIONS,
} from '@/lib/matriai-data'
import {
  getUser, saveUser, createNewUser,
  saveScreeningToDB,
  type MatriAIUser, type ScreeningEntry,
} from '@/lib/matriai-storage'

// ─── SVG Score Ring ──────────────────────────────────────
function ScoreRing({ score, maxScore, color }: { score: number; maxScore: number; color: string }) {
  const pct = (score / maxScore) * 100
  const stroke = pct * 2.51327 // circumference of r=40 is ~251.327
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" className="stroke-muted/30" />
        <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" stroke={color}
          strokeDasharray={`${stroke} 999`} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{score}</span>
        <span className="text-xs text-muted-foreground">/ {maxScore}</span>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()

  // Main flow: age → lifeStage → screening → screeningResult → culturalIntro → cultural(x5) → done
  const [screen, setScreen] = useState<
    'age' | 'lifeStage' | 'screeningIntro' | 'screening' | 'screeningResult' |
    'culturalIntro' | 'cultural' | 'done'
  >('age')

  // Screen 1 state
  const [age, setAge] = useState('')
  const [conditions, setConditions] = useState<string[]>([])

  // Screen 2 state
  const [lifeStage, setLifeStage] = useState('')

  // Screening state
  const [screeningIdx, setScreeningIdx] = useState(0)
  const [screeningAnswers, setScreeningAnswers] = useState<number[]>([])
  const [showCrisis, setShowCrisis] = useState(false)
  const [screeningResult, setScreeningResult] = useState<{ score: number; severity: string; type: string } | null>(null)

  // Cultural context state
  const [culturalIdx, setCulturalIdx] = useState(0)
  const [culturalAnswers, setCulturalAnswers] = useState<Record<string, string | string[]>>({})

  const [isLoading, setIsLoading] = useState(false)

  const isEPDS = lifeStage === 'pregnancy' || lifeStage === 'postpartum'
  const questions = isEPDS ? EPDS_QUESTIONS : PHQ4_QUESTIONS
  const culturalQs = CULTURAL_QUESTIONS[lifeStage] || []

  const stageColor = STAGE_COLORS[lifeStage]

  // ─── Condition toggle ──────────────────────────────────
  const toggleCondition = (val: string) => {
    if (val === 'none') {
      setConditions(['none'])
      return
    }
    setConditions(prev => {
      const filtered = prev.filter(c => c !== 'none')
      return filtered.includes(val) ? filtered.filter(c => c !== val) : [...filtered, val]
    })
  }

  // ─── Screening answer handler ──────────────────────────
  const handleScreeningAnswer = useCallback((score: number) => {
    const newAnswers = [...screeningAnswers]
    newAnswers[screeningIdx] = score
    setScreeningAnswers(newAnswers)

    // Crisis check for EPDS Q10
    if (isEPDS && screeningIdx === 9 && score > 0) {
      setShowCrisis(true)
      return
    }

    // Advance or finish
    if (screeningIdx < questions.length - 1) {
      setScreeningIdx(screeningIdx + 1)
    } else {
      // Compute results
      const total = newAnswers.reduce((s, v) => s + v, 0)
      let severity: string

      if (isEPDS) {
        const q10NonZero = newAnswers[9] > 0
        if (q10NonZero || total >= 13) severity = 'severe'
        else if (total >= 9) severity = 'moderate'
        else severity = 'low'
      } else {
        if (total >= 6) severity = 'severe'
        else if (total >= 3) severity = 'moderate'
        else severity = 'low'
      }

      setScreeningResult({ score: total, severity, type: isEPDS ? 'EPDS' : 'PHQ4' })
      setScreen('screeningResult')
    }
  }, [screeningAnswers, screeningIdx, isEPDS, questions.length])

  // ─── Cultural answer handler ───────────────────────────
  const handleCulturalAnswer = (value: string) => {
    const cq = culturalQs[culturalIdx]
    if (cq.multiSelect) {
      const current = (culturalAnswers[cq.key] as string[]) || []
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
      setCulturalAnswers({ ...culturalAnswers, [cq.key]: updated })
    } else {
      setCulturalAnswers({ ...culturalAnswers, [cq.key]: value })
    }
  }

  const isCulturalAnswered = () => {
    const cq = culturalQs[culturalIdx]
    if (!cq) return false
    const ans = culturalAnswers[cq.key]
    if (cq.multiSelect) return Array.isArray(ans) && ans.length > 0
    return !!ans
  }

  // ─── Final save ────────────────────────────────────────
  const handleComplete = async () => {
    setIsLoading(true)

    const user: MatriAIUser = getUser() || createNewUser()
    user.age = Number(age)
    user.conditions = conditions
    user.lifeStage = lifeStage
    user.pseudonym = 'there'
    user.culturalContext = culturalAnswers
    user.onboardingComplete = true

    // Save screening
    if (screeningResult) {
      const entry: ScreeningEntry = {
        date: new Date().toISOString().split('T')[0],
        type: screeningResult.type as 'EPDS' | 'PHQ4',
        score: screeningResult.score,
        severity: screeningResult.severity as 'low' | 'moderate' | 'severe',
        answers: screeningAnswers,
      }
      user.screenings.push(entry)
    }

    saveUser(user)

    // Also save to Supabase
    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        // Step 1: always update the critical onboarding flag (columns guaranteed to exist)
        await supabase.from('profiles').update({
          life_stage: lifeStage,
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        }).eq('id', authUser.id)

        // Step 2: try to persist extended fields — safe to fail if columns don't exist yet
        try {
          await supabase.from('profiles').update({
            age: Number(age),
            conditions,
            cultural_context: culturalAnswers,
          }).eq('id', authUser.id)
        } catch {
          // extended columns may not exist — non-fatal
        }
      }
    } catch (e) {
      console.error('Supabase save error:', e)
    }

    // Persist screening to DB
    if (screeningResult) {
      const entry: ScreeningEntry = {
        date: new Date().toISOString().split('T')[0],
        type: screeningResult.type as 'EPDS' | 'PHQ4',
        score: screeningResult.score,
        severity: screeningResult.severity as 'low' | 'moderate' | 'severe',
        answers: screeningAnswers,
      }
      saveScreeningToDB(entry)
    }

    router.push('/dashboard')
  }

  // ─── SEVERITY COLORS ──────────────────────────────────
  const getSeverityColor = (severity: string) => {
    if (severity === 'low') return '#22c55e'
    if (severity === 'moderate') return '#f59e0b'
    return '#ef4444'
  }

  const getSeverityText = (severity: string, type: string) => {
    if (type === 'EPDS') {
      if (severity === 'low') return "Your responses suggest you're managing well. That's wonderful."
      if (severity === 'moderate') return "Your responses suggest you may be experiencing some challenges. We have techniques that can help."
      return "Your responses suggest you might benefit from talking to someone. We can connect you with support."
    }
    if (severity === 'low') return "Your responses suggest you're doing well overall. Keep it up."
    if (severity === 'moderate') return "You may be experiencing some emotional challenges. Simple coping techniques can make a difference."
    return "Your responses suggest you could benefit from professional support. You don't have to navigate this alone."
  }

  // ─── CRISIS MODAL ─────────────────────────────────────
  if (showCrisis) {
    return (
      <CrisisModal
        onContinue={() => {
          setShowCrisis(false)
          const user = getUser() || createNewUser()
          user.crisisAcknowledgements.push(new Date().toISOString())
          saveUser(user)
          // Continue to next question or results
          if (screeningIdx < questions.length - 1) {
            setScreeningIdx(screeningIdx + 1)
          } else {
            const total = screeningAnswers.reduce((s, v) => s + v, 0)
            setScreeningResult({ score: total, severity: 'severe', type: 'EPDS' })
            setScreen('screeningResult')
          }
        }}
      />
    )
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 text-primary mb-6">
          <Heart className="h-7 w-7 fill-current" />
          <span className="font-serif text-xl font-medium">MatriLine</span>
        </div>

        {/* ══════════════ SCREEN 1: AGE & CONDITIONS ══════════════ */}
        {screen === "age" && (
          <Card className="shadow-lg border-0">
            <CardContent className="pt-6 space-y-6">
              <div className="text-center">
                <h2 className="font-serif text-2xl mb-1">
                  Tell us about yourself
                </h2>
                <p className="text-sm text-muted-foreground">
                  This helps us personalise your experience
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">How old are you?</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Enter your age"
                  min={13}
                  max={100}
                  className="w-full h-12 px-4 rounded-xl border border-input bg-background text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Do you have any of these conditions?
                </label>
                <p className="text-xs text-muted-foreground">
                  Select all that apply
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {CONDITIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => toggleCondition(c.value)}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left active:scale-[0.97] ${
                        conditions.includes(c.value)
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setScreen("lifeStage")}
                disabled={!age || conditions.length === 0}
                className="w-full gap-2"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ══════════════ SCREEN 2: LIFE STAGE ══════════════ */}
        {screen === "lifeStage" && (
          <Card className="shadow-lg border-0">
            <CardContent className="pt-6 space-y-6">
              <div className="text-center">
                <h2 className="font-serif text-2xl mb-1">
                  What brings you here today?
                </h2>
                <p className="text-sm text-muted-foreground">
                  You can always change this later
                </p>
              </div>

              <div className="space-y-3">
                {LIFE_STAGES.map((s) => {
                  const selected = lifeStage === s.value;
                  const colors = STAGE_COLORS[s.value];
                  return (
                    <button
                      key={s.value}
                      onClick={() => setLifeStage(s.value)}
                      className={`w-full flex items-stretch rounded-xl border-2 transition-all text-left active:scale-[0.97] overflow-hidden ${
                        selected
                          ? `${colors.border} ${colors.light}`
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      {/* Left accent bar */}
                      <div
                        className={`w-1.5 shrink-0 transition-colors ${selected ? colors.bg : "bg-transparent"}`}
                      />
                      <div className="flex-1 px-4 py-3.5">
                        <p className="font-medium text-[15px]">{s.label}</p>
                        <p className="text-[13px] text-muted-foreground mt-0.5">
                          {s.subtitle}
                        </p>
                      </div>
                      {selected && (
                        <div className="flex items-center pr-4">
                          <Check className={`h-5 w-5 ${colors.text}`} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setScreen("age")}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => {
                    if (!isEPDS && lifeStage) setScreen("screeningIntro");
                    else setScreen("screening");
                  }}
                  className="flex-1 gap-2"
                  disabled={!lifeStage}
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ══════════════ SCREENING INTRO (PHQ-4 only) ══════════════ */}
        {screen === "screeningIntro" && (
          <Card className="shadow-lg border-0">
            <CardContent className="pt-6 space-y-6 text-center">
              <div
                className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: stageColor?.accent + "20" }}
              >
                <Heart
                  className="h-8 w-8"
                  style={{ color: stageColor?.accent }}
                />
              </div>
              <h2 className="font-serif text-2xl">A few quick questions</h2>
              <p className="text-muted-foreground">
                These help us understand how you&apos;ve been feeling.
                <br />
                Takes under 2 minutes.
              </p>
              <Button onClick={() => setScreen("screening")} className="gap-2">
                Begin <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ══════════════ SCREENING QUESTIONS ══════════════ */}
        {screen === "screening" && (
          <Card className="shadow-lg border-0">
            <CardContent className="pt-6 space-y-5">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>How you&apos;ve been feeling</span>
                  <span>
                    {screeningIdx + 1} / {questions.length}
                  </span>
                </div>
                <Progress
                  value={((screeningIdx + 1) / questions.length) * 100}
                  className="h-2"
                />
              </div>

              {/* Question */}
              <h3 className="font-serif text-lg leading-snug">
                {questions[screeningIdx].q}
              </h3>

              {/* EPDS Q10 warning */}
              {isEPDS && screeningIdx === 9 && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  This question is sensitive. Your answer is private and helps
                  us connect you with the right support.
                </p>
              )}

              {/* Options */}
              <div className="space-y-2">
                {questions[screeningIdx].opts.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleScreeningAnswer(opt.score)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 text-sm font-medium transition-all active:scale-[0.97] ${
                      screeningAnswers[screeningIdx] === opt.score
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/30 hover:bg-secondary/50"
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>

              {/* Back button */}
              {screeningIdx > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScreeningIdx(screeningIdx - 1)}
                  className="gap-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Previous
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* ══════════════ SCREENING RESULT ══════════════ */}
        {screen === "screeningResult" && screeningResult && (
          <Card className="shadow-lg border-0">
            <CardContent className="pt-8 pb-8 space-y-6 text-center">
              <ScoreRing
                score={screeningResult.score}
                maxScore={isEPDS ? 30 : 12}
                color={getSeverityColor(screeningResult.severity)}
              />

              <div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                  {getSeverityText(
                    screeningResult.severity,
                    screeningResult.type,
                  )}
                </p>
                <p className="text-xs text-muted-foreground/70 italic">
                  This is not a diagnosis. It helps us support you better.
                </p>
              </div>

              <Button
                onClick={() => setScreen("culturalIntro")}
                className="gap-2"
              >
                Continue to next step <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ══════════════ CULTURAL CONTEXT INTRO ══════════════ */}
        {screen === "culturalIntro" && (
          <Card className="shadow-lg border-0">
            <CardContent className="pt-6 space-y-6 text-center">
              <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-serif text-xl">
                Just 5 more quick questions
              </h2>
              <p className="text-muted-foreground text-sm">
                This helps your companion understand your world, not just your
                symptoms.
              </p>
              <Button onClick={() => setScreen("cultural")} className="gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ══════════════ CULTURAL CONTEXT QUESTIONS ══════════════ */}
        {screen === "cultural" && culturalQs[culturalIdx] && (
          <Card className="shadow-lg border-0">
            <CardContent className="pt-6 space-y-5">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>About you</span>
                  <span>
                    {culturalIdx + 1} / {culturalQs.length}
                  </span>
                </div>
                <Progress
                  value={((culturalIdx + 1) / culturalQs.length) * 100}
                  className="h-2"
                />
              </div>

              {/* Question */}
              <h3 className="font-serif text-lg leading-snug">
                {culturalQs[culturalIdx].question}
              </h3>
              {culturalQs[culturalIdx].multiSelect && (
                <p className="text-xs text-muted-foreground">
                  Select all that apply
                </p>
              )}

              {/* Options */}
              <div
                className={`grid gap-2 ${culturalQs[culturalIdx].cols === 2 ? "grid-cols-2" : "grid-cols-1"}`}
              >
                {culturalQs[culturalIdx].options.map((opt) => {
                  const cq = culturalQs[culturalIdx];
                  let selected = false;
                  if (cq.multiSelect) {
                    selected = (
                      (culturalAnswers[cq.key] as string[]) || []
                    ).includes(opt);
                  } else {
                    selected = culturalAnswers[cq.key] === opt;
                  }

                  return (
                    <button
                      key={opt}
                      onClick={() => handleCulturalAnswer(opt)}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left active:scale-[0.97] ${
                        selected
                          ? `${stageColor?.border || "border-primary"} ${stageColor?.light || "bg-primary/5"}`
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (culturalIdx > 0) setCulturalIdx(culturalIdx - 1);
                    else setScreen("screeningResult");
                  }}
                  className="gap-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                <Button
                  onClick={() => {
                    if (culturalIdx < culturalQs.length - 1) {
                      setCulturalIdx(culturalIdx + 1);
                    } else {
                      handleComplete();
                    }
                  }}
                  disabled={!isCulturalAnswered() || isLoading}
                  className="flex-1 gap-2"
                >
                  {isLoading
                    ? "Setting up..."
                    : culturalIdx < culturalQs.length - 1
                      ? "Next"
                      : "Finish"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {["age", "lifeStage", "screening", "cultural"].map((s, i) => {
            const stages = ["age", "lifeStage", "screening", "cultural"];
            const currentIdx = stages.indexOf(
              screen === "screeningIntro" || screen === "screening"
                ? "screening"
                : screen === "screeningResult" || screen === "culturalIntro"
                  ? "cultural"
                  : screen === "cultural"
                    ? "cultural"
                    : (screen as string),
            );
            return (
              <div
                key={s}
                className={`h-2 w-10 rounded-full transition-colors ${
                  i <= currentIdx ? "bg-primary" : "bg-border"
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
