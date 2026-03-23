// ─── STAGE DEFINITIONS ───────────────────────────────────
export const STAGE_COLORS: Record<string, { bg: string; text: string; border: string; light: string; accent: string }> = {
  pregnancy:  { bg: 'bg-teal-500',    text: 'text-teal-600',    border: 'border-teal-500',    light: 'bg-teal-500/10',    accent: '#14b8a6' },
  postpartum: { bg: 'bg-purple-500',  text: 'text-purple-600',  border: 'border-purple-500',  light: 'bg-purple-500/10',  accent: '#a855f7' },
  loss:       { bg: 'bg-rose-500',    text: 'text-rose-600',    border: 'border-rose-500',    light: 'bg-rose-500/10',    accent: '#f43f5e' },
  menopause:  { bg: 'bg-amber-500',   text: 'text-amber-600',   border: 'border-amber-500',   light: 'bg-amber-500/10',   accent: '#f59e0b' },
  unsure:     { bg: 'bg-slate-500',   text: 'text-slate-600',   border: 'border-slate-500',   light: 'bg-slate-500/10',   accent: '#64748b' },
}

export const LIFE_STAGES = [
  { value: 'pregnancy',  label: "I'm pregnant",                     subtitle: 'Track your journey through pregnancy',       color: 'teal' },
  { value: 'postpartum', label: 'I recently had a baby',            subtitle: 'Support for your postpartum experience',     color: 'purple' },
  { value: 'loss',       label: "I've experienced a loss",          subtitle: 'A safe space for healing and grief',         color: 'rose' },
  { value: 'menopause',  label: "I'm going through menopause",     subtitle: 'Navigate this transition with support',      color: 'amber' },
  { value: 'unsure',     label: "I'm not sure — just exploring",   subtitle: 'No pressure, just a starting point',         color: 'slate' },
]

export const CONDITIONS = [
  { value: 'pmdd',       label: 'PMDD' },
  { value: 'pcod',       label: 'PCOD / PCOS' },
  { value: 'anxiety',    label: 'Anxiety' },
  { value: 'depression', label: 'Depression' },
  { value: 'none',       label: 'None of these' },
]

// ─── EPDS ────────────────────────────────────────────────
export const EPDS_QUESTIONS = [
  {
    q: 'In the past 7 days, have you been able to laugh and see the funny side of things?',
    opts: [
      { text: 'As much as I always could',     score: 0 },
      { text: 'Not quite so much now',          score: 1 },
      { text: 'Definitely not so much now',     score: 2 },
      { text: 'Not at all',                     score: 3 },
    ],
  },
  {
    q: 'Have you looked forward to things with enjoyment?',
    opts: [
      { text: 'As much as I ever did',          score: 0 },
      { text: 'Rather less than I used to',     score: 1 },
      { text: 'Definitely less than I used to', score: 2 },
      { text: 'Hardly at all',                  score: 3 },
    ],
  },
  {
    q: 'I have blamed myself unnecessarily when things went wrong',
    opts: [
      { text: 'Yes, most of the time',  score: 3 },
      { text: 'Yes, some of the time',  score: 2 },
      { text: 'Not very often',         score: 1 },
      { text: 'No, never',              score: 0 },
    ],
  },
  {
    q: 'I have been anxious or worried for no good reason',
    opts: [
      { text: 'No, not at all',   score: 0 },
      { text: 'Hardly ever',      score: 1 },
      { text: 'Yes, sometimes',   score: 2 },
      { text: 'Yes, very often',  score: 3 },
    ],
  },
  {
    q: 'I have felt scared or panicky for no good reason',
    opts: [
      { text: 'Yes, quite a lot', score: 3 },
      { text: 'Yes, sometimes',   score: 2 },
      { text: 'No, not much',     score: 1 },
      { text: 'No, not at all',   score: 0 },
    ],
  },
  {
    q: 'Things have been getting on top of me',
    opts: [
      { text: "Yes, most of the time I haven't been coping",   score: 3 },
      { text: "Yes, sometimes I haven't been coping",          score: 2 },
      { text: "No, most of the time I've coped well",          score: 1 },
      { text: "No, I've been coping as well as ever",          score: 0 },
    ],
  },
  {
    q: "I have been so unhappy that I've had difficulty sleeping",
    opts: [
      { text: 'Yes, most of the time',  score: 3 },
      { text: 'Yes, sometimes',          score: 2 },
      { text: 'Not very often',          score: 1 },
      { text: 'No, not at all',          score: 0 },
    ],
  },
  {
    q: 'I have felt sad or miserable',
    opts: [
      { text: 'Yes, most of the time',  score: 3 },
      { text: 'Yes, quite often',        score: 2 },
      { text: 'Not very often',          score: 1 },
      { text: 'No, not at all',          score: 0 },
    ],
  },
  {
    q: "I have been so unhappy that I've been crying",
    opts: [
      { text: 'Yes, most of the time',  score: 3 },
      { text: 'Yes, quite often',        score: 2 },
      { text: 'Only occasionally',       score: 1 },
      { text: 'No, never',              score: 0 },
    ],
  },
  {
    q: 'The thought of harming myself has occurred to me',
    opts: [
      { text: 'Yes, quite often',  score: 3 },
      { text: 'Sometimes',          score: 2 },
      { text: 'Hardly ever',        score: 1 },
      { text: 'Never',              score: 0 },
    ],
    isCrisis: true,
  },
]

