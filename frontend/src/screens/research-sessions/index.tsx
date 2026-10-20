import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type React from 'react'
import { useState } from 'react'
import type { components } from '@/api/generated'
import { http } from '@/api/http'
import { Button, ErrorNotice, Page, Panel, Skeleton } from '@/ui/kit'

type SessionOut = components['schemas']['SessionOut']
type SessionIn = components['schemas']['SessionIn']

export function ResearchSessionsScreen() {
  const queryClient = useQueryClient()
  const [region, setRegion] = useState('USA')
  const [delay, setDelay] = useState('1')
  const [datasetCategory, setDatasetCategory] = useState('')
  const [strategyType, setStrategyType] = useState('')
  const [hypothesis, setHypothesis] = useState('')

  const {
    data: sessions,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['research-sessions'],
    queryFn: () => http.get<SessionOut[]>('/api/planner/sessions'),
  })

  const mutation = useMutation({
    mutationFn: (newSession: SessionIn) =>
      http.post<SessionOut>('/api/planner/sessions', { body: newSession }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['research-sessions'] })
      setHypothesis('')
      setDatasetCategory('')
      setStrategyType('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      region,
      delay: parseInt(delay, 10),
      dataset_category: datasetCategory,
      strategy_type: strategyType,
      hypothesis,
      status: 'IN_PROGRESS',
    })
  }

  return (
    <Page>
      <h1 className="text-2xl font-bold mb-6">Research Planner</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Panel title="Queue New Idea" className="mb-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="targetRegion" className="text-sm font-medium">
                  Target Region
                </label>
                <select
                  id="targetRegion"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
                >
                  <option value="USA">USA</option>
                  <option value="EUR">EUR</option>
                  <option value="ASN">ASN</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="targetDelay" className="text-sm font-medium">
                  Target Delay
                </label>
                <select
                  id="targetDelay"
                  value={delay}
                  onChange={(e) => setDelay(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
                >
                  <option value="1">Delay 1 (Close-to-Close)</option>
                  <option value="0">Delay 0 (Open-to-Close)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="strategyType" className="text-sm font-medium">
                  Strategy Type
                </label>
                <input
                  id="strategyType"
                  type="text"
                  placeholder="e.g. Mean Reversion, Momentum"
                  value={strategyType}
                  onChange={(e) => setStrategyType(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="datasetCategory" className="text-sm font-medium">
                  Datasets
                </label>
                <input
                  id="datasetCategory"
                  type="text"
                  placeholder="e.g. Fundamental + Price Volume"
                  value={datasetCategory}
                  onChange={(e) => setDatasetCategory(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="hypothesis" className="text-sm font-medium">
                  Hypothesis / Theory
                </label>
                <textarea
                  id="hypothesis"
                  placeholder="Describe the logic behind this alpha idea..."
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 min-h-[100px]"
                />
              </div>

              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Queuing...' : 'Queue Research Idea'}
              </Button>

              {mutation.isError && <ErrorNotice error={mutation.error} />}
            </form>
          </Panel>
        </div>

        <div>
          <h2 className="text-xl font-bold">Backlog</h2>
          {isPending && <Skeleton className="h-64 w-full mt-4" />}
          {isError && <ErrorNotice error={error} />}

          <div className="flex flex-col gap-4 mt-4">
            {sessions?.length === 0 && (
              <div className="text-zinc-500 italic">No research ideas queued.</div>
            )}

            {sessions?.map((session) => (
              <Panel key={session.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-sm text-zinc-400">
                    <span className="font-bold text-zinc-200">
                      {session.region} D{session.delay}
                    </span>{' '}
                    • {session.strategyType || 'Unknown Strategy'}
                  </div>
                  <div className="text-xs bg-zinc-800 px-2 py-1 rounded text-zinc-300">
                    {session.status}
                  </div>
                </div>

                {session.datasetCategory && (
                  <div className="text-xs text-blue-400 mb-3">[{session.datasetCategory}]</div>
                )}

                <p className="text-sm text-zinc-300">
                  {session.hypothesis || (
                    <span className="italic text-zinc-600">No hypothesis provided</span>
                  )}
                </p>
              </Panel>
            ))}
          </div>
        </div>
      </div>
    </Page>
  )
}
