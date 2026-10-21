/**
 * Research Planner: Structured quantitative research hypotheses, target tracking,
 * and persistent research memory.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  DatabaseIcon,
  FlaskConicalIcon,
  LightbulbIcon,
  PlusIcon,
  RotateCcwIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { http } from '@/api/http'
import {
  Badge,
  Button,
  Empty,
  ErrorNotice,
  Field,
  Input,
  Page,
  PageHeader,
  Panel,
  Skeleton,
} from '@/ui/kit'
export function ResearchSessionsScreen() {
  const queryClient = useQueryClient()
  const [region, setRegion] = useState('USA')
  const [delay, setDelay] = useState('1')
  const [universe, setUniverse] = useState('TOP3000')
  const [datasetCategory, setDatasetCategory] = useState('')
  const [strategyType, setStrategyType] = useState('Mean Reversion')
  const [hypothesis, setHypothesis] = useState('')
  const {
    data: sessions,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['research-sessions'],
    queryFn: () => http.get('/api/planner/sessions'),
  })
  const mutation = useMutation({
    mutationFn: (newSession) =>
      http.post('/api/planner/sessions', {
        body: newSession,
      }),
    onSuccess: () => {
      toast.success('Research idea added to queue.')
      void queryClient.invalidateQueries({
        queryKey: ['research-sessions'],
      })
      setHypothesis('')
      setDatasetCategory('')
    },
    onError: (err) => {
      toast.error(`Failed to queue idea: ${err instanceof Error ? err.message : String(err)}`)
    },
  })
  const handleSubmit = (e) => {
    e.preventDefault()
    if (!hypothesis.trim()) {
      toast.error('Please enter a hypothesis description.')
      return
    }
    mutation.mutate({
      region,
      delay: parseInt(delay, 10),
      universe,
      dataset_category: datasetCategory || null,
      strategy_type: strategyType || null,
      hypothesis,
      status: 'IN_PROGRESS',
    })
  }
  return (
    <Page>
      <PageHeader
        title="Research Planner"
        description="Formulate structured quantitative research hypotheses, target specific market universes, and maintain systematic research memory."
        actions={
          <Button variant="ghost" onClick={() => refetch()}>
            <RotateCcwIcon /> Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ── Form: Queue New Idea ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-5">
          <Panel
            title="Queue Research Hypothesis"
            actions={<span className="text-caption text-ink-subtle">Session Generator</span>}
            bodyClassName="flex flex-col gap-4 p-4"
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Target Region">
                  <select
                    id="targetRegion"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="h-9 w-full rounded-md border border-hairline-strong bg-surface-2 px-3 text-body text-ink transition-colors focus:border-primary focus:outline-none"
                  >
                    <option value="USA">USA</option>
                    <option value="EUR">EUR</option>
                    <option value="ASN">ASN</option>
                    <option value="GLB">GLB</option>
                    <option value="CHN">CHN</option>
                  </select>
                </Field>

                <Field label="Delay">
                  <select
                    id="targetDelay"
                    value={delay}
                    onChange={(e) => setDelay(e.target.value)}
                    className="h-9 w-full rounded-md border border-hairline-strong bg-surface-2 px-3 text-body text-ink transition-colors focus:border-primary focus:outline-none"
                  >
                    <option value="1">Delay 1 (Close-to-Close)</option>
                    <option value="0">Delay 0 (Open-to-Close)</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Target Universe">
                  <select
                    id="targetUniverse"
                    value={universe}
                    onChange={(e) => setUniverse(e.target.value)}
                    className="h-9 w-full rounded-md border border-hairline-strong bg-surface-2 px-3 text-body text-ink transition-colors focus:border-primary focus:outline-none"
                  >
                    <option value="TOP3000">TOP3000</option>
                    <option value="TOP2000">TOP2000</option>
                    <option value="TOP1000">TOP1000</option>
                    <option value="TOP800">TOP800</option>
                    <option value="TOP500">TOP500</option>
                    <option value="TOP200">TOP200</option>
                  </select>
                </Field>

                <Field label="Strategy Family">
                  <select
                    id="strategyType"
                    value={strategyType}
                    onChange={(e) => setStrategyType(e.target.value)}
                    className="h-9 w-full rounded-md border border-hairline-strong bg-surface-2 px-3 text-body text-ink transition-colors focus:border-primary focus:outline-none"
                  >
                    <option value="Mean Reversion">Mean Reversion</option>
                    <option value="Momentum">Momentum</option>
                    <option value="Fundamental / Value">Fundamental / Value</option>
                    <option value="Quality & Profitability">Quality & Profitability</option>
                    <option value="Sentiment & News">Sentiment & News</option>
                    <option value="Analyst Revisions">Analyst Revisions</option>
                  </select>
                </Field>
              </div>

              <Field label="Target Datasets / Fields (Optional)">
                <Input
                  type="text"
                  placeholder="e.g. analyst_estimates, fundamental, short_interest"
                  value={datasetCategory}
                  onChange={(e) => setDatasetCategory(e.target.value)}
                />
              </Field>

              <Field label="Hypothesis & Mathematical Logic">
                <textarea
                  id="hypothesis"
                  placeholder="Describe the economic intuition and formula concept for this idea..."
                  value={hypothesis}
                  onChange={(e) => setHypothesis(e.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-hairline-strong bg-surface-2 p-3 text-body text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-y min-h-[90px]"
                />
              </Field>

              <Button type="submit" variant="primary" loading={mutation.isPending} className="mt-1">
                <PlusIcon />
                Queue Research Idea
              </Button>
            </form>
          </Panel>
        </div>

        {/* ── List: Research Memory & Backlog ─────────────────────────────────────── */}
        <div className="lg:col-span-7">
          <Panel
            title="Research Sessions Backlog"
            actions={
              sessions && sessions.length > 0 ? (
                <span className="num text-caption text-ink-subtle">{sessions.length} recorded</span>
              ) : undefined
            }
            bodyClassName="flex flex-col gap-3 p-4"
          >
            {isPending && (
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-28" />
                ))}
              </div>
            )}

            {isError && <ErrorNotice error={error} title="Could not load research sessions" />}

            {sessions && sessions.length === 0 && (
              <Empty icon={<LightbulbIcon />} title="No research hypotheses queued">
                Queue your first strategy idea to track hypothesis formulation and execution
                history.
              </Empty>
            )}

            {sessions?.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-2 rounded-lg border border-hairline bg-surface-2 p-3.5 transition-colors hover:border-hairline-strong"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-body font-semibold text-ink">
                      {s.region} D{s.delay} · {s.universe ?? 'ALL'}
                    </span>
                    <Badge tone="neutral">{s.strategyType ?? 'Strategy'}</Badge>
                  </div>
                  <Badge tone={s.status === 'COMPLETED' ? 'profit' : 'outline'}>{s.status}</Badge>
                </div>

                {s.datasetCategory && (
                  <div className="text-caption font-mono text-primary">
                    Datasets: {s.datasetCategory}
                  </div>
                )}

                <p className="text-body-compact text-ink-muted">
                  {s.hypothesis || (
                    <span className="italic text-ink-subtle">No description provided</span>
                  )}
                </p>

                <div className="mt-1 flex items-center gap-2 border-t border-hairline pt-2">
                  <Link
                    to="/data"
                    className="inline-flex items-center gap-1 text-caption text-ink-subtle hover:text-ink transition-colors"
                  >
                    <DatabaseIcon className="size-3" /> Explore Data
                  </Link>
                  <span className="text-hairline">·</span>
                  <Link
                    to="/labs/template"
                    className="inline-flex items-center gap-1 text-caption text-ink-subtle hover:text-ink transition-colors"
                  >
                    <FlaskConicalIcon className="size-3" /> Template Lab
                  </Link>
                </div>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </Page>
  )
}