// ─── PHQ-4 ───────────────────────────────────────────────
export const PHQ4_QUESTIONS = [
  {
    q: 'Over the past 2 weeks, how often have you felt little interest or pleasure in doing things?',
    opts: [
      { text: 'Not at all',            score: 0 },
      { text: 'Several days',          score: 1 },
      { text: 'More than half the days', score: 2 },
      { text: 'Nearly every day',      score: 3 },
    ],
  },
  {
    q: 'How often have you felt down, depressed, or hopeless?',
    opts: [
      { text: 'Not at all',            score: 0 },
      { text: 'Several days',          score: 1 },
      { text: 'More than half the days', score: 2 },
      { text: 'Nearly every day',      score: 3 },
    ],
  },
  {
    q: 'How often have you felt nervous, anxious, or on edge?',
    opts: [
      { text: 'Not at all',            score: 0 },
      { text: 'Several days',          score: 1 },
      { text: 'More than half the days', score: 2 },
      { text: 'Nearly every day',      score: 3 },
    ],
  },
  {
    q: 'How often have you been unable to stop or control worrying?',
    opts: [
      { text: 'Not at all',            score: 0 },
      { text: 'Several days',          score: 1 },
      { text: 'More than half the days', score: 2 },
      { text: 'Nearly every day',      score: 3 },
    ],
  },
]

// ─── CULTURAL CONTEXT QUESTIONS ──────────────────────────
export interface CulturalQuestion {
  key: string
  question: string
  options: string[]
  cols: number
  multiSelect?: boolean
}

