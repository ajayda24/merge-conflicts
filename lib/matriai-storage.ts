import { MOOD_TILES, SLEEP_MODIFIERS, APPETITE_MODIFIERS, STAGE_SPECIFIC_MODIFIERS, AFFIRMATIONS } from './matriai-data'
import { createClient } from './supabase/client'

// ─── TYPES ───────────────────────────────────────────────
export interface CheckInData {
  date: string
  mood: string
  factors: string[]
  sleep: string
  appetite: string
  symptoms: string[]
  stageAnswer: string
  notes: string
  computedScore: number
  severity: 'low' | 'moderate' | 'severe'
  bodyPain?: string[]
  mentalHealthNotes?: string
}

export interface ScreeningEntry {
  date: string
  type: 'EPDS' | 'PHQ4'
  score: number
  severity: 'low' | 'moderate' | 'severe'
  answers: number[]
}

export interface MatriAIUser {
  age: number
  conditions: string[]
  lifeStage: string
  pseudonym: string
  culturalContext: Record<string, string | string[]>
  screenings: ScreeningEntry[]
  checkIns: CheckInData[]
  analytics: {
    lastCheckIn: string | null
    streak: number
  }
  crisisAcknowledgements: string[]
  onboardingComplete: boolean
}

// ─── STORAGE HELPERS ─────────────────────────────────────
const STORAGE_KEY = 'matriAI_user'

export function getUser(): MatriAIUser | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as MatriAIUser
  } catch {
    return null
  }
}

export function saveUser(user: MatriAIUser): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

export function createNewUser(): MatriAIUser {
  return {
    age: 0,
    conditions: [],
    lifeStage: '',
    pseudonym: 'there',
    culturalContext: {},
    screenings: [],
    checkIns: [],
    analytics: { lastCheckIn: null, streak: 0 },
    crisisAcknowledgements: [],
    onboardingComplete: false,
  }
}

// ─── DB SYNC ──────────────────────────────────────────────
/** Hydrate localStorage from Supabase on login. Call after confirming auth. */
export async function syncUserFromDB(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    // Fetch check-ins (last 90 days)
    const since = new Date()
    since.setDate(since.getDate() - 90)
    const { data: dbCheckins } = await supabase
      .from('user_checkins')
      .select('*')
      .eq('user_id', authUser.id)
      .gte('date', since.toISOString().split('T')[0])
      .order('date', { ascending: true })

    // Fetch screenings
    const { data: dbScreenings } = await supabase
      .from('user_screenings')
      .select('*')
      .eq('user_id', authUser.id)
      .order('date', { ascending: true })

    // Build local user from DB data
    let local = getUser() || createNewUser()
    if (profile) {
      local.lifeStage = profile.life_stage || local.lifeStage
      local.pseudonym = profile.full_name?.split(' ')[0] || local.pseudonym
      local.onboardingComplete = profile.onboarding_complete || local.onboardingComplete
      if (profile.cultural_context) local.culturalContext = profile.cultural_context
      if (profile.conditions) local.conditions = profile.conditions
      if (profile.age) local.age = profile.age
    }
    if (dbCheckins && dbCheckins.length > 0) {
      local.checkIns = dbCheckins.map((c: Record<string, unknown>) => ({
        date: c.date as string,
        mood: c.mood as string,
        factors: (c.factors as string[]) || [],
        sleep: c.sleep as string,
        appetite: c.appetite as string,
        symptoms: (c.symptoms as string[]) || [],
        stageAnswer: (c.stage_answer as string) || '',
        notes: (c.notes as string) || '',
        computedScore: c.computed_score as number,
        severity: c.severity as 'low' | 'moderate' | 'severe',
      }))
    }
    if (dbScreenings && dbScreenings.length > 0) {
      local.screenings = dbScreenings.map((s: Record<string, unknown>) => ({
        date: s.date as string,
        type: s.type as 'EPDS' | 'PHQ4',
        score: s.score as number,
        severity: s.severity as 'low' | 'moderate' | 'severe',
        answers: (s.answers as number[]) || [],
      }))
    }
    saveUser(local)
  } catch (e) {
    console.error('syncUserFromDB error:', e)
  }
}

