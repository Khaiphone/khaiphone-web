type Props = { status: string }

export default function StatusBadge({ status }: Props) {
  let bg = ''
  let color = ''
  let label = ''

  switch (status) {
    case 'paid':
      bg = 'rgba(34,197,94,0.15)'
      color = '#22c55e'
      label = 'ชำระแล้ว'
      break
    case 'approved':
      bg = 'rgba(34,197,94,0.15)'
      color = '#22c55e'
      label = 'อนุมัติแล้ว'
      break
    case 'pending':
      bg = 'rgba(250,204,21,0.15)'
      color = '#facc15'
      label = 'รอยืนยัน'
      break
    case 'rejected':
      bg = 'rgba(239,68,68,0.15)'
      color = '#ef4444'
      label = 'ปฏิเสธแล้ว'
      break
    default:
      bg = 'rgba(255,255,255,0.08)'
      color = 'rgba(255,255,255,0.65)'
      label = status
  }

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 20,
        background: bg,
        color,
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}
