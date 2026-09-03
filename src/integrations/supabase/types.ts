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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          module: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          module: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          module?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bank_details: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          bkash_number: string | null
          branch_name: string | null
          created_at: string
          id: string
          is_active: boolean | null
          routing_number: string | null
          swift_code: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          bkash_number?: string | null
          branch_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          routing_number?: string | null
          swift_code?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          bkash_number?: string | null
          branch_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          routing_number?: string | null
          swift_code?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category_id: string | null
          content: string | null
          created_at: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string | null
          tags: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string | null
          tags?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string | null
          tags?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      client_documents: {
        Row: {
          created_at: string
          description: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          metadata: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          metadata?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          metadata?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_portal_settings: {
        Row: {
          access_level: string | null
          feature_key: string
          id: string
          is_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          access_level?: string | null
          feature_key: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          access_level?: string | null
          feature_key?: string
          id?: string
          is_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      client_projects: {
        Row: {
          budget: number | null
          created_at: string
          currency: string
          description: string | null
          due_date: string | null
          id: string
          manager_name: string | null
          name: string
          progress: number
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          manager_name?: string | null
          name: string
          progress?: number
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          due_date?: string | null
          id?: string
          manager_name?: string | null
          name?: string
          progress?: number
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_tasks: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "client_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          budget_range: string | null
          created_at: string | null
          email: string
          id: string
          internal_notes: string | null
          message: string
          name: string
          service_type: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          budget_range?: string | null
          created_at?: string | null
          email: string
          id?: string
          internal_notes?: string | null
          message: string
          name: string
          service_type?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          budget_range?: string | null
          created_at?: string | null
          email?: string
          id?: string
          internal_notes?: string | null
          message?: string
          name?: string
          service_type?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: []
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          role?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          last_message_at: string
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          last_message_at?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      gig_categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          sort_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          sort_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          sort_order?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      gig_packages: {
        Row: {
          cta_text: string | null
          delivery_time: string | null
          features: Json | null
          gig_id: string | null
          id: string
          name: string
          price: number
          revisions: number | null
        }
        Insert: {
          cta_text?: string | null
          delivery_time?: string | null
          features?: Json | null
          gig_id?: string | null
          id?: string
          name: string
          price: number
          revisions?: number | null
        }
        Update: {
          cta_text?: string | null
          delivery_time?: string | null
          features?: Json | null
          gig_id?: string | null
          id?: string
          name?: string
          price?: number
          revisions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gig_packages_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          gig_id: string
          id: string
          is_verified_purchase: boolean | null
          moderator_notes: string | null
          order_id: string | null
          rating: number
          reviewer_avatar: string | null
          reviewer_name: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          gig_id: string
          id?: string
          is_verified_purchase?: boolean | null
          moderator_notes?: string | null
          order_id?: string | null
          rating: number
          reviewer_avatar?: string | null
          reviewer_name: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          gig_id?: string
          id?: string
          is_verified_purchase?: boolean | null
          moderator_notes?: string | null
          order_id?: string | null
          rating?: number
          reviewer_avatar?: string | null
          reviewer_name?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gig_reviews_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gig_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      gigs: {
        Row: {
          category_id: string | null
          created_at: string | null
          deliverables: Json | null
          full_description: string | null
          gallery: Json | null
          id: string
          is_featured: boolean | null
          problem_statement: string | null
          requirements: string | null
          short_description: string | null
          slug: string
          solution: string | null
          status: string | null
          tags: Json | null
          thumbnail: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          deliverables?: Json | null
          full_description?: string | null
          gallery?: Json | null
          id?: string
          is_featured?: boolean | null
          problem_statement?: string | null
          requirements?: string | null
          short_description?: string | null
          slug: string
          solution?: string | null
          status?: string | null
          tags?: Json | null
          thumbnail?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          deliverables?: Json | null
          full_description?: string | null
          gallery?: Json | null
          id?: string
          is_featured?: boolean | null
          problem_statement?: string | null
          requirements?: string | null
          short_description?: string | null
          slug?: string
          solution?: string | null
          status?: string | null
          tags?: Json | null
          thumbnail?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gigs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "gig_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_settings: {
        Row: {
          company_address: string
          company_email: string
          company_logo: string | null
          company_name: string
          id: string
          invoice_prefix: string
          next_invoice_number: number
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          company_address?: string
          company_email?: string
          company_logo?: string | null
          company_name?: string
          id?: string
          invoice_prefix?: string
          next_invoice_number?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          company_address?: string
          company_email?: string
          company_logo?: string | null
          company_name?: string
          id?: string
          invoice_prefix?: string
          next_invoice_number?: number
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      invoice_templates: {
        Row: {
          created_at: string | null
          html_template: string
          id: string
          subject: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          html_template: string
          id?: string
          subject: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          html_template?: string
          id?: string
          subject?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          billing_from: Json | null
          billing_to: Json | null
          created_at: string
          currency: string
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          items: Json
          last_email_sent_at: string | null
          last_email_status: Json | null
          notes: string | null
          order_id: string | null
          status: string | null
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_from?: Json | null
          billing_to?: Json | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          items: Json
          last_email_sent_at?: string | null
          last_email_status?: Json | null
          notes?: string | null
          order_id?: string | null
          status?: string | null
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_from?: Json | null
          billing_to?: Json | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          items?: Json
          last_email_sent_at?: string | null
          last_email_status?: Json | null
          notes?: string | null
          order_id?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          created_at: string | null
          created_by: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          folder: string | null
          height: number | null
          id: string
          metadata: Json | null
          name: string
          updated_at: string | null
          url: string
          width: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          folder?: string | null
          height?: number | null
          id?: string
          metadata?: Json | null
          name: string
          updated_at?: string | null
          url: string
          width?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          folder?: string | null
          height?: number | null
          id?: string
          metadata?: Json | null
          name?: string
          updated_at?: string | null
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          body?: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      module_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          benefit: string | null
          created_at: string | null
          cta_text: string | null
          description: string | null
          destination_url: string
          expiry_date: string | null
          id: string
          is_active: boolean | null
          partner_id: string | null
          title: string
        }
        Insert: {
          benefit?: string | null
          created_at?: string | null
          cta_text?: string | null
          description?: string | null
          destination_url: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          partner_id?: string | null
          title: string
        }
        Update: {
          benefit?: string | null
          created_at?: string | null
          cta_text?: string | null
          description?: string | null
          destination_url?: string
          expiry_date?: string | null
          id?: string
          is_active?: boolean | null
          partner_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          amount: number
          billing_details: Json | null
          created_at: string | null
          currency: string
          id: string
          last_email_sent_at: string | null
          last_email_status: Json | null
          package_id: string | null
          payment_method:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payment_proof_url: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          billing_details?: Json | null
          created_at?: string | null
          currency?: string
          id?: string
          last_email_sent_at?: string | null
          last_email_status?: Json | null
          package_id?: string | null
          payment_method?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payment_proof_url?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          billing_details?: Json | null
          created_at?: string | null
          currency?: string
          id?: string
          last_email_sent_at?: string | null
          last_email_status?: Json | null
          package_id?: string | null
          payment_method?:
            | Database["public"]["Enums"]["payment_method_type"]
            | null
          payment_proof_url?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "gig_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_templates: {
        Row: {
          id: string
          name: string
          subtree: Json
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          subtree: Json
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          subtree?: Json
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      page_versions: {
        Row: {
          id: string
          page_id: string
          sections: Json
          title: string
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          page_id: string
          sections: Json
          title: string
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          page_id?: string
          sections?: Json
          title?: string
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_versions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          id: string
          title: string
          slug: string
          status: string
          sections: Json
          draft_sections: Json | null
          published_at: string | null
          scheduled_publish_at: string | null
          seo_title: string | null
          seo_description: string | null
          og_image: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          slug: string
          status?: string
          sections?: Json
          draft_sections?: Json | null
          published_at?: string | null
          scheduled_publish_at?: string | null
          seo_title?: string | null
          seo_description?: string | null
          og_image?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          status?: string
          sections?: Json
          draft_sections?: Json | null
          published_at?: string | null
          scheduled_publish_at?: string | null
          seo_title?: string | null
          seo_description?: string | null
          og_image?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      partners: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          logo: string | null
          name: string
          partnership_type: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          logo?: string | null
          name: string
          partnership_type?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          logo?: string | null
          name?: string
          partnership_type?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          email: string
          email_notifications: boolean
          full_name: string | null
          id: string
          location: string | null
          phone: string | null
          professional_title: string | null
          social_links: Json | null
          updated_at: string | null
          website_settings: Json | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          email_notifications?: boolean
          full_name?: string | null
          id: string
          location?: string | null
          phone?: string | null
          professional_title?: string | null
          social_links?: Json | null
          updated_at?: string | null
          website_settings?: Json | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          email_notifications?: boolean
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          professional_title?: string | null
          social_links?: Json | null
          updated_at?: string | null
          website_settings?: Json | null
        }
        Relationships: []
      }
      project_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          category_id: string | null
          challenge: string | null
          client: string | null
          completion_date: string | null
          created_at: string | null
          description: string | null
          featured_image: string | null
          gallery: Json | null
          id: string
          implementation: string | null
          industry: string | null
          is_featured: boolean | null
          metrics: Json | null
          project_url: string | null
          results: string | null
          services_provided: Json | null
          slug: string
          solution: string | null
          status: string | null
          strategy: string | null
          technologies: Json | null
          timeline: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          challenge?: string | null
          client?: string | null
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          featured_image?: string | null
          gallery?: Json | null
          id?: string
          implementation?: string | null
          industry?: string | null
          is_featured?: boolean | null
          metrics?: Json | null
          project_url?: string | null
          results?: string | null
          services_provided?: Json | null
          slug: string
          solution?: string | null
          status?: string | null
          strategy?: string | null
          technologies?: Json | null
          timeline?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          challenge?: string | null
          client?: string | null
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          featured_image?: string | null
          gallery?: Json | null
          id?: string
          implementation?: string | null
          industry?: string | null
          is_featured?: boolean | null
          metrics?: Json | null
          project_url?: string | null
          results?: string | null
          services_provided?: Json | null
          slug?: string
          solution?: string | null
          status?: string | null
          strategy?: string | null
          technologies?: Json | null
          timeline?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      service_faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          display_order: number | null
          id: string
          is_published: boolean | null
          question: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          question: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_published?: boolean | null
          question?: string
        }
        Relationships: []
      }
      service_inquiries: {
        Row: {
          budget_range: string | null
          business_goals: string | null
          company_name: string | null
          competitor_references: string | null
          country: string | null
          created_at: string
          email: string
          existing_platform: string | null
          full_name: string
          id: string
          industry: string | null
          metadata: Json | null
          phone_whatsapp: string | null
          project_description: string | null
          project_title: string | null
          required_features: string | null
          selected_services: string[] | null
          status: string
          target_audience: string | null
          timeline: string | null
          website_url: string | null
        }
        Insert: {
          budget_range?: string | null
          business_goals?: string | null
          company_name?: string | null
          competitor_references?: string | null
          country?: string | null
          created_at?: string
          email: string
          existing_platform?: string | null
          full_name: string
          id?: string
          industry?: string | null
          metadata?: Json | null
          phone_whatsapp?: string | null
          project_description?: string | null
          project_title?: string | null
          required_features?: string | null
          selected_services?: string[] | null
          status?: string
          target_audience?: string | null
          timeline?: string | null
          website_url?: string | null
        }
        Update: {
          budget_range?: string | null
          business_goals?: string | null
          company_name?: string | null
          competitor_references?: string | null
          country?: string | null
          created_at?: string
          email?: string
          existing_platform?: string | null
          full_name?: string
          id?: string
          industry?: string | null
          metadata?: Json | null
          phone_whatsapp?: string | null
          project_description?: string | null
          project_title?: string | null
          required_features?: string | null
          selected_services?: string[] | null
          status?: string
          target_audience?: string | null
          timeline?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      service_packages_link: {
        Row: {
          display_order: number | null
          gig_id: string
          id: string
          service_id: string
        }
        Insert: {
          display_order?: number | null
          gig_id: string
          id?: string
          service_id: string
        }
        Update: {
          display_order?: number | null
          gig_id?: string
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_link_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_packages_link_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_quote_questions: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          is_required: boolean | null
          options: Json | null
          question_text: string
          question_type: string | null
          service_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          options?: Json | null
          question_text: string
          question_type?: string | null
          service_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_required?: boolean | null
          options?: Json | null
          question_text?: string
          question_type?: string | null
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_quote_questions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_quotes: {
        Row: {
          attachments: Json | null
          budget: string | null
          client_email: string
          client_name: string
          client_phone: string | null
          company_name: string | null
          country: string | null
          created_at: string | null
          custom_answers: Json | null
          id: string
          internal_notes: string | null
          project_description: string | null
          requirements: string | null
          service_id: string | null
          status: string | null
          timeline: string | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          attachments?: Json | null
          budget?: string | null
          client_email: string
          client_name: string
          client_phone?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          custom_answers?: Json | null
          id?: string
          internal_notes?: string | null
          project_description?: string | null
          requirements?: string | null
          service_id?: string | null
          status?: string | null
          timeline?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          attachments?: Json | null
          budget?: string | null
          client_email?: string
          client_name?: string
          client_phone?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string | null
          custom_answers?: Json | null
          id?: string
          internal_notes?: string | null
          project_description?: string | null
          requirements?: string | null
          service_id?: string | null
          status?: string | null
          timeline?: string | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_quotes_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          benefits: Json | null
          budget_options: Json | null
          category_id: string | null
          created_at: string | null
          delivery_time: string | null
          enable_quote_request: boolean | null
          featured_image: string | null
          features: Json | null
          full_description: string | null
          hero_image: string | null
          icon: string | null
          icon_image: string | null
          id: string
          is_featured: boolean | null
          keywords: Json | null
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          pricing_type: string | null
          process: Json | null
          short_description: string | null
          show_case_studies: boolean | null
          show_faq: boolean | null
          show_packages: boolean | null
          show_portfolio: boolean | null
          show_testimonials: boolean | null
          slug: string
          sort_order: number | null
          starting_price: number | null
          status: string | null
          technologies: Json | null
          timeline_options: Json | null
          title: string
          tools: Json | null
          updated_at: string | null
        }
        Insert: {
          benefits?: Json | null
          budget_options?: Json | null
          category_id?: string | null
          created_at?: string | null
          delivery_time?: string | null
          enable_quote_request?: boolean | null
          featured_image?: string | null
          features?: Json | null
          full_description?: string | null
          hero_image?: string | null
          icon?: string | null
          icon_image?: string | null
          id?: string
          is_featured?: boolean | null
          keywords?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          pricing_type?: string | null
          process?: Json | null
          short_description?: string | null
          show_case_studies?: boolean | null
          show_faq?: boolean | null
          show_packages?: boolean | null
          show_portfolio?: boolean | null
          show_testimonials?: boolean | null
          slug: string
          sort_order?: number | null
          starting_price?: number | null
          status?: string | null
          technologies?: Json | null
          timeline_options?: Json | null
          title: string
          tools?: Json | null
          updated_at?: string | null
        }
        Update: {
          benefits?: Json | null
          budget_options?: Json | null
          category_id?: string | null
          created_at?: string | null
          delivery_time?: string | null
          enable_quote_request?: boolean | null
          featured_image?: string | null
          features?: Json | null
          full_description?: string | null
          hero_image?: string | null
          icon?: string | null
          icon_image?: string | null
          id?: string
          is_featured?: boolean | null
          keywords?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          pricing_type?: string | null
          process?: Json | null
          short_description?: string | null
          show_case_studies?: boolean | null
          show_faq?: boolean | null
          show_packages?: boolean | null
          show_portfolio?: boolean | null
          show_testimonials?: boolean | null
          slug?: string
          sort_order?: number | null
          starting_price?: number | null
          status?: string | null
          technologies?: Json | null
          timeline_options?: Json | null
          title?: string
          tools?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_configuration: {
        Row: {
          category: string
          id: string
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          category: string
          id?: string
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          category?: string
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          company: string | null
          content: string
          created_at: string | null
          id: string
          name: string
          rating: number | null
          role: string | null
          source: string
          status: string
          user_id: string | null
        }
        Insert: {
          company?: string | null
          content: string
          created_at?: string | null
          id?: string
          name: string
          rating?: number | null
          role?: string | null
          source?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          company?: string | null
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          rating?: number | null
          role?: string | null
          source?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_email_verified: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      publish_pages: { Args: { page_ids: string[] }; Returns: undefined }
      run_scheduled_publishes: { Args: Record<PropertyKey, never>; Returns: undefined }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "editor" | "staff" | "user"
      payment_method_type: "stripe" | "bkash" | "bank_transfer" | "manual"
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
      app_role: ["super_admin", "admin", "editor", "staff", "user"],
      payment_method_type: ["stripe", "bkash", "bank_transfer", "manual"],
    },
  },
} as const
