/**
 * Advanced Quantitative Alpha Discovery & Submission Dashboard.
 *
 * Provides comprehensive, region-wise discovery across all supported WorldQuant BRAIN
 * markets, multidimensional dataset filtering, high-performing alpha ranking,
 * inspection of validation gate checks, and explicit submission workflows.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SearchIcon,
  SendIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/format'
import { useRefetchOn } from '@/lib/ws'
import { AlphaDetailDrawer } from '@/screens/tasks/alpha-detail-drawer'
import { type DiscoveryAlpha, type DiscoveryParams, labTasks } from '@/screens/tasks/api'
import {
  Badge,
  Button,
  Empty,
  ErrorNotice,
  Input,
  Metric,
  Panel,
  Skeleton,
  signTone,
  TEXT_TONE,
} from '@/ui/kit'
import { Confirm } from '@/ui/overlay'

const UNIVERSES = [
  'ALL',
  'TOP3000',
  'TOP2000',
  'TOP1000',
  'TOP800',
  'TOP600',
  'TOP500',
  'TOP400',
  'TOP200',
]
const NEUTRALIZATIONS = ['ALL', 'NONE', 'INDUSTRY', 'SUBINDUSTRY', 'SECTOR', 'MARKET', 'CROWDING']

export function SubmittableAlphas({
  onOpenAlpha,
}: {
  onOpenAlpha?: (alphaId: string) => void
} = {}) {
  const queryClient = useQueryClient()

  // State: Filter Toolbar
  const [selectedRegion, setSelectedRegion] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('region') || 'ALL'
    }
    return 'ALL'
  })
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('status') || 'all'
    }
    return 'all'
  })
  const [selectedDataset, setSelectedDataset] = useState<string>('')
  const [selectedUniverse, setSelectedUniverse] = useState<string>('ALL')
  const [selectedNeutralization, setSelectedNeutralization] = useState<string>('ALL')
  const [selectedDelay, setSelectedDelay] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // State: Ranking & Sorting
  const [sortBy, setSortBy] = useState<string>('sharpe')
  const [sortDesc, setSortDesc] = useState<boolean>(true)

  // State: Pagination
  const [page, setPage] = useState<number>(0)
  const [pageSize, setPageSize] = useState<number>(50)

  // State: Drawer & Submission Modal
  const [inspectedAlpha, setInspectedAlpha] = useState<DiscoveryAlpha | null>(null)
  const [submittingAlpha, setSubmittingAlpha] = useState<DiscoveryAlpha | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Construct query parameters
  const queryParams: DiscoveryParams = useMemo(() => {
    return {
      region: selectedRegion !== 'ALL' ? selectedRegion : undefined,
      dataset_id: selectedDataset ? selectedDataset : undefined,
      delay: selectedDelay === 'D1' ? 1 : selectedDelay === 'D0' ? 0 : undefined,
      universe: selectedUniverse !== 'ALL' ? selectedUniverse : undefined,
      neutralization: selectedNeutralization !== 'ALL' ? selectedNeutralization : undefined,
      status: statusFilter,
      search: searchQuery.trim() || undefined,
      sort_by: sortBy,
      sort_desc: sortDesc,
      limit: pageSize,
      offset: page * pageSize,
    }
  }, [
    selectedRegion,
    selectedDataset,
    selectedDelay,
    selectedUniverse,
    selectedNeutralization,
    statusFilter,
    searchQuery,
    sortBy,
    sortDesc,
    page,
    pageSize,
  ])

  // Fetch quantitative discovery data
  const discovery = useQuery({
    queryKey: ['alpha-discovery', queryParams],
    queryFn: () => labTasks.discovery(queryParams),
    staleTime: 10_000,
  })

  // Live WebSocket updates on study or simulation changes
  useRefetchOn('studies', ['alpha-discovery'], 20_000)
  useRefetchOn('simulations', ['alpha-discovery'], 30_000)

  const summary = discovery.data?.summary
  const alphas = discovery.data?.alphas ?? []
  const totalCount = discovery.data?.total ?? 0
  const totalPages = Math.ceil(totalCount / pageSize)

  // Auto-open drawer if ?inspect= is in URL
  useEffect(() => {
    if (typeof window !== 'undefined' && alphas.length > 0) {
      const inspectId = new URLSearchParams(window.location.search).get('inspect')
      if (inspectId) {
        const found =
          inspectId === 'first' ? alphas[0] : alphas.find((a) => a.alphaId === inspectId)
        if (found) setInspectedAlpha(found)
      }
    }
  }, [alphas])

  // Region metrics for selected region
  const activeRegionMetric = useMemo(() => {
    if (!summary) return null
    if (selectedRegion === 'ALL') {
      return {
        region: 'ALL',
        evaluated: summary.simulationsCompleted,
        submittable: summary.submittableAlphas,
        highPerforming: summary.highPerformingAlphas,
        bestSharpe: Math.max(...summary.regionMetrics.map((r) => r.bestSharpe ?? 0), 0),
        bestFitness: Math.max(...summary.regionMetrics.map((r) => r.bestFitness ?? 0), 0),
      }
    }
    return summary.regionMetrics.find((r) => r.region === selectedRegion) ?? null
  }, [summary, selectedRegion])

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  }

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedRegion('ALL')
    setStatusFilter('all')
    setSelectedDataset('')
    setSelectedUniverse('ALL')
    setSelectedNeutralization('ALL')
    setSelectedDelay('ALL')
    setSearchQuery('')
    setPage(0)
    toast.info('All filters reset')
  }

  // Active filters count
  const activeFiltersCount = [
    selectedRegion !== 'ALL',
    statusFilter !== 'all',
    Boolean(selectedDataset),
    selectedUniverse !== 'ALL',
    selectedNeutralization !== 'ALL',
    selectedDelay !== 'ALL',
    Boolean(searchQuery.trim()),
  ].filter(Boolean).length

  // Explicit Submission Handler
  const handleConfirmSubmit = async () => {
    if (!submittingAlpha) return
    setIsSubmitting(true)
    try {
      const res = await labTasks.submitAlpha(submittingAlpha.alphaId)
      toast.success(res.message || `Alpha ${submittingAlpha.alphaId} submitted successfully!`, {
        action: {
          label: 'Open on BRAIN',
          onClick: () => window.open(res.brainUrl, '_blank', 'noopener,noreferrer'),
        },
      })
      setSubmittingAlpha(null)
      void queryClient.invalidateQueries({ queryKey: ['alpha-discovery'] })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed.'
      toast.error('Submission failed', { description: msg })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Export results to JSON or CSV
  const handleExport = (format: 'csv' | 'json') => {
    if (alphas.length === 0) {
      toast.error('No results to export')
      return
    }
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(alphas, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `alphas-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${alphas.length} alphas to JSON`)
    } else {
      const headers = [
        'rank',
        'alphaId',
        'region',
        'delay',
        'universe',
        'neutralization',
        'sharpe',
        'fitness',
        'returns',
        'turnover',
        'drawdown',
        'margin',
        'validationStatus',
        'submissionStatus',
        'datasetId',
        'expression',
      ]
      const rows = alphas.map((a) => [
        a.rank,
        a.alphaId,
        a.region,
        a.delay,
        a.universe,
        a.neutralization,
        a.sharpe ?? '',
        a.fitness ?? '',
        a.returns ?? '',
        a.turnover ?? '',
        a.drawdown ?? '',
        a.margin ?? '',
        a.validationStatus,
        a.submissionStatus,
        a.datasetId ?? '',
        `"${(a.expression ?? '').replace(/"/g, '""')}"`,
      ])
      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `alphas-export-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported ${alphas.length} alphas to CSV`)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Top Regional Statistics Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        {/* Region Tabs */}
        <div className="flex items-center justify-between border-b border-hairline pb-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setSelectedRegion('ALL')
                setPage(0)
              }}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-body-compact font-medium transition-colors',
                selectedRegion === 'ALL'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-2 text-ink-muted hover:bg-surface-3 hover:text-ink',
              )}
            >
              <span>All Regions</span>
              {summary && (
                <span className="num rounded-full bg-black/20 px-1.5 py-0.2 text-caption">
                  {fmt.int(summary.simulationsCompleted)}
                </span>
              )}
            </button>

            {summary?.regionMetrics.map((rm) => (
              <button
                key={rm.region}
                type="button"
                onClick={() => {
                  setSelectedRegion(rm.region)
                  setPage(0)
                }}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-body-compact font-medium transition-colors',
                  selectedRegion === rm.region
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-2 text-ink-muted hover:bg-surface-3 hover:text-ink',
                )}
              >
                <span>{rm.region}</span>
                <span className="num rounded-full bg-surface-4 px-1.5 py-0.2 text-caption text-ink-subtle">
                  {fmt.int(rm.evaluated)}
                </span>
                {rm.highPerforming > 0 && (
                  <span
                    className="size-1.5 rounded-full bg-pnl-positive"
                    title={`${rm.highPerforming} high-performing alphas`}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="icon-sm"
              variant="ghost"
              title="Refresh discovery metrics"
              onClick={() => void discovery.refetch()}
            >
              <RefreshCwIcon className={cn(discovery.isFetching && 'animate-spin')} />
            </Button>
            <div className="flex items-center rounded-md border border-hairline bg-surface-2 p-0.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleExport('csv')}
                title="Export filtered alphas to CSV"
              >
                <DownloadIcon />
                CSV
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleExport('json')}
                title="Export filtered alphas to JSON"
              >
                <DownloadIcon />
                JSON
              </Button>
            </div>
          </div>
        </div>

        {/* Selected Region Summary Metrics Cards */}
        {activeRegionMetric && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            <Metric
              boxed
              label={`${selectedRegion === 'ALL' ? 'Total' : selectedRegion} Evaluated`}
              value={fmt.int(activeRegionMetric.evaluated)}
              hint="simulated trials stored"
            />
            <Metric
              boxed
              label="Submittable Alphas"
              value={fmt.int(activeRegionMetric.submittable)}
              tone={activeRegionMetric.submittable > 0 ? 'profit' : 'neutral'}
              hint="cleared all platform gates"
            />
            <Metric
              boxed
              label="High-Performing"
              value={fmt.int(activeRegionMetric.highPerforming)}
              tone={activeRegionMetric.highPerforming > 0 ? 'profit' : 'neutral'}
              hint="Sharpe ≥ 1.25, Fitness ≥ 1.0"
            />
            <Metric
              boxed
              label="Best Sharpe"
              value={activeRegionMetric.bestSharpe ? fmt.ratio(activeRegionMetric.bestSharpe) : '—'}
              tone={
                activeRegionMetric.bestSharpe ? signTone(activeRegionMetric.bestSharpe) : 'neutral'
              }
              hint={selectedRegion}
            />
            <Metric
              boxed
              label="Best Fitness"
              value={
                activeRegionMetric.bestFitness ? fmt.ratio(activeRegionMetric.bestFitness) : '—'
              }
              tone={activeRegionMetric.bestFitness ? 'profit' : 'neutral'}
              hint={selectedRegion}
            />
          </div>
        )}
      </div>

      {/* ── Multidimensional Filter Toolbar (PHASE 4 & PHASE 5) ───────────────────── */}
      <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-surface-2 p-3.5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Text Search */}
          <div className="relative min-w-[240px] flex-1">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" />
            <Input
              type="text"
              placeholder="Search expression or Alpha ID (e.g. E5RzxA7L, ts_delay)..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(0)
              }}
              className="pl-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-ink-subtle hover:text-ink"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-caption font-medium uppercase tracking-wider text-ink-subtle">
              Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(0)
              }}
              className="h-8 rounded-md border border-hairline bg-surface-3 px-2.5 text-body-compact text-ink outline-none focus:border-primary"
            >
              <option value="all">All Discovered</option>
              <option value="submittable">Submittable Only (Clean)</option>
              <option value="high_performing">High-Performing (Sharpe ≥ 1.25)</option>
              <option value="passed_checks">Passed Checks (No Fail)</option>
              <option value="pending">Pending Validation</option>
            </select>
          </div>

          {/* Dataset Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-caption font-medium uppercase tracking-wider text-ink-subtle">
              Dataset:
            </span>
            <div className="relative flex items-center">
              <input
                list="discovery-datasets"
                value={selectedDataset}
                onChange={(e) => {
                  setSelectedDataset(e.target.value)
                  setPage(0)
                }}
                placeholder="All Datasets"
                className="h-8 w-[160px] truncate rounded-md border border-hairline bg-surface-3 px-2.5 text-body-compact text-ink outline-none focus:border-primary placeholder:text-ink-subtle"
              />
              <datalist id="discovery-datasets">
                {summary?.datasets.map((ds) => (
                  <option key={ds} value={ds}>
                    {ds}
                  </option>
                ))}
              </datalist>
              {selectedDataset && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDataset('')
                    setPage(0)
                  }}
                  className="absolute right-2 text-ink-subtle hover:text-ink"
                  title="Clear dataset filter"
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Delay Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-caption font-medium uppercase tracking-wider text-ink-subtle">
              Delay:
            </span>
            <select
              value={selectedDelay}
              onChange={(e) => {
                setSelectedDelay(e.target.value)
                setPage(0)
              }}
              className="h-8 rounded-md border border-hairline bg-surface-3 px-2.5 text-body-compact text-ink outline-none focus:border-primary"
            >
              <option value="ALL">All Delays</option>
              <option value="D1">Delay 1 (D1)</option>
              <option value="D0">Delay 0 (D0)</option>
            </select>
          </div>

          {/* Universe Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-caption font-medium uppercase tracking-wider text-ink-subtle">
              Universe:
            </span>
            <select
              value={selectedUniverse}
              onChange={(e) => {
                setSelectedUniverse(e.target.value)
                setPage(0)
              }}
              className="h-8 rounded-md border border-hairline bg-surface-3 px-2.5 text-body-compact text-ink outline-none focus:border-primary"
            >
              {UNIVERSES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Neutralization Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-caption font-medium uppercase tracking-wider text-ink-subtle">
              Neutralization:
            </span>
            <select
              value={selectedNeutralization}
              onChange={(e) => {
                setSelectedNeutralization(e.target.value)
                setPage(0)
              }}
              className="h-8 rounded-md border border-hairline bg-surface-3 px-2.5 text-body-compact text-ink outline-none focus:border-primary"
            >
              {NEUTRALIZATIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Second Row: Sorting, Ranking Metrics & Active Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-caption font-medium uppercase tracking-wider text-ink-subtle">
              <SlidersHorizontalIcon className="size-3.5" />
              Primary Rank Metric:
            </span>
            <div className="flex items-center gap-1 rounded-md border border-hairline bg-surface-3 p-0.5">
              {[
                { key: 'sharpe', label: 'Sharpe' },
                { key: 'fitness', label: 'Fitness' },
                { key: 'returns', label: 'Returns' },
                { key: 'turnover', label: 'Turnover' },
                { key: 'drawdown', label: 'Drawdown' },
                { key: 'afterCostSharpe', label: 'After-Cost' },
                { key: 'dateCreated', label: 'Recent' },
              ].map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => {
                    if (sortBy === m.key) {
                      setSortDesc(!sortDesc)
                    } else {
                      setSortBy(m.key)
                      setSortDesc(true)
                    }
                    setPage(0)
                  }}
                  className={cn(
                    'rounded px-2 py-1 text-caption font-medium transition-colors',
                    sortBy === m.key
                      ? 'bg-primary text-primary-contrast'
                      : 'text-ink-muted hover:text-ink',
                  )}
                >
                  {m.label} {sortBy === m.key ? (sortDesc ? '↓' : '↑') : ''}
                </button>
              ))}
            </div>

            {/* Active Filter Chips */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pl-2 border-l border-hairline">
                {selectedRegion !== 'ALL' && (
                  <Badge tone="neutral" className="flex items-center gap-1">
                    Region: {selectedRegion}
                    <button type="button" onClick={() => setSelectedRegion('ALL')}>
                      <XIcon className="size-3 hover:text-pnl-negative" />
                    </button>
                  </Badge>
                )}
                {statusFilter !== 'all' && (
                  <Badge tone="profit" className="flex items-center gap-1">
                    Status: {statusFilter}
                    <button type="button" onClick={() => setStatusFilter('all')}>
                      <XIcon className="size-3 hover:text-pnl-negative" />
                    </button>
                  </Badge>
                )}
                {selectedDataset && (
                  <Badge tone="warn" className="flex items-center gap-1">
                    Dataset: {selectedDataset}
                    <button type="button" onClick={() => setSelectedDataset('')}>
                      <XIcon className="size-3 hover:text-pnl-negative" />
                    </button>
                  </Badge>
                )}
                {searchQuery && (
                  <Badge tone="neutral" className="flex items-center gap-1">
                    Search: "{searchQuery}"
                    <button type="button" onClick={() => setSearchQuery('')}>
                      <XIcon className="size-3 hover:text-pnl-negative" />
                    </button>
                  </Badge>
                )}
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={handleResetFilters}
                  title="Reset all filters"
                >
                  <RotateCcwIcon className="size-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Results count indicator */}
          <div className="flex items-center gap-2 text-body-compact text-ink-subtle">
            <span className="num font-medium text-ink">{fmt.int(totalCount)}</span>
            <span>alphas match filters</span>
          </div>
        </div>
      </div>

      {/* ── High-Density Alpha Discovery Table (PHASE 6) ─────────────────────────── */}
      <Panel
        title={
          <div className="flex items-center gap-2">
            <span>Discovered Alphas</span>
            <Badge tone="outline" className="num">
              {fmt.int(totalCount)}
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-3">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1 text-caption text-ink-subtle">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(0)
                }}
                className="h-7 rounded border border-hairline bg-surface-2 px-1.5 text-caption text-ink outline-none"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="secondary"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeftIcon />
              </Button>
              <span className="num px-1 text-caption text-ink-muted">
                {page + 1} / {Math.max(1, totalPages)}
              </span>
              <Button
                size="icon-sm"
                variant="secondary"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        }
      >
        {discovery.isError ? (
          <ErrorNotice error={discovery.error} title="Could not load alpha discovery results" />
        ) : discovery.isPending ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : alphas.length === 0 ? (
          <Empty title="No alphas match the current filter criteria">
            <div className="flex flex-col items-center gap-2">
              <p className="text-body-compact text-ink-subtle">
                Try loosening the filters, selecting "All Regions", or choosing "All Discovered".
              </p>
              <Button variant="secondary" size="sm" onClick={handleResetFilters}>
                Reset All Filters
              </Button>
            </div>
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-compact">
              <thead className="border-b border-hairline bg-surface-2 text-caption font-medium uppercase tracking-wider text-ink-subtle">
                <tr>
                  <th className="px-3 py-2.5 text-center w-12">#</th>
                  <th className="px-3 py-2.5 w-28">Alpha ID</th>
                  <th className="px-3 py-2.5 min-w-[260px]">Expression</th>
                  <th className="px-3 py-2.5 w-20">Region</th>
                  <th className="px-3 py-2.5 w-28">Dataset</th>
                  <th className="px-3 py-2.5 w-16">Delay</th>
                  <th className="px-3 py-2.5 w-24">Universe</th>
                  <th className="px-3 py-2.5 w-28">Neutralization</th>
                  <th
                    className={cn(
                      'px-3 py-2.5 text-right w-24 cursor-pointer hover:text-ink',
                      sortBy === 'sharpe' && 'text-primary font-bold',
                    )}
                    onClick={() => {
                      if (sortBy === 'sharpe') setSortDesc(!sortDesc)
                      else {
                        setSortBy('sharpe')
                        setSortDesc(true)
                      }
                    }}
                  >
                    Sharpe {sortBy === 'sharpe' ? (sortDesc ? '↓' : '↑') : ''}
                  </th>
                  <th
                    className={cn(
                      'px-3 py-2.5 text-right w-20 cursor-pointer hover:text-ink',
                      sortBy === 'fitness' && 'text-primary font-bold',
                    )}
                    onClick={() => {
                      if (sortBy === 'fitness') setSortDesc(!sortDesc)
                      else {
                        setSortBy('fitness')
                        setSortDesc(true)
                      }
                    }}
                  >
                    Fitness {sortBy === 'fitness' ? (sortDesc ? '↓' : '↑') : ''}
                  </th>
                  <th
                    className={cn(
                      'px-3 py-2.5 text-right w-20 cursor-pointer hover:text-ink',
                      sortBy === 'returns' && 'text-primary font-bold',
                    )}
                    onClick={() => {
                      if (sortBy === 'returns') setSortDesc(!sortDesc)
                      else {
                        setSortBy('returns')
                        setSortDesc(true)
                      }
                    }}
                  >
                    Returns {sortBy === 'returns' ? (sortDesc ? '↓' : '↑') : ''}
                  </th>
                  <th
                    className={cn(
                      'px-3 py-2.5 text-right w-20 cursor-pointer hover:text-ink',
                      sortBy === 'turnover' && 'text-primary font-bold',
                    )}
                    onClick={() => {
                      if (sortBy === 'turnover') setSortDesc(!sortDesc)
                      else {
                        setSortBy('turnover')
                        setSortDesc(true)
                      }
                    }}
                  >
                    Turnover {sortBy === 'turnover' ? (sortDesc ? '↓' : '↑') : ''}
                  </th>
                  <th
                    className={cn(
                      'px-3 py-2.5 text-right w-20 cursor-pointer hover:text-ink',
                      sortBy === 'drawdown' && 'text-primary font-bold',
                    )}
                    onClick={() => {
                      if (sortBy === 'drawdown') setSortDesc(!sortDesc)
                      else {
                        setSortBy('drawdown')
                        setSortDesc(true)
                      }
                    }}
                  >
                    Drawdown {sortBy === 'drawdown' ? (sortDesc ? '↓' : '↑') : ''}
                  </th>
                  <th className="px-3 py-2.5 text-right w-20">Margin</th>
                  <th className="px-3 py-2.5 text-right w-24">After-Cost</th>
                  <th className="px-3 py-2.5 w-28">Validation</th>
                  <th className="px-3 py-2.5 w-28">Status</th>
                  <th className="px-3 py-2.5 text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline bg-surface-1">
                {alphas.map((alpha) => {
                  const isEligible = alpha.submittable && alpha.submissionStatus === 'UNSUBMITTED'
                  const isSubmitted = alpha.submissionStatus !== 'UNSUBMITTED'

                  return (
                    <tr
                      key={alpha.alphaId}
                      onClick={() => {
                        onOpenAlpha?.(alpha.alphaId)
                        setInspectedAlpha(alpha)
                      }}
                      className="cursor-pointer transition-colors hover:bg-surface-2"
                    >
                      {/* Rank */}
                      <td className="num px-3 py-2 text-center text-caption text-ink-subtle">
                        #{alpha.rank}
                      </td>

                      {/* Alpha ID */}
                      <td className="px-3 py-2 font-mono text-ink">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-primary">{alpha.alphaId}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(alpha.alphaId, 'Alpha ID')
                            }}
                            className="text-ink-subtle hover:text-ink"
                            title="Copy Alpha ID"
                          >
                            <CopyIcon className="size-3" />
                          </button>
                        </div>
                      </td>

                      {/* Expression */}
                      <td className="px-3 py-2 font-mono text-caption text-ink max-w-[320px]">
                        <div className="flex items-center gap-2">
                          <span
                            className="block truncate text-ink"
                            title={alpha.expression ?? undefined}
                          >
                            {alpha.expression ?? '—'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(alpha.expression ?? '', 'Expression')
                            }}
                            className="shrink-0 text-ink-subtle hover:text-ink"
                            title="Copy full expression"
                          >
                            <CopyIcon className="size-3" />
                          </button>
                        </div>
                      </td>

                      {/* Region */}
                      <td className="px-3 py-2">
                        <Badge tone="neutral">{alpha.region}</Badge>
                      </td>

                      {/* Dataset & Category */}
                      <td className="px-3 py-2">
                        <div
                          className="flex flex-col truncate"
                          title={`${alpha.datasetId ?? '—'} (${alpha.category ?? '—'})`}
                        >
                          <span className="truncate text-ink font-medium">
                            {alpha.datasetId ?? '—'}
                          </span>
                          {alpha.category && (
                            <span className="truncate text-caption text-ink-subtle">
                              {alpha.category}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Delay */}
                      <td className="num px-3 py-2 text-ink-muted">D{alpha.delay}</td>

                      {/* Universe */}
                      <td className="num px-3 py-2 text-ink-muted truncate">{alpha.universe}</td>

                      {/* Neutralization */}
                      <td className="num px-3 py-2 text-ink-muted truncate">
                        {alpha.neutralization}
                      </td>

                      {/* Sharpe */}
                      <td className="num px-3 py-2 text-right font-medium">
                        <span className={TEXT_TONE[signTone(alpha.sharpe)]}>
                          {fmt.ratio(alpha.sharpe)}
                        </span>
                      </td>

                      {/* Fitness */}
                      <td className="num px-3 py-2 text-right">
                        <span
                          className={
                            alpha.fitness != null && alpha.fitness >= 1
                              ? 'text-pnl-positive'
                              : 'text-ink'
                          }
                        >
                          {fmt.ratio(alpha.fitness)}
                        </span>
                      </td>

                      {/* Returns */}
                      <td className="num px-3 py-2 text-right">
                        <span className={TEXT_TONE[signTone(alpha.returns)]}>
                          {fmt.pct(alpha.returns)}
                        </span>
                      </td>

                      {/* Turnover */}
                      <td className="num px-3 py-2 text-right text-ink-muted">
                        {fmt.pct(alpha.turnover)}
                      </td>

                      {/* Drawdown */}
                      <td className="num px-3 py-2 text-right text-ink-muted">
                        {fmt.pct(alpha.drawdown)}
                      </td>

                      {/* Margin */}
                      <td className="num px-3 py-2 text-right text-ink-muted">
                        {alpha.margin != null ? fmt.ratio(alpha.margin, 4) : '—'}
                      </td>

                      {/* After-Cost Sharpe */}
                      <td className="num px-3 py-2 text-right">
                        {alpha.afterCostSharpe != null ? (
                          <span className={TEXT_TONE[signTone(alpha.afterCostSharpe)]}>
                            {fmt.ratio(alpha.afterCostSharpe)}
                          </span>
                        ) : (
                          <span className="text-ink-subtle">—</span>
                        )}
                      </td>

                      {/* Validation Status */}
                      <td className="px-3 py-2">
                        {alpha.validationStatus === 'submittable' ? (
                          <Badge tone="profit" className="flex items-center gap-1">
                            <CheckCircle2Icon className="size-3" />
                            Pass
                          </Badge>
                        ) : alpha.validationStatus === 'pending' ? (
                          <Badge tone="warn" className="flex items-center gap-1">
                            <AlertTriangleIcon className="size-3" />
                            Pending
                          </Badge>
                        ) : alpha.validationStatus === 'refused' ? (
                          <Badge
                            tone="loss"
                            className="flex items-center gap-1"
                            title={`Failed: ${alpha.refusedBy.join(', ') || alpha.failedChecks.join(', ')}`}
                          >
                            <XCircleIcon className="size-3" />
                            {alpha.refusedBy.length || alpha.failedChecks.length} Refused
                          </Badge>
                        ) : (
                          <Badge tone="muted">Unvalidated</Badge>
                        )}
                      </td>

                      {/* Submission Status */}
                      <td className="px-3 py-2">
                        {isSubmitted ? (
                          <Badge tone="neutral">{alpha.submissionStatus}</Badge>
                        ) : isEligible ? (
                          <Badge tone="profit">Eligible</Badge>
                        ) : (
                          <Badge tone="outline">Unsubmitted</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isEligible && (
                            <Button
                              size="icon-sm"
                              variant="primary"
                              title="Submit eligible alpha to BRAIN"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSubmittingAlpha(alpha)
                              }}
                            >
                              <SendIcon className="size-3.5" />
                            </Button>
                          )}
                          <Button
                            size="icon-sm"
                            variant="secondary"
                            title="Inspect Alpha Details"
                            onClick={(e) => {
                              e.stopPropagation()
                              setInspectedAlpha(alpha)
                            }}
                          >
                            <SparklesIcon className="size-3.5" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Open on WorldQuant BRAIN"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(alpha.brainUrl, '_blank', 'noopener,noreferrer')
                            }}
                          >
                            <ExternalLinkIcon className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Pagination Bar */}
        <div className="flex items-center justify-between border-t border-hairline px-4 py-3 bg-surface-2">
          <span className="text-caption text-ink-subtle">
            Showing {alphas.length > 0 ? page * pageSize + 1 : 0} to{' '}
            {Math.min((page + 1) * pageSize, totalCount)} of {fmt.int(totalCount)} matching alphas
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeftIcon />
              Previous
            </Button>
            <span className="num text-caption text-ink-muted">
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      </Panel>

      {/* ── Slide-Over Alpha Inspection Drawer (PHASE 7) ─────────────────────────── */}
      <AlphaDetailDrawer
        alpha={inspectedAlpha}
        onClose={() => setInspectedAlpha(null)}
        onAlphaSubmitted={() => void discovery.refetch()}
      />

      {/* ── Submission Confirmation Modal (PHASE 8) ──────────────────────────────── */}
      <Confirm
        open={Boolean(submittingAlpha)}
        onOpenChange={(open) => !open && setSubmittingAlpha(null)}
        title="Submit Alpha to WorldQuant BRAIN"
        confirmLabel="Confirm & Submit"
        pending={isSubmitting}
        onConfirm={() => void handleConfirmSubmit()}
      >
        {submittingAlpha && (
          <div className="flex flex-col gap-3">
            <p className="text-body text-ink">
              You are about to submit Alpha{' '}
              <strong className="font-mono text-primary">{submittingAlpha.alphaId}</strong> (
              {submittingAlpha.region} D{submittingAlpha.delay} {submittingAlpha.universe}) to
              WorldQuant BRAIN.
            </p>
            <div className="rounded-md border border-hairline bg-surface-2 p-3 text-body-compact">
              <div className="grid grid-cols-2 gap-y-1 text-ink-muted">
                <span>Sharpe:</span>{' '}
                <span className="font-medium text-pnl-positive">
                  {fmt.ratio(submittingAlpha.sharpe)}
                </span>
                <span>Fitness:</span>{' '}
                <span className="font-medium text-ink">{fmt.ratio(submittingAlpha.fitness)}</span>
                <span>Returns:</span>{' '}
                <span className="font-medium text-ink">{fmt.pct(submittingAlpha.returns)}</span>
                <span>Turnover:</span>{' '}
                <span className="font-medium text-ink">{fmt.pct(submittingAlpha.turnover)}</span>
              </div>
            </div>
            <p className="text-caption text-ink-subtle">
              This action will consume your daily WorldQuant BRAIN submission quota.
            </p>
          </div>
        )}
      </Confirm>
    </div>
  )
}
