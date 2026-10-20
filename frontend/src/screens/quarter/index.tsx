import { useQuery } from '@tanstack/react-query'
import type { components } from '@/api/generated'
import { http } from '@/api/http'
import { Button, ErrorNotice, Page, Panel, Skeleton } from '@/ui/kit'

type QuarterStanding = components['schemas']['QuarterStanding']

export function QuarterScreen() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['quarter'],
    queryFn: () => http.get<QuarterStanding>('/api/quarter'),
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

  const { pacing, targets } = data

  return (
    <Page>
      <div className="flex flex-col gap-6 p-4">
        <h1 className="text-2xl font-bold">Quarter Command Center</h1>

        <Panel className="p-4 bg-ink-inverse text-ink rounded-lg shadow">
          <div className="flex justify-between items-center border-b pb-2 mb-2">
            <h2 className="text-xl font-bold tracking-widest text-ink-subtle uppercase">Quarter</h2>
            <span className="text-lg font-mono font-bold">{data.label}</span>
          </div>
          <p className="text-sm font-mono">
            {data.start} → {data.end}
          </p>
        </Panel>

        <div className="grid grid-cols-2 gap-4">
          <Panel className="p-4 border rounded-lg">
            <h3 className="text-lg font-bold mb-2">CURRENT POSITION</h3>
            <div className="flex flex-col gap-2 font-mono">
              <div className="flex justify-between">
                <span>Signals</span> <span>{data.submitted}</span>
              </div>
              <div className="flex justify-between">
                <span>Pyramids</span> <span>{data.pyramidsFormulated}</span>
              </div>
            </div>
          </Panel>

          <Panel className="p-4 border rounded-lg">
            <h3 className="text-lg font-bold mb-2">TARGETS</h3>
            <div className="flex flex-col gap-2 font-mono text-sm">
              <div className="flex justify-between text-ink-subtle">
                <span>MINIMUM</span>{' '}
                <span>
                  {targets.minSignals} / {targets.minPyramids}
                </span>
              </div>
              <div className="flex justify-between font-bold">
                <span>PRIMARY</span>{' '}
                <span>
                  {targets.primarySignals} / {targets.primaryPyramids}
                </span>
              </div>
              <div className="flex justify-between text-ink-subtle">
                <span>STRETCH</span>{' '}
                <span>
                  {targets.stretchSignals} / {targets.stretchPyramids}
                </span>
              </div>
            </div>
          </Panel>
        </div>

        <Panel className="p-4 border rounded-lg">
          <h3 className="text-lg font-bold mb-2">PACE</h3>
          <div className="grid grid-cols-3 gap-4 font-mono text-sm">
            <div>
              <div className="font-bold border-b mb-1">Metric</div>
              <div>Signals/week</div>
              <div>Pyramids/week</div>
            </div>
            <div>
              <div className="font-bold border-b mb-1 text-center">Required</div>
              <div className="text-center">{pacing.requiredWeeklySignals}</div>
              <div className="text-center">{pacing.requiredWeeklyPyramids}</div>
            </div>
            <div>
              <div className="font-bold border-b mb-1 text-center">Actual</div>
              <div className="text-center">--</div>
              <div className="text-center">--</div>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t flex justify-between text-xs text-ink-subtle uppercase">
            <span>{pacing.daysElapsed} days elapsed</span>
            <span>
              {pacing.daysRemaining} days remaining ({pacing.completionPct}%)
            </span>
          </div>
        </Panel>

        <Panel className="p-4 border rounded-lg opacity-60">
          <h3 className="text-lg font-bold mb-2">PIPELINE (Upcoming)</h3>
          <p className="text-sm font-mono">
            Research targets, Candidates, Simulated, Passed, Ready, Submitted, Confirmed
          </p>
        </Panel>

        <Panel className="p-4 border rounded-lg opacity-60">
          <h3 className="text-lg font-bold mb-2">PYRAMID COVERAGE (Upcoming)</h3>
          <p className="text-sm font-mono">Completed, Near completion, In progress, Unstarted</p>
        </Panel>
      </div>
    </Page>
  )
}
