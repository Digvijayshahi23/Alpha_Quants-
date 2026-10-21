/**
 * Quarter Command Center: WorldQuant BRAIN quarterly progression, multi-tier targets,
 * pacing analytics, and formulation tracking.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  AwardIcon,
  CheckCircle2Icon,
  CompassIcon,
  ExternalLinkIcon,
  FlameIcon,
  LayersIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  TargetIcon,
  TrendingUpIcon,
  TriangleIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { components } from '@/api/generated'
import { http } from '@/api/http'
import { fmt } from '@/lib/format'
import {
  Button,
  ErrorNotice,
  Field,
  Input,
  Metric,
  Page,
  PageHeader,
  Panel,
  Progress,
  Skeleton,
} from '@/ui/kit'
import { Dialog } from '@/ui/overlay'

type QuarterStanding = components['schemas']['QuarterStanding']

export function QuarterScreen() {
  const [editing, setEditing] = useState(false)

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['quarter'],
    queryFn: () => http.get<QuarterStanding>('/api/quarter'),
  })

  if (isPending) {
    return (
      <Page>
        <PageHeader
          title="Quarter Command Center"
          description="WorldQuant BRAIN quarterly consultant progression, multi-tier targets, and pacing metrics."
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </Page>
    )
  }

  if (isError) {
    return (
      <Page>
        <PageHeader
          title="Quarter Command Center"
          description="WorldQuant BRAIN quarterly consultant progression, multi-tier targets, and pacing metrics."
        />
        <ErrorNotice error={error} title="Quarter data could not load" />
        <Button onClick={() => refetch()}>
          <RotateCcwIcon /> Retry
        </Button>
      </Page>
    )
  }

  if (!data) return null

  const { pacing, targets } = data

  const signalsPrimaryProgress =
    targets.primarySignals > 0 ? data.submitted / targets.primarySignals : 0
  const pyramidsPrimaryProgress =
    targets.primaryPyramids > 0 ? data.pyramidsFormulated / targets.primaryPyramids : 0

  return (
    <Page>
      <PageHeader
        title="Quarter Command Center"
        description={`WorldQuant BRAIN ${data.label} (${data.start} → ${data.end}): Progression, multi-tier pacing, and target run rates.`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <SlidersHorizontalIcon />
              Edit Targets
            </Button>
            <Button variant="ghost" onClick={() => refetch()}>
              <RotateCcwIcon />
              Refresh
            </Button>
          </div>
        }
      />

      {/* ── Key Metrics Bar ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric
          boxed
          label="Submitted Signals"
          value={fmt.int(data.submitted)}
          tone={data.submitted > 0 ? 'profit' : 'neutral'}
          hint={`Primary Target: ${targets.primarySignals}`}
        />
        <Metric
          boxed
          label="Formulated Pyramids"
          value={fmt.int(data.pyramidsFormulated)}
          tone={data.pyramidsFormulated > 0 ? 'profit' : 'neutral'}
          hint={`${data.pyramidsStarted} in progress (${data.alphasPerPyramid} per pyramid)`}
        />
        <Metric
          boxed
          label="Days Remaining"
          value={fmt.int(pacing.daysRemaining)}
          hint={`${pacing.daysElapsed} elapsed (${fmt.pct(pacing.completionPct / 100, 1)})`}
        />
        <Metric
          boxed
          label="Required Signals / Wk"
          value={fmt.ratio(pacing.requiredWeeklySignals, 1)}
          hint={`${fmt.ratio(pacing.requiredDailySignals, 1)} / day required`}
        />
        <Metric
          boxed
          label="Required Pyramids / Wk"
          value={fmt.ratio(pacing.requiredWeeklyPyramids, 1)}
          hint={`${fmt.ratio(pacing.requiredDailyPyramids, 1)} / day required`}
        />
        <Metric
          boxed
          label="Buffer Targets"
          value={`${pacing.bufferSignalsTarget} / ${pacing.bufferPyramidsTarget}`}
          hint={`+${Math.round((targets.bufferSignalsPct - 1) * 100)}% buffer target`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Target Progress Panel ────────────────────────────────────────────────── */}
        <Panel
          title="Progression Tiers"
          actions={<span className="text-caption text-ink-subtle">Quarter {data.label}</span>}
          bodyClassName="flex flex-col gap-5 p-4"
        >
          {/* Minimum Target Tier */}
          <div className="flex flex-col gap-2 rounded-md border border-hairline bg-surface-2 p-3">
            <div className="flex items-center justify-between text-body font-medium">
              <span className="flex items-center gap-2 text-ink">
                <CheckCircle2Icon className="size-4 text-pnl-positive" />
                Minimum Level (Expert)
              </span>
              <span className="num text-caption text-ink-muted">
                {targets.minSignals} Signals · {targets.minPyramids} Pyramids
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-caption text-ink-subtle">
                  <span>Signals</span>
                  <span className="num">
                    {data.submitted} / {targets.minSignals}
                  </span>
                </div>
                <Progress
                  value={
                    targets.minSignals > 0 ? Math.min(1, data.submitted / targets.minSignals) : 0
                  }
                  label="Minimum signals progress"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-caption text-ink-subtle">
                  <span>Pyramids</span>
                  <span className="num">
                    {data.pyramidsFormulated} / {targets.minPyramids}
                  </span>
                </div>
                <Progress
                  value={
                    targets.minPyramids > 0
                      ? Math.min(1, data.pyramidsFormulated / targets.minPyramids)
                      : 0
                  }
                  label="Minimum pyramids progress"
                />
              </div>
            </div>
          </div>

          {/* Primary Target Tier */}
          <div className="flex flex-col gap-2 rounded-md border border-hairline-strong bg-surface-2 p-3">
            <div className="flex items-center justify-between text-body font-medium">
              <span className="flex items-center gap-2 text-primary">
                <TargetIcon className="size-4" />
                Primary Target (Master)
              </span>
              <span className="num text-caption text-ink">
                {targets.primarySignals} Signals · {targets.primaryPyramids} Pyramids
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-caption text-ink-subtle">
                  <span>Signals</span>
                  <span className="num">
                    {data.submitted} / {targets.primarySignals}
                  </span>
                </div>
                <Progress
                  value={Math.min(1, signalsPrimaryProgress)}
                  label="Primary signals progress"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-caption text-ink-subtle">
                  <span>Pyramids</span>
                  <span className="num">
                    {data.pyramidsFormulated} / {targets.primaryPyramids}
                  </span>
                </div>
                <Progress
                  value={Math.min(1, pyramidsPrimaryProgress)}
                  label="Primary pyramids progress"
                />
              </div>
            </div>
          </div>

          {/* Stretch Target Tier */}
          <div className="flex flex-col gap-2 rounded-md border border-hairline bg-surface-2 p-3">
            <div className="flex items-center justify-between text-body font-medium">
              <span className="flex items-center gap-2 text-ink">
                <FlameIcon className="size-4 text-status-warning" />
                Stretch Target (Grandmaster)
              </span>
              <span className="num text-caption text-ink-muted">
                {targets.stretchSignals} Signals · {targets.stretchPyramids} Pyramids
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-caption text-ink-subtle">
                  <span>Signals</span>
                  <span className="num">
                    {data.submitted} / {targets.stretchSignals}
                  </span>
                </div>
                <Progress
                  value={
                    targets.stretchSignals > 0
                      ? Math.min(1, data.submitted / targets.stretchSignals)
                      : 0
                  }
                  label="Stretch signals progress"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-caption text-ink-subtle">
                  <span>Pyramids</span>
                  <span className="num">
                    {data.pyramidsFormulated} / {targets.stretchPyramids}
                  </span>
                </div>
                <Progress
                  value={
                    targets.stretchPyramids > 0
                      ? Math.min(1, data.pyramidsFormulated / targets.stretchPyramids)
                      : 0
                  }
                  label="Stretch pyramids progress"
                />
              </div>
            </div>
          </div>
        </Panel>

        {/* ── Pacing & Run Rates Panel ─────────────────────────────────────────────── */}
        <Panel title="Required Run Rates & Pacing" bodyClassName="flex flex-col gap-4 p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="border-b border-hairline text-caption font-medium text-ink-subtle">
                  <th className="pb-2">Metric</th>
                  <th className="pb-2 text-right">Current</th>
                  <th className="pb-2 text-right">Target</th>
                  <th className="pb-2 text-right">Remaining</th>
                  <th className="pb-2 text-right">Per Day</th>
                  <th className="pb-2 text-right">Per Week</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline font-mono text-body-compact">
                <tr>
                  <td className="py-2.5 font-sans font-medium text-ink flex items-center gap-1.5">
                    <AwardIcon className="size-3.5 text-primary" />
                    Signals (Primary)
                  </td>
                  <td className="py-2.5 text-right text-ink">{data.submitted}</td>
                  <td className="py-2.5 text-right text-ink-muted">{targets.primarySignals}</td>
                  <td className="py-2.5 text-right text-ink-subtle">{pacing.remainingSignals}</td>
                  <td className="py-2.5 text-right font-semibold text-primary">
                    {fmt.ratio(pacing.requiredDailySignals, 1)}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-primary">
                    {fmt.ratio(pacing.requiredWeeklySignals, 1)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-sans font-medium text-ink flex items-center gap-1.5">
                    <LayersIcon className="size-3.5 text-primary" />
                    Pyramids (Primary)
                  </td>
                  <td className="py-2.5 text-right text-ink">{data.pyramidsFormulated}</td>
                  <td className="py-2.5 text-right text-ink-muted">{targets.primaryPyramids}</td>
                  <td className="py-2.5 text-right text-ink-subtle">{pacing.remainingPyramids}</td>
                  <td className="py-2.5 text-right font-semibold text-primary">
                    {fmt.ratio(pacing.requiredDailyPyramids, 1)}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-primary">
                    {fmt.ratio(pacing.requiredWeeklyPyramids, 1)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-sans font-medium text-ink-muted flex items-center gap-1.5">
                    <TrendingUpIcon className="size-3.5 text-status-warning" />
                    Signals (Buffered)
                  </td>
                  <td className="py-2.5 text-right text-ink">{data.submitted}</td>
                  <td className="py-2.5 text-right text-ink-muted">{pacing.bufferSignalsTarget}</td>
                  <td className="py-2.5 text-right text-ink-subtle">
                    {Math.max(0, pacing.bufferSignalsTarget - data.submitted)}
                  </td>
                  <td className="py-2.5 text-right text-ink-muted">
                    {fmt.ratio(
                      pacing.daysRemaining > 0
                        ? (pacing.bufferSignalsTarget - data.submitted) / pacing.daysRemaining
                        : 0,
                      1,
                    )}
                  </td>
                  <td className="py-2.5 text-right text-ink-muted">
                    {fmt.ratio(
                      pacing.daysRemaining > 0
                        ? ((pacing.bufferSignalsTarget - data.submitted) / pacing.daysRemaining) * 7
                        : 0,
                      1,
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 font-sans font-medium text-ink-muted flex items-center gap-1.5">
                    <TrendingUpIcon className="size-3.5 text-status-warning" />
                    Pyramids (Buffered)
                  </td>
                  <td className="py-2.5 text-right text-ink">{data.pyramidsFormulated}</td>
                  <td className="py-2.5 text-right text-ink-muted">
                    {pacing.bufferPyramidsTarget}
                  </td>
                  <td className="py-2.5 text-right text-ink-subtle">
                    {Math.max(0, pacing.bufferPyramidsTarget - data.pyramidsFormulated)}
                  </td>
                  <td className="py-2.5 text-right text-ink-muted">
                    {fmt.ratio(
                      pacing.daysRemaining > 0
                        ? (pacing.bufferPyramidsTarget - data.pyramidsFormulated) /
                            pacing.daysRemaining
                        : 0,
                      1,
                    )}
                  </td>
                  <td className="py-2.5 text-right text-ink-muted">
                    {fmt.ratio(
                      pacing.daysRemaining > 0
                        ? ((pacing.bufferPyramidsTarget - data.pyramidsFormulated) /
                            pacing.daysRemaining) *
                            7
                        : 0,
                      1,
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-auto flex flex-col gap-2 rounded-md border border-hairline bg-surface-2 p-3 text-caption text-ink-muted">
            <span className="font-medium text-ink">Evaluation Cadence</span>
            <p>
              WorldQuant BRAIN evaluates consultant levels at the end of each quarter based on
              verified submissions and formulated pyramids. Pacing figures automatically recalculate
              daily.
            </p>
          </div>
        </Panel>
      </div>

      {/* ── Direct Workstation Navigation ────────────────────────────────────────── */}
      <Panel
        title="Research Workstation Tools"
        bodyClassName="grid grid-cols-1 md:grid-cols-3 gap-3 p-4"
      >
        <Link
          to="/pyramids"
          className="group flex flex-col justify-between gap-3 rounded-lg border border-hairline bg-surface-2 p-4 transition-colors hover:border-hairline-strong hover:bg-surface-3"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-title font-medium text-ink">
              <TriangleIcon className="size-4 text-primary" />
              Pyramid Multipliers
            </span>
            <ExternalLinkIcon className="size-3.5 text-ink-subtle transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="text-body-compact text-ink-subtle">
            Inspect BRAIN Pyramid Multipliers across every Region · Delay · Dataset Category, with
            live submission counts.
          </p>
        </Link>

        <Link
          to="/research-sessions"
          className="group flex flex-col justify-between gap-3 rounded-lg border border-hairline bg-surface-2 p-4 transition-colors hover:border-hairline-strong hover:bg-surface-3"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-title font-medium text-ink">
              <CompassIcon className="size-4 text-primary" />
              Research Planner
            </span>
            <ExternalLinkIcon className="size-3.5 text-ink-subtle transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="text-body-compact text-ink-subtle">
            Formulate hypotheses, target high-multiplier gaps, and maintain structured quantitative
            research sessions.
          </p>
        </Link>

        <Link
          to="/tasks"
          search={{ view: 'submittable' }}
          className="group flex flex-col justify-between gap-3 rounded-lg border border-hairline bg-surface-2 p-4 transition-colors hover:border-hairline-strong hover:bg-surface-3"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-title font-medium text-ink">
              <AwardIcon className="size-4 text-primary" />
              Submittable Alphas
            </span>
            <ExternalLinkIcon className="size-3.5 text-ink-subtle transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="text-body-compact text-ink-subtle">
            Explore verified submission-ready alphas, test Sharpe ratios, and production
            correlations across all markets.
          </p>
        </Link>
      </Panel>

      {/* ── Edit Targets Dialog ─────────────────────────────────────────────────── */}
      {editing && (
        <EditTargetsDialog
          open={editing}
          onClose={() => setEditing(false)}
          targets={targets}
          year={parseInt(data.label.split('-Q')[0] ?? '2026', 10)}
          quarter={parseInt(data.label.split('-Q')[1] ?? '4', 10)}
          startDate={data.start}
          endDate={data.end}
        />
      )}
    </Page>
  )
}

function EditTargetsDialog({
  open,
  onClose,
  targets,
  year,
  quarter,
  startDate,
  endDate,
}: {
  open: boolean
  onClose: () => void
  targets: components['schemas']['QuarterTargets']
  year: number
  quarter: number
  startDate: string
  endDate: string
}) {
  const queryClient = useQueryClient()
  const [minSignals, setMinSignals] = useState(String(targets.minSignals))
  const [minPyramids, setMinPyramids] = useState(String(targets.minPyramids))
  const [primarySignals, setPrimarySignals] = useState(String(targets.primarySignals))
  const [primaryPyramids, setPrimaryPyramids] = useState(String(targets.primaryPyramids))
  const [stretchSignals, setStretchSignals] = useState(String(targets.stretchSignals))
  const [stretchPyramids, setStretchPyramids] = useState(String(targets.stretchPyramids))
  const [bufferPct, setBufferPct] = useState(
    String(Math.round((targets.bufferSignalsPct - 1) * 100)),
  )

  const mutation = useMutation({
    mutationFn: async () => {
      const buffer = 1 + (parseFloat(bufferPct) || 10) / 100
      await http.put('/api/quarter/config', {
        body: {
          year,
          quarter,
          start_date: startDate,
          end_date: endDate,
          min_signals: parseInt(minSignals, 10) || 20,
          min_pyramids: parseInt(minPyramids, 10) || 10,
          primary_signals: parseInt(primarySignals, 10) || 120,
          primary_pyramids: parseInt(primaryPyramids, 10) || 30,
          stretch_signals: parseInt(stretchSignals, 10) || 220,
          stretch_pyramids: parseInt(stretchPyramids, 10) || 60,
          buffer_signals_pct: buffer,
          buffer_pyramids_pct: buffer,
        },
      })
    },
    onSuccess: () => {
      toast.success('Quarterly targets updated successfully.')
      void queryClient.invalidateQueries({ queryKey: ['quarter'] })
      onClose()
    },
    onError: (err) => {
      toast.error(`Failed to update targets: ${err instanceof Error ? err.message : String(err)}`)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      title="Configure Quarter Targets"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
        className="flex flex-col gap-4 p-4 text-body"
      >
        <p className="text-body-compact text-ink-subtle">
          Configure progression milestones and run-rate pacing calculations for this quarter.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Minimum Signals (Expert)">
            <Input
              type="number"
              value={minSignals}
              onChange={(e) => setMinSignals(e.target.value)}
            />
          </Field>
          <Field label="Minimum Pyramids">
            <Input
              type="number"
              value={minPyramids}
              onChange={(e) => setMinPyramids(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Primary Signals (Master)">
            <Input
              type="number"
              value={primarySignals}
              onChange={(e) => setPrimarySignals(e.target.value)}
            />
          </Field>
          <Field label="Primary Pyramids">
            <Input
              type="number"
              value={primaryPyramids}
              onChange={(e) => setPrimaryPyramids(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Stretch Signals (Grandmaster)">
            <Input
              type="number"
              value={stretchSignals}
              onChange={(e) => setStretchSignals(e.target.value)}
            />
          </Field>
          <Field label="Stretch Pyramids">
            <Input
              type="number"
              value={stretchPyramids}
              onChange={(e) => setStretchPyramids(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Internal Safety Buffer (%)">
          <Input
            type="number"
            min={0}
            max={100}
            value={bufferPct}
            onChange={(e) => setBufferPct(e.target.value)}
          />
        </Field>

        <div className="mt-3 flex justify-end gap-2 border-t border-hairline pt-3">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={mutation.isPending}>
            Save Targets
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