export const CULTURAL_QUESTIONS: Record<string, CulturalQuestion[]> = {
  pregnancy: [
    { key: 'cq1', question: 'Who do you live with at home?', options: ['With in-laws', 'With my parents', 'Just my partner', 'On my own', 'Mixed / it varies'], cols: 2 },
    { key: 'cq2', question: 'Is this your first pregnancy?', options: ['Yes, first time', "I've been pregnant before", "I've had a loss before", 'I have other children'], cols: 2 },
    { key: 'cq3', question: 'How involved are the people around you in your pregnancy?', options: ['Very involved — sometimes too much', 'Supportive and helpful', 'A little involved', 'Mostly managing on my own'], cols: 1 },
    { key: 'cq4', question: 'Are you working right now?', options: ['Yes, full time', 'Yes, part time', 'On leave / taking a break', 'At home full time'], cols: 2 },
    { key: 'cq5', question: 'When you have a worry, who do you turn to first?', options: ['Family', 'My partner', 'My doctor', 'I look it up myself', 'I tend to keep it in'], cols: 2 },
  ],
  postpartum: [
    { key: 'cq1', question: 'How long ago did you give birth?', options: ['Less than 2 weeks', '2–6 weeks', '1–3 months', '3–6 months', '6–12 months'], cols: 2 },
    { key: 'cq2', question: 'After the baby came home, how was the support around you?', options: ['Lots of help — I felt looked after', 'People were there but it still felt lonely', 'Support came with opinions and pressure', 'I managed mostly on my own'], cols: 1 },
    { key: 'cq3', question: 'How have you been feeling in yourself lately?', options: ['Pretty good, mostly okay', 'Up and down — some hard days', "Something feels off, hard to explain", 'Really struggling'], cols: 1 },
    { key: 'cq4', question: 'Do you feel pressure about how you should be doing?', options: ['Yes, from family', 'Mostly from myself', 'Both family and myself', 'Not really — I feel supported'], cols: 1 },
    { key: 'cq5', question: 'How are you feeding your baby?', options: ['Breastfeeding', 'Formula feeding', 'Both / combination', 'Still figuring it out'], cols: 2 },
  ],
  loss: [
    { key: 'cq1', question: 'How long ago did this happen?', options: ['Very recently', 'A few weeks ago', 'A few months ago', 'More than a year ago', "I'd rather not say"], cols: 2 },
    { key: 'cq2', question: 'Were the people around you able to give you space to grieve?', options: ['Yes — I felt held and supported', 'Somewhat — but not fully', 'I was expected to be okay quickly', 'No one really acknowledged it'], cols: 1 },
    { key: 'cq3', question: 'Have you been able to talk to anyone about this?', options: ['Yes — I have people I can talk to', 'A little, but not really openly', "No — I've mostly carried it quietly", "I'm not ready to talk yet"], cols: 1 },
    { key: 'cq4', question: 'What are you looking for here today?', options: ['Someone to just listen', 'To understand what I went through', "Connection with others who've been through this", "I'm not sure yet"], cols: 1 },
    { key: 'cq5', question: 'Some people find it meaningful to name their loss. Is that something you might want?', options: ['Yes, that feels right', 'Maybe someday, not yet', "No — that's not for me", "I'm not sure"], cols: 1 },
  ],
  menopause: [
    { key: 'cq1', question: 'Where would you say you are right now?', options: ['Still having periods but noticing changes', 'Periods have become very irregular', 'Periods have stopped', 'Post-menopause (stopped over a year ago)', "I'm not sure"], cols: 1 },
    { key: 'cq2', question: 'How openly can you talk about what you\'re going through?', options: ['Openly — family and doctor know', 'A little — but not everything', 'With my doctor only', 'Mostly privately — I deal with it alone'], cols: 1 },
    { key: 'cq3', question: 'Which symptoms are affecting you most?', options: ['Hot flashes', 'Mood changes', 'Sleep problems', 'Brain fog', 'Joint pain', 'Irregular periods', 'Low energy', 'Other'], cols: 2, multiSelect: true },
    { key: 'cq4', question: 'Have you spoken to a doctor about what you\'re going through?', options: ['Yes — I have ongoing support', 'Once or twice, not regularly', 'No — figuring it out on my own', "I'd like to but haven't yet"], cols: 1 },
    { key: 'cq5', question: 'Do the people around you understand what you\'re going through?', options: ['Yes — I feel seen and understood', 'Somewhat — a few people get it', 'Not really — it feels invisible', 'No one talks about it'], cols: 1 },
  ],
  unsure: [
    { key: 'cq1', question: "What's bringing you here today?", options: ['Something specific is on my mind', "I've been feeling off lately", 'Looking for a safe space to think', 'Just curious to explore'], cols: 1 },
    { key: 'cq2', question: 'Are you noticing any changes in your body or emotions?', options: ['Yes — mood or emotional changes', 'Yes — physical changes', 'Both physical and emotional', 'Not really'], cols: 1 },
    { key: 'cq3', question: 'Have you been through anything related to pregnancy?', options: ["I'm currently pregnant", 'I recently had a baby', "I've experienced a loss", "I'm hoping to be pregnant", 'None of these'], cols: 1 },
    { key: 'cq4', question: 'Do you have people you feel comfortable talking to?', options: ['Yes — I have good support', 'Some people, but not about everything', 'Not really — I keep things to myself', 'I prefer a private space for this'], cols: 1 },
    { key: 'cq5', question: "Is there something you've been wanting to say that you haven't felt comfortable saying elsewhere?", options: ["Yes — that's exactly why I'm here", "Maybe — I'm still working it out", 'Not particularly', "I'd rather just start talking"], cols: 1 },
  ],
}

