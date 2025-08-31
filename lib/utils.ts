
export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')

export const formatDate = (date?: string | null) => {
  if (!date) return ''
  try {
    return new Date(date).toLocaleString()
  } catch {
    return date
  }
}

export const getStatusColor = (status?: string) => {
  switch (status) {
    case 'open':
      return 'bg-red-500'
    case 'pending':
      return 'bg-yellow-500'
    case 'resolved':
      return 'bg-green-500'
    default:
      return 'bg-gray-500'
  }
}

export const getRoleColor = (role?: string) => {
  switch (role) {
    case 'admin':
      return 'text-red-500'
    case 'agent':
      return 'text-blue-500'
    default:
      return 'text-gray-500'
  }
}