export type WordSource = 'ai' | 'custom'
export type WordStatus = 'learning' | 'mastered'
export type AttemptContext = 'daily' | 'sunday' | 'review'

export interface Profile {
  user_id: string
  words_per_day: number
  level: string
  categories: string[]
  timezone: string
  current_streak: number
  longest_streak: number
  last_active_date: string | null
  created_at?: string
  updated_at?: string
}

export interface Word {
  id: string
  user_id: string
  term: string
  definition: string
  part_of_speech: string
  example: string
  source: WordSource
  week_start: string
  added_date: string
  mastery: number
  times_correct: number
  times_incorrect: number
  status: WordStatus
  next_review_date: string | null
  learned_at: string | null
  created_at?: string
}

export interface Attempt {
  id: string
  user_id: string
  word_id: string
  sentence: string
  is_correct: boolean
  feedback: string
  correction: string | null
  context: AttemptContext
  created_at: string
}

export interface DailySession {
  id: string
  user_id: string
  date: string
  completed_at: string | null
  word_ids: string[]
  created_at?: string
}

export interface GeneratedWord {
  term: string
  definition: string
  part_of_speech: string
  example: string
}

export interface GradeResult {
  is_correct: boolean
  feedback: string
  correction: string | null
}

type ProfileInsert = {
  user_id: string
  words_per_day?: number
  level?: string
  categories?: string[]
  timezone?: string
  current_streak?: number
  longest_streak?: number
  last_active_date?: string | null
}

type WordInsert = {
  user_id: string
  term: string
  definition: string
  part_of_speech?: string
  example?: string
  source?: WordSource
  week_start: string
  added_date?: string
  mastery?: number
  times_correct?: number
  times_incorrect?: number
  status?: WordStatus
  next_review_date?: string | null
  learned_at?: string | null
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: ProfileInsert
        Update: Partial<ProfileInsert>
        Relationships: []
      }
      words: {
        Row: Word
        Insert: WordInsert
        Update: Partial<WordInsert>
        Relationships: []
      }
      attempts: {
        Row: Attempt
        Insert: Omit<Attempt, 'id' | 'created_at'>
        Update: Partial<Omit<Attempt, 'id' | 'created_at'>>
        Relationships: []
      }
      daily_sessions: {
        Row: DailySession
        Insert: Omit<DailySession, 'id' | 'created_at'>
        Update: Partial<Omit<DailySession, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
