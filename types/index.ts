// types/index.ts
export interface UserShort {
  id: number
  name: string
  department?: string | null
  email?: string | null
  avatar?: string | null
}

export interface User {
  id: number
  name: string
  email: string
  role: string
  department?: string | null
  avatar?: string
  profile_photo_url?: string
  profile_photo?: string
  phone_number?: string
  location?: string
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  ticket_id: string
  subject: string
  description: string
  status: string
  priority: string
    titre?: string;

  category?: string
  created_at: string
  updated_at: string
  client: UserShort
  assigned_agent?: UserShort | null
  responses?: TicketResponse[]
}

export interface TicketResponse {
  id: number
  ticket_id: string
  user_id: number
  user: UserShort
  message: string
  created_at: string
}

export interface Attachment {
  id: number
  name: string
  path: string
  size: number
  mime_type: string
  attachable_type: string
  attachable_id: number
}

// Updated Payment interface to match Laravel model
export interface Payment {
  id: number
  user_id: number
  subscription_id?: number
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed'
  provider_payment_id?: string
  description?: string
  created_at: string
  updated_at: string
  user?: User
  subscription?: Subscription
}

// Keep Invoice for backward compatibility but Payment is the main model
export interface Invoice {
  id: number
  invoice_number?: string
  user_id: number
  subscription_id?: number
  amount: number
  status: string
  due_date?: string
  paid_at?: string
  created_at: string
  currency?: string
  description?: string
  items?: InvoiceItem[]
  payment_id?: number; // ✅ Ajouter cette ligne

}

export interface InvoiceItem {
  id: number
  invoice_id: number
  description: string
  amount: number
  quantity: number
}

export interface Subscription {
  id: number
  user_id: number
  subscription_plan_id: number
  plan?: SubscriptionPlan
  status: string
  current_period_start?: string
  current_period_end?: string
  current_period_ends_at?: string
  trial_ends_at?: string
  ends_at?: string
  tickets_used?: number
  created_at: string
  updated_at: string
}

export interface SubscriptionPlan {
  id: number
  name: string
  description: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: number
  type: 'direct' | 'group'
  name?: string
  participants: UserShort[]
  last_message?: ChatMessage
  created_at: string
  status: string
  priority?: string
}

export interface ChatMessage {
  id: number
  conversation_id: number
  user_id: number
  user: UserShort
  message: string
  attachments?: Attachment[]
  created_at: string
}

export interface FAQ {
  id: number
  question: string
  answer: string
  category: string
  is_active: boolean
  created_at: string
}