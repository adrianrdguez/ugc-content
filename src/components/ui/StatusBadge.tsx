import { Badge } from '@shopify/polaris'

interface StatusBadgeProps {
  status: 'pending' | 'processing' | 'approved' | 'rejected'
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    pending: { tone: 'warning' as const, text: 'Pending Review' },
    processing: { tone: 'info' as const, text: 'Processing' },
    approved: { tone: 'success' as const, text: 'Approved' },
    rejected: { tone: 'critical' as const, text: 'Rejected' },
  }
  
  const config = statusConfig[status] || { tone: 'info' as const, text: status }
  
  return <Badge tone={config.tone}>{config.text}</Badge>
}