export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      account_security: {
        Row: {
          created_at: string
          email_verified: boolean
          failed_login_count: number
          last_failed_login_at: string | null
          locked_until: string | null
          otp_enabled: boolean
          password_changed_at: string
          password_expires_at: string | null
          two_factor_enabled: boolean
          two_factor_secret: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_verified?: boolean
          failed_login_count?: number
          last_failed_login_at?: string | null
          locked_until?: string | null
          otp_enabled?: boolean
          password_changed_at?: string
          password_expires_at?: string | null
          two_factor_enabled?: boolean
          two_factor_secret?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_verified?: boolean
          failed_login_count?: number
          last_failed_login_at?: string | null
          locked_until?: string | null
          otp_enabled?: boolean
          password_changed_at?: string
          password_expires_at?: string | null
          two_factor_enabled?: boolean
          two_factor_secret?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_logs: {
        Row: {
          channel: string
          context: Json
          correlation_id: string | null
          created_at: string
          duration_ms: number | null
          id: string
          level: string
          message: string
          request_id: string | null
          user_id: string | null
        }
        Insert: {
          channel?: string
          context?: Json
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          level?: string
          message: string
          request_id?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          context?: Json
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          level?: string
          message?: string
          request_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json
          entity: string
          entity_id: string | null
          id: string
          ip: unknown
          new_value: Json | null
          old_value: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity: string
          entity_id?: string | null
          id?: string
          ip?: unknown
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity?: string
          entity_id?: string | null
          id?: string
          ip?: unknown
          new_value?: Json | null
          old_value?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      countries: {
        Row: {
          active: boolean
          calling_code: string | null
          code: string
          created_at: string
          currency_code: string | null
          default_locale: string | null
          default_timezone: string | null
          name: string
          region: string | null
        }
        Insert: {
          active?: boolean
          calling_code?: string | null
          code: string
          created_at?: string
          currency_code?: string | null
          default_locale?: string | null
          default_timezone?: string | null
          name: string
          region?: string | null
        }
        Update: {
          active?: boolean
          calling_code?: string | null
          code?: string
          created_at?: string
          currency_code?: string | null
          default_locale?: string | null
          default_timezone?: string | null
          name?: string
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "countries_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      currencies: {
        Row: {
          active: boolean
          code: string
          created_at: string
          minor_units: number
          name: string
          symbol: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          minor_units?: number
          name: string
          symbol: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          minor_units?: number
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      email_messages: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          payload: Json
          project_id: string | null
          provider_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template: string
          to_email: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          project_id?: string | null
          provider_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template: string
          to_email: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          payload?: Json
          project_id?: string | null
          provider_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template?: string
          to_email?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      enhancement_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          enhancement_id: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          enhancement_id: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          enhancement_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enhancement_comments_enhancement_id_fkey"
            columns: ["enhancement_id"]
            isOneToOne: false
            referencedRelation: "enhancements"
            referencedColumns: ["id"]
          },
        ]
      }
      enhancements: {
        Row: {
          created_at: string
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["priority_level"]
          project_id: string
          requested_by: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          project_id: string
          requested_by: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          project_id?: string
          requested_by?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enhancements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_metadata: {
        Row: {
          base_code: string
          fetched_at: string
          quote_code: string
          rate: number
          source: string
        }
        Insert: {
          base_code: string
          fetched_at?: string
          quote_code: string
          rate: number
          source?: string
        }
        Update: {
          base_code?: string
          fetched_at?: string
          quote_code?: string
          rate?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_metadata_base_code_fkey"
            columns: ["base_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_metadata_quote_code_fkey"
            columns: ["quote_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_cents: number
          client_id: string
          created_at: string
          currency: string
          id: string
          invoice_number: string
          issued_at: string | null
          payment_id: string | null
          pdf_url: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          client_id: string
          created_at?: string
          currency?: string
          id?: string
          invoice_number: string
          issued_at?: string | null
          payment_id?: string | null
          pdf_url?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          client_id?: string
          created_at?: string
          currency?: string
          id?: string
          invoice_number?: string
          issued_at?: string | null
          payment_id?: string | null
          pdf_url?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_replies: {
        Row: {
          attachments: Json
          author_id: string
          body: string
          created_at: string
          id: string
          issue_id: string
        }
        Insert: {
          attachments?: Json
          author_id: string
          body: string
          created_at?: string
          id?: string
          issue_id: string
        }
        Update: {
          attachments?: Json
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          issue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_replies_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "project_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      job_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          payload: Json
          priority: number
          queue: string
          run_at: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          queue: string
          run_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          payload?: Json
          priority?: number
          queue?: string
          run_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          assigned_to: string | null
          attachment_path: string | null
          budget: string | null
          company: string | null
          country: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          message: string | null
          package: string | null
          phone: string | null
          platforms: string[]
          project_type: string | null
          referral_source: string | null
          source: string
          status: string
          timeline: string | null
          updated_at: string
          utm: Json
        }
        Insert: {
          assigned_to?: string | null
          attachment_path?: string | null
          budget?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          message?: string | null
          package?: string | null
          phone?: string | null
          platforms?: string[]
          project_type?: string | null
          referral_source?: string | null
          source?: string
          status?: string
          timeline?: string | null
          updated_at?: string
          utm?: Json
        }
        Update: {
          assigned_to?: string | null
          attachment_path?: string | null
          budget?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          package?: string | null
          phone?: string | null
          platforms?: string[]
          project_type?: string | null
          referral_source?: string | null
          source?: string
          status?: string
          timeline?: string | null
          updated_at?: string
          utm?: Json
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          country: string | null
          created_at: string
          email: string
          fingerprint: string | null
          id: string
          ip: unknown
          reason: string | null
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          email: string
          fingerprint?: string | null
          id?: string
          ip?: unknown
          reason?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string
          fingerprint?: string | null
          id?: string
          ip?: unknown
          reason?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      meetings: {
        Row: {
          agenda: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          meeting_link: string | null
          project_id: string
          recording_url: string | null
          scheduled_at: string
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          meeting_link?: string | null
          project_id: string
          recording_url?: string | null
          scheduled_at: string
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          meeting_link?: string | null
          project_id?: string
          recording_url?: string | null
          scheduled_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      password_history: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_cents: number
          client_id: string
          created_at: string
          currency: string
          failure_reason: string | null
          gateway: string
          id: string
          idempotency_key: string | null
          invoice_id: string | null
          is_reservation: boolean
          metadata: Json
          order_id: string | null
          payment_id: string | null
          pricing_version: number | null
          project_id: string | null
          region: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tier: string | null
          updated_at: string
          webhook_verified: boolean
        }
        Insert: {
          amount_cents?: number
          client_id: string
          created_at?: string
          currency?: string
          failure_reason?: string | null
          gateway?: string
          id?: string
          idempotency_key?: string | null
          invoice_id?: string | null
          is_reservation?: boolean
          metadata?: Json
          order_id?: string | null
          payment_id?: string | null
          pricing_version?: number | null
          project_id?: string | null
          region?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tier?: string | null
          updated_at?: string
          webhook_verified?: boolean
        }
        Update: {
          amount_cents?: number
          client_id?: string
          created_at?: string
          currency?: string
          failure_reason?: string | null
          gateway?: string
          id?: string
          idempotency_key?: string | null
          invoice_id?: string | null
          is_reservation?: boolean
          metadata?: Json
          order_id?: string | null
          payment_id?: string | null
          pricing_version?: number | null
          project_id?: string | null
          region?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tier?: string | null
          updated_at?: string
          webhook_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          country: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          email: string | null
          full_name: string | null
          id: string
          last_login_at: string | null
          phone: string | null
          status: Database["public"]["Enums"]["entity_status"]
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          last_login_at?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          last_login_at?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["entity_status"]
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_assignments: {
        Row: {
          created_at: string
          id: string
          project_id: string
          role: Database["public"]["Enums"]["assignment_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          role?: Database["public"]["Enums"]["assignment_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          role?: Database["public"]["Enums"]["assignment_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_deliveries: {
        Row: {
          apk_url: string | null
          created_at: string
          credentials: Json | null
          documentation_url: string | null
          download_url: string | null
          github_url: string | null
          id: string
          ipa_url: string | null
          kind: string
          label: string
          project_id: string
          status: string
          unlocked: boolean
          updated_at: string
          version: string | null
        }
        Insert: {
          apk_url?: string | null
          created_at?: string
          credentials?: Json | null
          documentation_url?: string | null
          download_url?: string | null
          github_url?: string | null
          id?: string
          ipa_url?: string | null
          kind?: string
          label: string
          project_id: string
          status?: string
          unlocked?: boolean
          updated_at?: string
          version?: string | null
        }
        Update: {
          apk_url?: string | null
          created_at?: string
          credentials?: Json | null
          documentation_url?: string | null
          download_url?: string | null
          github_url?: string | null
          id?: string
          ipa_url?: string | null
          kind?: string
          label?: string
          project_id?: string
          status?: string
          unlocked?: boolean
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_deliveries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_issues: {
        Row: {
          assigned_to: string | null
          attachments: Json
          created_at: string
          detail: string | null
          id: string
          issue_number: number
          project_id: string
          reported_by: string | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          attachments?: Json
          created_at?: string
          detail?: string | null
          id?: string
          issue_number?: number
          project_id: string
          reported_by?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          attachments?: Json
          created_at?: string
          detail?: string | null
          id?: string
          issue_number?: number
          project_id?: string
          reported_by?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_issues_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          created_at: string
          detail: string | null
          due_date: string | null
          id: string
          position: number
          project_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          due_date?: string | null
          id?: string
          position?: number
          project_id: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          due_date?: string | null
          id?: string
          position?: number
          project_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          due_date: string | null
          id: string
          label: string
          project_id: string
          status: string
        }
        Insert: {
          amount_cents?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          label: string
          project_id: string
          status?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          label?: string
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          duration_seconds: number | null
          from_status: string | null
          id: string
          metadata: Json
          note: string | null
          owner_id: string | null
          project_id: string
          reason: string | null
          to_status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          duration_seconds?: number | null
          from_status?: string | null
          id?: string
          metadata?: Json
          note?: string | null
          owner_id?: string | null
          project_id: string
          reason?: string | null
          to_status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          duration_seconds?: number | null
          from_status?: string | null
          id?: string
          metadata?: Json
          note?: string | null
          owner_id?: string | null
          project_id?: string
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_status_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client_id: string
          completed_at: string | null
          country: string | null
          created_at: string
          currency: string
          deleted_at: string | null
          deployment_url: string | null
          estimated_delivery: string | null
          github_repo: string | null
          id: string
          launch_date: string | null
          locale: string | null
          manager_id: string | null
          name: string
          package: string | null
          platforms: string[]
          preferred_language: string
          priority: Database["public"]["Enums"]["priority_level"]
          progress: number
          region: string | null
          reservation_paid: boolean
          started_at: string | null
          status: string
          summary: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          deployment_url?: string | null
          estimated_delivery?: string | null
          github_repo?: string | null
          id?: string
          launch_date?: string | null
          locale?: string | null
          manager_id?: string | null
          name: string
          package?: string | null
          platforms?: string[]
          preferred_language?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          progress?: number
          region?: string | null
          reservation_paid?: boolean
          started_at?: string | null
          status?: string
          summary?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          deleted_at?: string | null
          deployment_url?: string | null
          estimated_delivery?: string | null
          github_repo?: string | null
          id?: string
          launch_date?: string | null
          locale?: string | null
          manager_id?: string | null
          name?: string
          package?: string | null
          platforms?: string[]
          preferred_language?: string
          priority?: Database["public"]["Enums"]["priority_level"]
          progress?: number
          region?: string | null
          reservation_paid?: boolean
          started_at?: string | null
          status?: string
          summary?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      regional_pricing: {
        Row: {
          active: boolean
          amount_cents: number
          compare_at_cents: number | null
          created_at: string
          currency_code: string
          effective_from: string
          effective_until: string | null
          id: string
          reservation_cents: number | null
          tier: string
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          amount_cents: number
          compare_at_cents?: number | null
          created_at?: string
          currency_code: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          reservation_cents?: number | null
          tier: string
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          amount_cents?: number
          compare_at_cents?: number | null
          created_at?: string
          currency_code?: string
          effective_from?: string
          effective_until?: string | null
          id?: string
          reservation_cents?: number | null
          tier?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "regional_pricing_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      requirements: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"]
          body: string | null
          created_at: string
          created_by: string
          files: Json
          id: string
          project_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          body?: string | null
          created_at?: string
          created_by: string
          files?: Json
          id?: string
          project_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["approval_status"]
          body?: string | null
          created_at?: string
          created_by?: string
          files?: Json
          id?: string
          project_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          label: string
          name: Database["public"]["Enums"]["app_role"]
          permissions: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          label: string
          name: Database["public"]["Enums"]["app_role"]
          permissions?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          label?: string
          name?: Database["public"]["Enums"]["app_role"]
          permissions?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          detail: Json
          id: string
          ip: unknown
          message: string | null
          severity: string
          type: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          ip?: unknown
          message?: string | null
          severity?: string
          type: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          ip?: unknown
          message?: string | null
          severity?: string
          type?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          country: string | null
          created_at: string
          device: string | null
          expires_at: string | null
          fingerprint: string | null
          id: string
          idle_expires_at: string | null
          ip: unknown
          last_seen_at: string
          os: string | null
          refresh_token_hash: string | null
          remember_me: boolean
          revoke_reason: string | null
          revoked: boolean
          revoked_at: string | null
          revoked_by: string | null
          rotated_from: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          expires_at?: string | null
          fingerprint?: string | null
          id?: string
          idle_expires_at?: string | null
          ip?: unknown
          last_seen_at?: string
          os?: string | null
          refresh_token_hash?: string | null
          remember_me?: boolean
          revoke_reason?: string | null
          revoked?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          rotated_from?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          country?: string | null
          created_at?: string
          device?: string | null
          expires_at?: string | null
          fingerprint?: string | null
          id?: string
          idle_expires_at?: string | null
          ip?: unknown
          last_seen_at?: string
          os?: string | null
          refresh_token_hash?: string | null
          remember_me?: boolean
          revoke_reason?: string | null
          revoked?: boolean
          revoked_at?: string | null
          revoked_by?: string | null
          rotated_from?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_rotated_from_fkey"
            columns: ["rotated_from"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          attempts: number
          created_at: string
          event_type: string | null
          external_id: string | null
          headers: Json
          id: string
          last_error: string | null
          payload: Json
          processed_at: string | null
          provider: string
          received_at: string
          signature_verified: boolean
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          event_type?: string | null
          external_id?: string | null
          headers?: Json
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          provider: string
          received_at?: string
          signature_verified?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          event_type?: string | null
          external_id?: string | null
          headers?: Json
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
          signature_verified?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_can_read_project: { Args: { _project_id: string }; Returns: boolean }
      auth_can_write_project: {
        Args: { _project_id: string }
        Returns: boolean
      }
      auth_has_any_role: {
        Args: { _roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      auth_is_admin: { Args: never; Returns: boolean }
      auth_is_assigned: { Args: { _project_id: string }; Returns: boolean }
      auth_is_staff: { Args: never; Returns: boolean }
      auth_owns_project: { Args: { _project_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      owns_project: { Args: { _project_id: string }; Returns: boolean }
      safe_uuid: { Args: { _value: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "client"
        | "super_admin"
        | "project_manager"
        | "developer"
        | "support"
      approval_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "changes_requested"
      assignment_role: "project_manager" | "developer" | "support"
      entity_status: "active" | "inactive" | "suspended" | "archived"
      invoice_status: "draft" | "issued" | "paid" | "void"
      payment_status:
        | "created"
        | "checkout_pending"
        | "pending"
        | "authorized"
        | "captured"
        | "paid"
        | "partially_refunded"
        | "failed"
        | "refunded"
        | "cancelled"
      priority_level: "low" | "medium" | "high" | "urgent"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "client",
        "super_admin",
        "project_manager",
        "developer",
        "support",
      ],
      approval_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "changes_requested",
      ],
      assignment_role: ["project_manager", "developer", "support"],
      entity_status: ["active", "inactive", "suspended", "archived"],
      invoice_status: ["draft", "issued", "paid", "void"],
      payment_status: [
        "created",
        "checkout_pending",
        "pending",
        "authorized",
        "captured",
        "paid",
        "partially_refunded",
        "failed",
        "refunded",
        "cancelled",
      ],
      priority_level: ["low", "medium", "high", "urgent"],
    },
  },
} as const
