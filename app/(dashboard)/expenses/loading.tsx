import { TableSkeleton } from '../../../components/Skeletons'

export default function Loading() {
  return (
    <div className="p-8 pb-32">
      <div className="mx-auto max-w-6xl">
        <TableSkeleton />
      </div>
    </div>
  )
}