/** Persist a check-in to Supabase (full data). */
export async function saveCheckInToDB(checkIn: CheckInData): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    await supabase.from('user_checkins').upsert({
      user_id: authUser.id,
      date: checkIn.date,
      mood: checkIn.mood,
      factors: checkIn.factors,
      sleep: checkIn.sleep,
      appetite: checkIn.appetite,
      symptoms: checkIn.symptoms,
      stage_answer: checkIn.stageAnswer,
      notes: checkIn.notes,
      computed_score: checkIn.computedScore,
      severity: checkIn.severity,
    }, { onConflict: 'user_id,date' })
  } catch (e) {
    console.error('saveCheckInToDB error:', e)
  }
}

/** Persist a screening result to Supabase. */
export async function saveScreeningToDB(entry: ScreeningEntry): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    await supabase.from('user_screenings').insert({
      user_id: authUser.id,
      date: entry.date,
      type: entry.type,
      score: entry.score,
      severity: entry.severity,
      answers: entry.answers,
    })
  } catch (e) {
    console.error('saveScreeningToDB error:', e)
  }
}

// ─── SCORING ─────────────────────────────────────────────
export function computeCheckInScore(
  data: {
    mood: string
    sleep: string
    appetite: string
    symptoms: string[]
    stageAnswer: string
  },
  stage: string,
  screenings: ScreeningEntry[]
): { score: number; severity: 'low' | 'moderate' | 'severe' } {
  let score = 70

  // Mood modifier
  const moodTile = MOOD_TILES.find(m => m.label === data.mood)
  if (moodTile) score += moodTile.modifier

  // Sleep modifier
  score += SLEEP_MODIFIERS[data.sleep] ?? 0

  // Appetite modifier
  score += APPETITE_MODIFIERS[data.appetite] ?? 0

  // Symptom modifier
  const symCount = data.symptoms.length
  if (symCount === 0) score += 5
  else if (symCount <= 2) score += 0
  else if (symCount <= 4) score -= 8
  else score -= 15

  // Stage-specific modifier
  const stageModifiers = STAGE_SPECIFIC_MODIFIERS[stage]
  if (stageModifiers && data.stageAnswer) {
    score += stageModifiers[data.stageAnswer] ?? 0
  }

  // Screening baseline cap
  const latestScreening = screenings[screenings.length - 1]
  if (latestScreening) {
    if (
      (latestScreening.type === 'EPDS' && latestScreening.score >= 13) ||
      (latestScreening.type === 'PHQ4' && latestScreening.score >= 6)
    ) {
      score = Math.min(score, 60)
    } else if (
      (latestScreening.type === 'EPDS' && latestScreening.score >= 9) ||
      (latestScreening.type === 'PHQ4' && latestScreening.score >= 3)
    ) {
      score = Math.min(score, 78)
    }
  }

  // Clamp
  score = Math.max(0, Math.min(100, score))

  // Severity
  let severity: 'low' | 'moderate' | 'severe'
  if (score >= 70) severity = 'low'
  else if (score >= 40) severity = 'moderate'
  else severity = 'severe'

  return { score, severity }
}

// ─── ANALYTICS ───────────────────────────────────────────
export function getWeeklyData(checkIns: CheckInData[]): { day: string; score: number; date: string }[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const result: { day: string; score: number; date: string }[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const dayName = days[d.getDay()]
    const checkIn = checkIns.find(c => c.date === dateStr)
    result.push({ day: dayName, score: checkIn?.computedScore ?? -1, date: dateStr })
  }
  return result
}

export function getAvgScore7d(checkIns: CheckInData[]): number {
  const recent = checkIns.filter(c => {
    const diff = Date.now() - new Date(c.date).getTime()
    return diff <= 7 * 24 * 60 * 60 * 1000
  })
  if (recent.length === 0) return -1
  return Math.round(recent.reduce((s, c) => s + c.computedScore, 0) / recent.length)
}

export function getStreak(checkIns: CheckInData[]): number {
  if (checkIns.length === 0) return 0
  const sorted = [...checkIns].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const dateStr = checkDate.toISOString().split('T')[0]
    if (sorted.some(c => c.date === dateStr)) {
      streak++
    } else {
      if (i === 0) continue // today hasn't checked in yet — don't break streak
      break
    }
  }
  return streak
}

