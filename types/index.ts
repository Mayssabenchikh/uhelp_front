export interface UserShort {
  id: number
  name: string
  department?: string | null
}

export interface Ticket {
  id: string
  ticket_id: string
  subject: string
  status: string
  priority: string
  category?: string
  created_at: string
  client: UserShort
  assigned_agent?: UserShort | null
}