// ─── MOOD TILES ──────────────────────────────────────────
export const MOOD_TILES = [
  { label: 'Radiant',     modifier: 15,  svg: 'radiant' },
  { label: 'Calm',        modifier: 15,  svg: 'calm' },
  { label: 'Content',     modifier: 15,  svg: 'content' },
  { label: 'Anxious',     modifier: -5,  svg: 'anxious' },
  { label: 'Numb',        modifier: -5,  svg: 'numb' },
  { label: 'Sad',         modifier: -10, svg: 'sad' },
  { label: 'Exhausted',   modifier: -10, svg: 'exhausted' },
  { label: 'Irritable',   modifier: -15, svg: 'irritable' },
  { label: 'Overwhelmed', modifier: -15, svg: 'overwhelmed' },
]

// ─── MOOD FACTOR PILLS ──────────────────────────────────
export const ALL_MOOD_FACTORS = [
  'Work / studies', 'Family pressure', 'Partner / spouse',
  'Sleep', 'Physical health', 'Finances',
  'Loneliness', 'My baby', 'Body image',
  'Social media', 'The pregnancy', 'My grief',
  'Hot flashes', 'My identity', 'Nothing specific',
]

export const MOOD_FACTOR_EXCLUDES: Record<string, string[]> = {
  pregnancy:  ['My baby', 'My grief', 'Hot flashes'],
  postpartum: ['The pregnancy', 'My grief', 'Hot flashes'],
  loss:       ['My baby', 'Hot flashes', 'The pregnancy'],
  menopause:  ['My baby', 'The pregnancy', 'My grief'],
  unsure:     [],
}

// ─── SLEEP / APPETITE OPTIONS ────────────────────────────
export const SLEEP_OPTIONS = ['Very poorly', 'Poorly', 'Okay', 'Well', 'Very well']
export const APPETITE_OPTIONS = ['Barely eating', 'Less than usual', 'Normal', 'More than usual', 'Eating a lot']

export const SLEEP_MODIFIERS: Record<string, number> = {
  'Very well': 8, 'Well': 8, 'Okay': 0, 'Poorly': -8, 'Very poorly': -15,
}

export const APPETITE_MODIFIERS: Record<string, number> = {
  'Normal': 0, 'More than usual': -3, 'Less than usual': -5, 'Barely eating': -12, 'Eating a lot': -3,
}

// ─── PHYSICAL SYMPTOMS ──────────────────────────────────
export const BASE_SYMPTOMS = [
  // Gynaecological
  'Irregular bleeding',
  'Pelvic pain',
  'Unusual discharge',
  'Breast lump / tenderness',
  'Menstrual irregularity',
  // General / GP
  'Fever',
  'Headache',
  'Fatigue',
  'Nausea',
  'Body ache',
  'Dizziness',
  'Appetite loss',
  // Psychiatric / psychological
  'Persistent low mood',
  'Panic attacks',
  'Dissociation / detachment',
  'Self-harm thoughts',
  // General
  'Insomnia',
  'Back pain',
  'Anxiety in body',
]

// Symptom → preferred specialist flag
export const SYMPTOM_FLAG_RULES: Record<string, 'gynaecologist' | 'general_physician' | 'psychiatrist'> = {
  'Irregular bleeding':      'gynaecologist',
  'Pelvic pain':             'gynaecologist',
  'Unusual discharge':       'gynaecologist',
  'Breast lump / tenderness':'gynaecologist',
  'Menstrual irregularity':  'gynaecologist',
  'Fever':                   'general_physician',
  'Headache':                'general_physician',
  'Fatigue':                 'general_physician',
  'Nausea':                  'general_physician',
  'Body ache':               'general_physician',
  'Dizziness':               'general_physician',
  'Appetite loss':           'general_physician',
  'Persistent low mood':     'psychiatrist',
  'Panic attacks':           'psychiatrist',
  'Dissociation / detachment':'psychiatrist',
  'Self-harm thoughts':      'psychiatrist',
}