export function todayCheckedIn(checkIns: CheckInData[]): boolean {
  const today = new Date().toISOString().split('T')[0]
  return checkIns.some(c => c.date === today)
}

// ─── DYNAMIC CONTEXT BULLETS ─────────────────────────────
export function generateContextBullets(user: MatriAIUser): string[] {
  const bullets: string[] = []
  const stage = user.lifeStage
  const cc = user.culturalContext
  const recentCheckIns = user.checkIns.slice(-7)

  // Stage-based
  const stageLabels: Record<string, string> = {
    pregnancy: "You're on your pregnancy journey",
    postpartum: "You're in your postpartum period",
    loss: "You're processing a loss",
    menopause: "You're navigating menopause",
    unsure: "You're exploring and finding your way",
  }
  if (stageLabels[stage]) bullets.push(stageLabels[stage])

  // Cultural context based
  if (cc.cq1) {
    if (typeof cc.cq1 === 'string') {
      if (cc.cq1.includes('in-laws')) bullets.push("You're navigating joint family dynamics")
      else if (cc.cq1.includes('On my own')) bullets.push("You're managing independently")
    }
  }

  // Sleep data
  const sleepData = recentCheckIns.map(c => c.sleep)
  const poorSleep = sleepData.filter(s => s === 'Very poorly' || s === 'Poorly').length
  if (poorSleep >= 3) bullets.push('Sleep has been a challenge this week')

  // Mood trend
  if (recentCheckIns.length >= 3) {
    const earlyAvg = recentCheckIns.slice(0, Math.floor(recentCheckIns.length / 2)).reduce((s, c) => s + c.computedScore, 0) / Math.floor(recentCheckIns.length / 2)
    const lateAvg = recentCheckIns.slice(Math.floor(recentCheckIns.length / 2)).reduce((s, c) => s + c.computedScore, 0) / (recentCheckIns.length - Math.floor(recentCheckIns.length / 2))
    if (lateAvg > earlyAvg + 5) bullets.push('Your mood has been improving recently')
    else if (lateAvg < earlyAvg - 5) bullets.push("Things have been tougher lately — that's okay")
  }

  // Conditions
  if (user.conditions.length > 0 && !user.conditions.includes('none')) {
    bullets.push(`You've shared that you have ${user.conditions.join(', ')}`)
  }

  return bullets.slice(0, 4)
}

// ─── SEED DATA ───────────────────────────────────────────
export function generateSeedData(stage: string): { checkIns: CheckInData[]; screening: ScreeningEntry } {
  const moods = ['Content', 'Calm', 'Anxious', 'Sad', 'Radiant']
  const sleeps = ['Well', 'Okay', 'Poorly', 'Very poorly', 'Very well']
  const scores = [78, 65, 45, 32, 82]
  const severities: ('low' | 'moderate' | 'severe')[] = ['low', 'moderate', 'moderate', 'severe', 'low']

  const checkIns: CheckInData[] = []
  for (let i = 5; i >= 1; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    checkIns.push({
      date: d.toISOString().split('T')[0],
      mood: moods[5 - i],
      factors: ['Sleep', 'Physical health'],
      sleep: sleeps[5 - i],
      appetite: 'Normal',
      symptoms: i === 4 ? ['Fatigue', 'Headache', 'Back pain', 'Insomnia', 'Nausea'] : ['Fatigue'],
      stageAnswer: '',
      notes: '',
      computedScore: scores[5 - i],
      severity: severities[5 - i],
    })
  }

  const isEPDS = stage === 'pregnancy' || stage === 'postpartum'
  const screening: ScreeningEntry = {
    date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    type: isEPDS ? 'EPDS' : 'PHQ4',
    score: isEPDS ? 10 : 4,
    severity: 'moderate',
    answers: isEPDS ? [0, 1, 2, 1, 1, 2, 1, 1, 1, 0] : [1, 1, 1, 1],
  }

  return { checkIns, screening }
}

export function getRandomAffirmation(stage: string): string {
  const list = AFFIRMATIONS[stage] || AFFIRMATIONS.unsure
  return list[Math.floor(Math.random() * list.length)]
}
