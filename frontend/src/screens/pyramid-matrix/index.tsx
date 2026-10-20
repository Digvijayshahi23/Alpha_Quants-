import { useQuery } from '@tanstack/react-query'
import type { components } from '@/api/generated'
import { http } from '@/api/http'
import { Button, ErrorNotice, Page, Panel, Skeleton } from '@/ui/kit'

type PyramidMatrixCell = components['schemas']['PyramidMatrixCell']

export function PyramidMatrixScreen() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['quarter-matrix'],
    queryFn: () => http.get<PyramidMatrixCell[]>('/api/quarter/matrix'),
  })

  if (isPending)
    return (
      <Page>
        <Skeleton className="h-32 w-full" />
      </Page>
    )
  if (isError)
    return (
      <Page>
        <ErrorNotice error={error} />
        <Button onClick={() => refetch()}>Retry</Button>
      </Page>
    )
  if (!data)
    return (
      <Page>
        <ErrorNotice error={new Error('No data returned')} />
      </Page>
    )

  return (
    <Page>
      <div className="flex flex-col gap-6 p-4">
        <h1 className="text-2xl font-bold">Pyramid Matrix</h1>
        <p className="text-ink-subtle">Real qualifying state based on Region + Delay + Category.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((cell, idx) => (
            <Panel
              key={idx}
              className={`p-4 border rounded-lg ${cell.status === 'COMPLETED' ? 'border-profit' : cell.status === 'IN_PROGRESS' ? 'border-warn' : 'border-ink-subtle'}`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-lg">{cell.region}</span>
                <span className="text-xs uppercase px-2 py-1 bg-ink-inverse rounded font-mono">
                  {cell.status}
                </span>
              </div>
              <div className="flex justify-between text-sm font-mono mb-1">
                <span className="text-ink-subtle">Delay</span>
                <span>{cell.delay}</span>
              </div>
              <div className="flex justify-between text-sm font-mono mb-3">
                <span className="text-ink-subtle">Category</span>
                <span className="text-right truncate max-w-[150px]">{cell.category}</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t pt-2">
                <span>Alphas</span>
                <span>{cell.alphaCount} / 3</span>
              </div>

              {/* Interactive buttons as requested in Phase 33 */}
              <div className="mt-4 flex gap-2">
                <Button className="w-full text-xs">Research</Button>
                <Button className="w-full text-xs" variant="ghost">
                  View Alphas
                </Button>
              </div>
            </Panel>
          ))}
          {data.length === 0 && (
            <div className="col-span-full p-8 text-center text-ink-subtle border border-dashed rounded-lg">
              No pyramids started yet this quarter.
            </div>
          )}
        </div>
      </div>
    </Page>
  )
}
