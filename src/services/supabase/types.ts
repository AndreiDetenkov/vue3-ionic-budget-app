export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          icon: string | null
          id: string
          title: string
        }
        Insert: {
          icon?: string | null
          id: string
          title: string
        }
        Update: {
          icon?: string | null
          id?: string
          title?: string
        }
      }
      transactions: {
        Row: {
          category_id: string
          created_at: string
          id: string
          name: string
          value: number
        }
        Insert: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          value: number
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          name?: string
          value?: number
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      install_available_extensions_and_test: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
