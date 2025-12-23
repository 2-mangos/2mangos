import { DashboardSkeleton } from '../../../components/Skeletons'

export default function Loading() {
  // O Next.js exibe este componente automaticamente enquanto o page.tsx carrega
  return <div className="p-8"><DashboardSkeleton /></div>
}