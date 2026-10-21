/**
 * Alpha Details Drawer: Comprehensive inspection panel for quantitative alphas,
 * simulation configurations, performance metrics, validation checks, and explicit submission.
 */

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
  SendIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  XCircleIcon,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { fmt } from '@/lib/format'
import { labTasks } from '@/screens/tasks/api'
import { Badge, Button, KV, Metric, Notice, signTone } from '@/ui/kit'
import { Confirm, Sheet } from '@/ui/overlay'
export function AlphaDetailDrawer({ alpha, onClose, onAlphaSubmitted }) {
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  if (!alpha) return null
  const handleCopy = (text, label) => {
    void navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await labTasks.submitAlpha(alpha.alphaId)
      toast.success(res.message || `Alpha ${alpha.alphaId} submitted successfully!`, {
        action: {
          label: 'Open on BRAIN',
          onClick: () => window.open(res.brainUrl, '_blank', 'noopener,noreferrer'),
        },
      })
      setConfirmOpen(false)
      onAlphaSubmitted?.()
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submission failed.'
      toast.error('Submission failed', {
        description: msg,
      })
    } finally {
      setSubmitting(false)
    }
  }
  const isEligible = alpha.submittable && alpha.submissionStatus === 'UNSUBMITTED'
  const isAlreadySubmitted = alpha.submissionStatus !== 'UNSUBMITTED'
  return (
    <>
      <Sheet
        open={Boolean(alpha)}
        onOpenChange={(open) => !open && onClose()}
        title={
          <div className="flex items-center gap-2">
            <span className="num font-semibold text-ink">{alpha.alphaId}</span>
            <span className="text-caption text-ink-subtle">·</span>
            <Badge tone="neutral">{alpha.region}</Badge>
            <Badge tone="outline">D{alpha.delay}</Badge>
          </div>
        }
      >
        <div className="flex flex-col gap-5 pb-6">
          {/* Submission Eligibility Banner */}
          {isAlreadySubmitted ? (
            <Notice tone="info" title="Already Submitted to WorldQuant BRAIN">
              This alpha is currently active or submitted on the platform
              {alpha.dateSubmitted ? ` (Date: ${alpha.dateSubmitted.slice(0, 10)})` : ''}.
            </Notice>
          ) : isEligible ? (
            <div className="flex items-center justify-between rounded-md border border-pnl-positive/30 bg-pnl-positive/10 p-3.5">
              <div className="flex items-center gap-2.5">
                <ShieldCheckIcon className="size-5 shrink-0 text-pnl-positive" />
                <div>
                  <h4 className="text-body font-medium text-pnl-positive">
                    Eligible for Submission
                  </h4>
                  <p className="text-caption text-ink-muted">
                    Cleared all platform validation gates with zero refusing checks.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="primary" onClick={() => setConfirmOpen(true)}>
                <SendIcon />
                Submit Alpha
              </Button>
            </div>
          ) : alpha.validationStatus === 'pending' ? (
            <Notice tone="warn" title="Validation Checks Pending">
              Some platform checks are still pending resolution (e.g. self-correlation or ladder
              Sharpe).
            </Notice>
          ) : (
            <div className="flex flex-col gap-1.5 rounded-md border border-pnl-negative/30 bg-pnl-negative/10 p-3.5">
              <div className="flex items-center gap-2">
                <ShieldAlertIcon className="size-5 shrink-0 text-pnl-negative" />
                <h4 className="text-body font-medium text-pnl-negative">
                  Checks Refused ({alpha.refusedBy.length || alpha.failedChecks.length})
                </h4>
              </div>
              <p className="text-caption text-ink-muted">
                Failed gate checks:{' '}
                <span className="num font-mono text-ink">
                  {(alpha.refusedBy.length ? alpha.refusedBy : alpha.failedChecks).join(', ')}
                </span>
              </p>
            </div>
          )}

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleCopy(alpha.expression ?? '', 'Expression')}
            >
              <CopyIcon />
              Copy Expression
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleCopy(alpha.alphaId, 'Alpha ID')}
            >
              <CopyIcon />
              Copy ID
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(alpha.brainUrl, '_blank', 'noopener,noreferrer')}
            >
              <ExternalLinkIcon />
              Open on BRAIN
            </Button>
          </div>

          {/* Full Expression Code Box */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-caption font-medium uppercase tracking-wider text-ink-subtle">
                Alpha Expression
              </span>
              <button
                type="button"
                onClick={() => handleCopy(alpha.expression ?? '', 'Expression')}
                className="text-caption text-primary hover:underline"
              >
                Copy
              </button>
            </div>
            <pre className="overflow-x-auto rounded-md border border-hairline bg-surface-2 p-3 font-mono text-body-compact text-ink leading-relaxed break-all select-all">
              {alpha.expression ?? 'No expression recorded.'}
            </pre>
          </div>

          {/* Quantitative Performance Metrics */}
          <div className="flex flex-col gap-2">
            <span className="text-caption font-medium uppercase tracking-wider text-ink-subtle">
              Simulation Performance
            </span>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Metric
                boxed
                label="Sharpe"
                value={fmt.ratio(alpha.sharpe)}
                tone={alpha.sharpe != null ? signTone(alpha.sharpe) : 'neutral'}
              />
              <Metric
                boxed
                label="Fitness"
                value={fmt.ratio(alpha.fitness)}
                tone={alpha.fitness != null && alpha.fitness >= 1 ? 'profit' : 'neutral'}
              />
              <Metric
                boxed
                label="Returns"
                value={fmt.pct(alpha.returns)}
                tone={alpha.returns != null ? signTone(alpha.returns) : 'neutral'}
              />
              <Metric
                boxed
                label="Turnover"
                value={fmt.pct(alpha.turnover)}
                tone={alpha.turnover != null && alpha.turnover > 0.7 ? 'loss' : 'neutral'}
              />
              <Metric
                boxed
                label="Drawdown"
                value={fmt.pct(alpha.drawdown)}
                tone={alpha.drawdown != null && alpha.drawdown > 0.3 ? 'loss' : 'neutral'}
              />
              <Metric
                boxed
                label="Margin"
                value={alpha.margin != null ? fmt.ratio(alpha.margin, 4) : '—'}
              />
              <Metric
                boxed
                label="After-Cost Sharpe"
                value={fmt.ratio(alpha.afterCostSharpe)}
                tone={alpha.afterCostSharpe != null ? signTone(alpha.afterCostSharpe) : 'muted'}
              />
              <Metric
                boxed
                label="Long / Short"
                value={`${alpha.longCount ?? '—'} / ${alpha.shortCount ?? '—'}`}
              />
            </div>
          </div>

          {/* Simulation Configuration */}
          <div className="flex flex-col gap-2">
            <span className="text-caption font-medium uppercase tracking-wider text-ink-subtle">
              Configuration & Settings
            </span>
            <div className="rounded-md border border-hairline bg-surface-2 p-3">
              <KV
                items={[
                  ['Region', alpha.region],
                  ['Universe', alpha.universe],
                  ['Delay', `D${alpha.delay}`],
                  ['Neutralization', alpha.neutralization],
                  ['Dataset', alpha.datasetId ?? '—'],
                  ['Category', alpha.category ?? '—'],
                  ['Submission Status', alpha.submissionStatus],
                  [
                    'Created',
                    alpha.dateCreated ? alpha.dateCreated.slice(0, 19).replace('T', ' ') : '—',
                  ],
                ]}
              />
            </div>
          </div>

          {/* Validation Checks Breakdown Table */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-caption font-medium uppercase tracking-wider text-ink-subtle">
                Validation & Gate Checks ({alpha.checks.length})
              </span>
              <span className="text-caption text-ink-subtle">
                {alpha.failedChecks.length > 0 ? (
                  <span className="text-pnl-negative font-medium">
                    {alpha.failedChecks.length} failed
                  </span>
                ) : (
                  <span className="text-pnl-positive font-medium">All checks passed</span>
                )}
              </span>
            </div>

            {alpha.checks.length === 0 ? (
              <div className="rounded-md border border-hairline bg-surface-2 p-4 text-center text-body text-ink-subtle">
                No individual gate check breakdown recorded for this trial.
              </div>
            ) : (
              <div className="overflow-hidden rounded-md border border-hairline">
                <table className="w-full text-left text-body-compact">
                  <thead className="border-b border-hairline bg-surface-3 text-caption font-medium text-ink-subtle">
                    <tr>
                      <th className="px-3 py-2">Check Name</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Value</th>
                      <th className="px-3 py-2 text-right">Threshold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline bg-surface-2">
                    {alpha.checks.map((chk, i) => {
                      const res = String(chk.result ?? '').toUpperCase()
                      const isPass = res === 'PASS'
                      const isWarn = res === 'WARNING'
                      const isFail = res === 'FAIL' || res === 'ERROR'
                      const tone = isPass ? 'profit' : isWarn ? 'warn' : isFail ? 'loss' : 'neutral'
                      return (
                        <tr key={chk.name || i} className="hover:bg-surface-3/50">
                          <td className="px-3 py-2 font-mono text-ink">
                            <div className="flex items-center gap-1.5">
                              {isPass && (
                                <CheckCircle2Icon className="size-3.5 text-pnl-positive" />
                              )}
                              {isWarn && (
                                <AlertTriangleIcon className="size-3.5 text-status-warning" />
                              )}
                              {isFail && <XCircleIcon className="size-3.5 text-pnl-negative" />}
                              <span>{chk.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <Badge tone={tone}>{chk.result}</Badge>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-ink-muted">
                            {chk.value != null
                              ? typeof chk.value === 'number'
                                ? fmt.ratio(chk.value)
                                : String(chk.value)
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-ink-subtle">
                            {chk.limit != null
                              ? typeof chk.limit === 'number'
                                ? fmt.ratio(chk.limit)
                                : String(chk.limit)
                              : chk.threshold != null
                                ? String(chk.threshold)
                                : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Sheet>

      {/* Explicit Submission Confirmation Modal */}
      <Confirm
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Submit Alpha to WorldQuant BRAIN"
        confirmLabel="Confirm & Submit"
        pending={submitting}
        onConfirm={() => void handleSubmit()}
      >
        <div className="flex flex-col gap-3">
          <p className="text-body text-ink">
            Are you sure you want to submit Alpha{' '}
            <strong className="font-mono text-primary">{alpha.alphaId}</strong> to WorldQuant BRAIN?
          </p>
          <div className="rounded-md border border-hairline bg-surface-2 p-3 text-body-compact">
            <div className="grid grid-cols-2 gap-y-1 text-ink-muted">
              <span>Region:</span> <span className="font-medium text-ink">{alpha.region}</span>
              <span>Universe:</span> <span className="font-medium text-ink">{alpha.universe}</span>
              <span>Delay:</span> <span className="font-medium text-ink">D{alpha.delay}</span>
              <span>Sharpe:</span>{' '}
              <span className="font-medium text-pnl-positive">{fmt.ratio(alpha.sharpe)}</span>
              <span>Fitness:</span>{' '}
              <span className="font-medium text-ink">{fmt.ratio(alpha.fitness)}</span>
            </div>
          </div>
          <Notice tone="warn" title="Permanent Platform Action">
            Submitting is irreversible and consumes your WorldQuant BRAIN submission quota.
          </Notice>
        </div>
      </Confirm>
    </>
  )
}