// Derive the top recommended specialist flag given a set of selected symptoms
export function getSymptomFlag(symptoms: string[]): 'gynaecologist' | 'general_physician' | 'psychiatrist' | null {
  const counts: Record<string, number> = {}
  for (const s of symptoms) {
    const flag = SYMPTOM_FLAG_RULES[s]
    if (flag) counts[flag] = (counts[flag] || 0) + 1
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  return sorted.length > 0 ? (sorted[0][0] as 'gynaecologist' | 'general_physician' | 'psychiatrist') : null
}

export const STAGE_SYMPTOMS: Record<string, string[]> = {
  pregnancy:  ['Swelling', 'Heartburn', 'Shortness of breath', 'Pelvic pressure', 'Leg cramps'],
  postpartum: ['Hair loss', 'Pelvic floor pain', 'Engorged breasts', 'Wound soreness', 'Lochia'],
  loss:       ['Chest tightness', 'Crying spells', 'Appetite loss', 'Numbness'],
  menopause:  ['Hot flashes', 'Night sweats', 'Joint pain', 'Brain fog', 'Vaginal dryness'],
  unsure:     ['Mood swings', 'Irregular periods', 'Bloating', 'Heart palpitations'],
}

// ─── STAGE-SPECIFIC CHECK-IN QUESTIONS ───────────────────
export const STAGE_CHECKIN_QUESTIONS: Record<string, { question: string; options: string[] }> = {
  pregnancy:  { question: 'How connected do you feel to your pregnancy today?', options: ['Very connected', 'Somewhat connected', 'Feeling distant', 'Mixed feelings', 'Not sure'] },
  postpartum: { question: 'How are you feeling about being a mother today?', options: ['Loving it', 'Finding my rhythm', 'Struggling but trying', 'Really hard today', 'Too tired to feel anything'] },
  loss:       { question: 'How present is your grief today?', options: ['Very present', 'In the background', 'Having a good day', 'Numb', "It's coming in waves"] },
  menopause:  { question: 'How manageable do your symptoms feel today?', options: ['Very manageable', 'Somewhat manageable', 'Challenging', 'Really difficult', 'Overwhelming'] },
  unsure:     { question: 'On a scale of how you usually feel, today is:', options: ['Better than usual', 'About the same', 'A bit harder', 'Much harder', 'Not sure'] },
}

export const STAGE_SPECIFIC_MODIFIERS: Record<string, Record<string, number>> = {
  pregnancy:  { 'Very connected': 5, 'Somewhat connected': 2, 'Feeling distant': -5, 'Mixed feelings': -3, 'Not sure': 0 },
  postpartum: { 'Loving it': 5, 'Finding my rhythm': 2, 'Struggling but trying': -5, 'Really hard today': -12, 'Too tired to feel anything': -8 },
  loss:       { 'Having a good day': 8, 'In the background': 3, "It's coming in waves": -3, 'Numb': -5, 'Very present': -8 },
  menopause:  { 'Very manageable': 5, 'Somewhat manageable': 2, 'Challenging': -5, 'Really difficult': -8, 'Overwhelming': -12 },
  unsure:     { 'Better than usual': 5, 'About the same': 0, 'A bit harder': -5, 'Much harder': -10, 'Not sure': 0 },
}

// ─── AFFIRMATION BANK ────────────────────────────────────
export const AFFIRMATIONS: Record<string, string[]> = {
  pregnancy: [
    'Your body is doing something extraordinary right now.',
    'Growing a life while carrying your own feelings takes incredible strength.',
    'You are allowed to feel uncertain and excited at the same time.',
  ],
  postpartum: [
    "You don't have to be okay to be a good mother.",
    'Rest is not weakness. It is how you heal.',
    "Your baby doesn't need a perfect mother. They need you.",
  ],
  loss: [
    'Your grief is not weakness. It is love with nowhere to go.',
    'You are allowed to take as long as you need.',
    'There is no right way to heal from this. There is only your way.',
  ],
  menopause: [
    'This is a transition, not a decline.',
    'Your body is not breaking. It is changing.',
    'You have navigated every phase of your life. This one too.',
  ],
  unsure: [
    'Not knowing where you are is a valid place to begin.',
    'You showed up. That already matters.',
    "Being gentle with yourself is not optional. It's necessary.",
  ],
}

// ─── TECHNIQUE BANK ──────────────────────────────────────
export interface Technique {
  id: string
  title: string
  duration: string
  description: string
  triggers: string[]
  stages: string[]
  steps: string[]
}

export const TECHNIQUES: Technique[] = [
  {
    id: 'box-breathing',
    title: 'Box Breathing',
    duration: '3 min',
    description: 'A simple breathing technique that calms your nervous system. Breathe in for 4 counts, hold for 4, breathe out for 4, hold for 4.',
    triggers: ['Anxious', 'Anxiety in body', 'panic'],
    stages: ['pregnancy', 'postpartum', 'loss', 'menopause', 'unsure'],
    steps: ['Breathe in slowly for 4 counts', 'Hold your breath for 4 counts', 'Breathe out slowly for 4 counts', 'Hold for 4 counts', 'Repeat 4 times'],
  },
  {
    id: 'grounding-54321',
    title: '5-4-3-2-1 Grounding',
    duration: '5 min',
    description: 'A sensory grounding technique that brings you back to the present moment when you feel overwhelmed or disconnected.',
    triggers: ['Overwhelmed', 'Numb', 'Dizziness'],
    stages: ['pregnancy', 'postpartum', 'loss', 'menopause', 'unsure'],
    steps: ['Name 5 things you can see', 'Name 4 things you can touch', 'Name 3 things you can hear', 'Name 2 things you can smell', 'Name 1 thing you can taste'],
  },
  {
    id: 'muscle-relaxation',
    title: 'Progressive Muscle Relaxation',
    duration: '10 min',
    description: 'Systematically tense and release each muscle group to release physical tension and promote deep relaxation.',
    triggers: ['Exhausted', 'Back pain', 'Insomnia', 'tension'],
    stages: ['pregnancy', 'postpartum', 'loss', 'menopause', 'unsure'],
    steps: ['Start with your feet — tense for 5 seconds, then release', 'Move to your calves — tense and release', 'Thighs — tense and release', 'Hands and arms — tense and release', 'Shoulders and neck — tense and release', 'Face — tense and release', 'Take 3 slow breaths to finish'],
  },
  {
    id: 'body-scan',
    title: 'Body Scan',
    duration: '5 min',
    description: 'A guided attention scan from feet to head that helps you notice where you hold tension and gently release it.',
    triggers: ['Exhausted', 'Numb', 'Fatigue'],
    stages: ['pregnancy', 'postpartum', 'loss', 'menopause', 'unsure'],
    steps: ['Close your eyes and take 3 deep breaths', 'Bring attention to your feet — notice any sensation', 'Slowly move attention up through your legs', 'Notice your abdomen and chest', 'Bring awareness to your arms and hands', 'Notice your neck, jaw, and face', 'Take 3 more deep breaths to finish'],
  },
  {
    id: 'journaling',
    title: 'Journaling Prompt',
    duration: '5 min',
    description: 'Writing can help process difficult emotions. Use a guided prompt to explore how you feel in a safe, private way.',
    triggers: ['Sad', 'grief', 'Crying spells'],
    stages: ['pregnancy', 'postpartum', 'loss', 'menopause', 'unsure'],
    steps: ['Find a quiet space and something to write with', 'Read the prompt and sit with it for a moment', 'Write whatever comes to mind — no editing needed', 'When you feel done, read it back gently', 'Close with one kind sentence to yourself'],
  },
  {
    id: 'cognitive-reframing',
    title: 'Cognitive Reframing',
    duration: '5 min',
    description: 'Challenge unhelpful thoughts by identifying them, questioning their truth, and replacing them with balanced alternatives.',
    triggers: ['Anxious', 'Irritable', 'self-blame'],
    stages: ['pregnancy', 'postpartum', 'loss', 'menopause', 'unsure'],
    steps: ['Identify the thought that is bothering you', 'Ask: Is this thought 100% true?', 'Ask: What would I say to a friend thinking this?', 'Create a balanced reframe of the thought', 'Write down the new thought and read it aloud'],
  },
  {
    id: 'pelvic-floor',
    title: 'Pelvic Floor Exercise',
    duration: '3 min',
    description: 'Gentle Kegel exercises to strengthen your pelvic floor, which is especially important during postpartum recovery.',
    triggers: ['Pelvic floor pain'],
    stages: ['postpartum'],
    steps: ['Sit or lie comfortably', 'Squeeze your pelvic floor muscles (as if stopping urination)', 'Hold for 5 seconds', 'Release for 5 seconds', 'Repeat 10 times', 'Rest for 30 seconds', 'Do another set of 10'],
  },
  {
    id: 'sleep-hygiene',
    title: 'Sleep Hygiene Checklist',
    duration: '3 min',
    description: 'Review and improve your sleep habits with this evidence-based checklist tailored to your stage.',
    triggers: ['Insomnia', 'Sleep', 'Exhausted'],
    stages: ['pregnancy', 'postpartum', 'loss', 'menopause', 'unsure'],
    steps: ['Keep a consistent bedtime and wake time', 'Avoid screens 30 minutes before bed', 'Keep your room cool, dark, and quiet', 'Avoid caffeine after 2pm', 'Try a calming activity before bed (reading, gentle stretching)', 'Limit naps to 20 minutes', 'Write down worries before bed to help let them go'],
  },
  {
    id: 'social-scripts',
    title: 'Social Script Helper',
    duration: '3 min',
    description: 'Gentle, prepared phrases for navigating difficult conversations with family, especially around pressure or unsolicited advice.',
    triggers: ['Family pressure', 'Irritable'],
    stages: ['pregnancy', 'postpartum', 'loss', 'menopause', 'unsure'],
    steps: ['"I appreciate your concern. I\'ll think about it."', '"I\'m following my doctor\'s advice on this."', '"I need a little space right now, but I\'m okay."', '"Thank you for caring. I\'ll ask when I need help."', '"I know you mean well. This is what works for me right now."'],
  },
]

// ─── COUNSELORS ──────────────────────────────────────────
export const SPECIALISATIONS = [
  'Psychiatrist',
  'Psychologist',
  'Gynaecologist',
  'General Physician',
]

export const COUNSELORS = [
  {
    name: 'Dr. Priya Nair',
    credentials: 'MSc Psychology (RCI Reg.)',
    specialisations: ['Postpartum', 'Perinatal grief'],
    specialistFlag: 'psychiatrist' as const,
    languages: ['English', 'Malayalam'],
    initials: 'PN',
    available: 'Today',
  },
  {
    name: 'Dr. Ananya Sharma',
    credentials: 'MPhil Clinical Psychology',
    specialisations: ['Pregnancy anxiety', 'Menopause'],
    specialistFlag: 'psychiatrist' as const,
    languages: ['English', 'Hindi'],
    initials: 'AS',
    available: 'Today',
  },
  {
    name: 'Ms. Lakshmi Iyer',
    credentials: 'MA Counselling Psychology',
    specialisations: ['Grief', 'Loss', 'Life transitions'],
    specialistFlag: 'psychiatrist' as const,
    languages: ['English', 'Hindi', 'Malayalam'],
    initials: 'LI',
    available: 'Tomorrow',
  },
  {
    name: 'Dr. Meera Krishnan',
    credentials: 'MBBS, MD (Obstetrics & Gynaecology)',
    specialisations: ['Menstrual health', 'PCOS', 'Pelvic pain'],
    specialistFlag: 'gynaecologist' as const,
    languages: ['English', 'Tamil', 'Hindi'],
    initials: 'MK',
    available: 'Today',
  },
  {
    name: 'Dr. Sunita Rajan',
    credentials: 'MBBS, MD (General Medicine)',
    specialisations: ['Women\'s general health', 'Fatigue', 'Chronic symptoms'],
    specialistFlag: 'general_physician' as const,
    languages: ['English', 'Hindi'],
    initials: 'SR',
    available: 'Tomorrow',
  },
]

export const CRISIS_RESOURCES = [
  { name: 'iCall (TISS)', number: '9152987821' },
  { name: 'Vandrevala Foundation', number: '1860-2662-345' },
  { name: 'NIMHANS helpline', number: '080-46110007' },
]
