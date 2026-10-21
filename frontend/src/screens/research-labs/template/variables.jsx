/**
 * The Variables panel: one row per `$name` the template writes, each defined as fields from
 * chosen datasets or as typed values, with what it holds in this market beside it.
 */

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { DatabaseIcon, FilterIcon, PencilIcon, RotateCcwIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { catalog } from '@/api/catalog'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/format'
import { AvailabilityFilters } from '@/screens/data/availability'
import { DatasetChips, useDatasetTree } from '@/screens/data/dataset-chips'
import { datasetNames } from '@/screens/data/dataset-tree'
import { describeFilter } from '@/screens/data/state'
import { DatasetTree } from '@/screens/data/tree-view'
import {
  Badge,
  Button,
  Chips,
  Empty,
  ErrorNotice,
  Field,
  Fieldset,
  Panel,
  Segmented,
  Skeleton,
  Textarea,
} from '@/ui/kit'
import { Sheet } from '@/ui/overlay'

const TYPES = ['MATRIX', 'VECTOR']
const TYPE_LABELS = {
  MATRIX: 'Matrix',
  VECTOR: 'Vector',
}

/** Comments blanked as BRAIN reads them, so a `$name` in one is not a variable. */
const COMMENTS = /\/\*[\s\S]*?\*\/|(?:\/\/|#)[^\n]*/g

/** Every `$name` the template writes, in the order first written. */
export function namesIn(text) {
  const found = text.replace(COMMENTS, ' ').matchAll(/\$([A-Za-z_]\w*)/g)
  return [...new Set([...found].map((m) => m[1] ?? ''))].filter(Boolean)
}

/**
 * What a name means before anyone defines it: a preset's values, or the fields of the dataset,
 * subcategory or category it is named after. `$earnings4_b` reads like `$earnings4`, so a
 * second field from one dataset is a suffix away.
 */
export function defaultOf(name, presets, datasets) {
  for (const stem of new Set([name, name.replace(/_[a-z0-9]+$/i, '')])) {
    const preset = presets[stem]
    if (preset)
      return {
        kind: 'values',
        values: preset,
      }
    if (datasets.some((d) => d.dataset_id === stem))
      return {
        kind: 'fields',
        dataset_ids: [stem],
      }
    for (const level of ['subcategory_id', 'category_id']) {
      const ids = datasets
        .filter((d) => d[level]?.replaceAll('-', '_') === stem)
        .map((d) => d.dataset_id)
      if (ids.length)
        return {
          kind: 'fields',
          dataset_ids: ids,
        }
    }
  }
  return null
}

/** What each `$name` in `text` stands for: given here, else its default; undefined ones left out. */
export function resolve(text, given, presets, datasets) {
  return Object.fromEntries(
    namesIn(text).flatMap((name) => {
      const def = given[name] ?? defaultOf(name, presets, datasets)
      return def ? [[name, def]] : []
    }),
  )
}

/** The rows: each name, with its definition and what the preview says about it. */
export function VariablesPanel({
  names,
  defs,
  given,
  infos,
  scope,
  presets,
  vector,
  pending,
  onDefine,
  onMoreFilters,
}) {
  const [editing, setEditing] = useState(null)
  const { tree, nameOf, ready } = useDatasetTree(scope)
  return (
    <Panel
      title="Variables"
      description="Each $name the template writes. Every Alpha takes one value for each."
    >
      {names.length === 0 ? (
        <Empty title="No variables yet">
          Write $name in the template wherever the search should choose: $earnings4 takes a field
          from that dataset, $slow_lookback one of 63, 126 or 252, and any other name is yours to
          define.
        </Empty>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline-subtle">
          {names.map((name) => {
            const def = defs[name] ?? null
            const info = infos.get(name)
            return (
              <li key={name} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="num text-body font-medium text-ink">${name}</code>
                      {def && (
                        <Badge tone="outline">{def.kind === 'fields' ? 'Fields' : 'Values'}</Badge>
                      )}
                      {info?.operator && <Badge tone="outline">Operator</Badge>}
                      {def && !given.has(name) && (
                        <span className="text-body-compact text-ink-subtle">
                          {def.kind === 'values' ? 'Preset' : 'Named after its datasets'}
                        </span>
                      )}
                    </div>
                    <Summary
                      def={def}
                      info={info}
                      scope={scope}
                      tree={tree}
                      nameOf={nameOf}
                      ready={ready}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Count def={def} info={info} pending={pending} />
                    <Button size="sm" onClick={() => setEditing(name)}>
                      <PencilIcon />
                      {def ? 'Edit' : 'Define'}
                    </Button>
                  </div>
                </div>
                {info?.problems.map((problem) => (
                  <p key={problem} className="text-body-compact text-status-danger">
                    {problem}
                  </p>
                ))}
              </li>
            )
          })}
        </ul>
      )}
      {editing !== null && (
        <VariableEditor
          key={editing}
          name={editing}
          initial={defs[editing] ?? null}
          given={given.has(editing)}
          info={infos.get(editing)}
          scope={scope}
          presets={presets}
          vector={vector}
          onClose={() => setEditing(null)}
          onApply={(variable) => {
            onDefine(editing, variable)
            setEditing(null)
          }}
          onMoreFilters={(variable) => onMoreFilters(editing, variable)}
        />
      )}
    </Panel>
  )
}
function Summary({ def, info, scope, tree, nameOf, ready }) {
  if (!def)
    return (
      <span className="text-body-compact text-ink-subtle">
        Not defined: choose its fields, or type its values.
      </span>
    )
  if (def.kind === 'values')
    return <code className="num text-body-compact break-words text-ink-muted">{def.values}</code>
  const types = info?.fieldTypes ?? []
  const narrowed = describeFilter(
    {
      ...def.filter,
      field_types: [],
    },
    scope?.region ?? '',
  )
  return (
    <div className="flex flex-col gap-1.5">
      <DatasetChips tree={tree} value={def.dataset_ids} nameOf={nameOf} ready={ready} />
      <span className="text-body-compact text-ink-subtle">
        {[
          types.map((t) => TYPE_LABELS[t] ?? t).join(' and '),
          types.includes('MATRIX') && types.includes('VECTOR')
            ? `vector fields through ${(def.vector_operators ?? []).join(', ') || '…'}`
            : null,
          ...narrowed,
        ]
          .filter(Boolean)
          .join(' · ')}
      </span>
    </div>
  )
}
function Count({ def, info, pending }) {
  if (!def || !info || info.kind !== def.kind) return null
  const text =
    def.kind === 'values'
      ? `${fmt.int(info.values)} value${info.values === 1 ? '' : 's'}`
      : info.fields
        ? `${fmt.int(info.fields.total)} field${info.fields.total === 1 ? '' : 's'}`
        : null
  if (!text) return null
  const split =
    info.fields && info.fields.matrix > 0 && info.fields.vector > 0
      ? `${fmt.int(info.fields.matrix)} matrix, ${fmt.int(info.fields.vector)} vector`
      : undefined
  return (
    <span
      title={split}
      className={cn(
        'num text-body-compact whitespace-nowrap',
        pending ? 'text-ink-subtle' : 'text-ink',
      )}
    >
      {text}
    </span>
  )
}

/** Defines one variable: its datasets and filters, or its values. */
function VariableEditor({
  name,
  initial,
  given,
  info,
  scope,
  presets,
  vector,
  onClose,
  onApply,
  onMoreFilters,
}) {
  const [kind, setKind] = useState(initial?.kind ?? (info?.operator ? 'values' : 'fields'))
  const [datasetIds, setDatasetIds] = useState(
    initial?.kind === 'fields' ? initial.dataset_ids : [],
  )
  const [filter, setFilter] = useState(initial?.kind === 'fields' ? (initial.filter ?? {}) : {})
  const [wraps, setWraps] = useState(
    initial?.kind === 'fields' ? (initial.vector_operators ?? []) : [],
  )
  const [values, setValues] = useState(initial?.kind === 'values' ? initial.values : '')

  // Types not chosen here follow where the template writes the variable, as the preview read it.
  const own = (filter.field_types ?? []).filter((t) => TYPES.includes(t))
  const types = own.length ? own : (info?.fieldTypes ?? ['MATRIX'])
  const both = types.includes('MATRIX') && types.includes('VECTOR')
  const fields = {
    kind: 'fields',
    dataset_ids: datasetIds,
    filter: Object.keys(filter).length ? filter : null,
    vector_operators: both ? wraps : [],
  }
  const draft =
    kind === 'fields'
      ? fields
      : {
          kind: 'values',
          values,
        }
  const setTypes = (next) => {
    const chosen = TYPES.filter((t) => next.includes(t))
    if (chosen.length === 0) return
    setFilter((f) => ({
      ...f,
      field_types: chosen,
    }))
    // Both kinds of field need something to reduce the vector ones with: vec_avg, unless
    // something else was already chosen.
    if (chosen.length === 2 && wraps.length === 0 && vector.includes('vec_avg'))
      setWraps(['vec_avg'])
  }
  return (
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={<code className="num">${name}</code>}
      description={
        info?.operator
          ? 'Written as an operator, so its values are operator names.'
          : 'Every Alpha takes one of its values.'
      }
      footer={
        <>
          {given && (
            <Button variant="ghost" className="mr-auto" onClick={() => onApply(null)}>
              <RotateCcwIcon />
              Use Default
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onApply(draft)}>
            Apply
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Segmented
          label="Kind"
          items={[
            {
              value: 'fields',
              label: 'Fields',
            },
            {
              value: 'values',
              label: 'Values',
            },
          ]}
          value={kind}
          onChange={setKind}
        />
        {kind === 'values' ? (
          <Field
            label="Values"
            hint={
              'Separated by commas: numbers, groups, operator names, or whole expressions ' +
              'such as bucket(rank(cap), range="0, 1, 0.1").'
            }
          >
            <Textarea
              rows={4}
              spellCheck={false}
              className="num"
              value={values}
              onChange={(e) => setValues(e.target.value)}
            />
            {presets[name] !== undefined && values !== presets[name] && (
              <Button
                size="sm"
                variant="ghost"
                className="self-start"
                onClick={() => setValues(presets[name] ?? '')}
              >
                <RotateCcwIcon />
                Preset Values
              </Button>
            )}
          </Field>
        ) : scope === null ? (
          <Empty title="This market is not downloaded" icon={<DatabaseIcon />}>
            Download it in BRAIN › Sync to choose fields from it.
          </Empty>
        ) : (
          <FieldsChoice
            scope={scope}
            datasetIds={datasetIds}
            setDatasetIds={setDatasetIds}
            filter={filter}
            setFilter={setFilter}
            types={types}
            setTypes={setTypes}
            vector={vector}
            wraps={wraps}
            setWraps={setWraps}
            onMoreFilters={() => onMoreFilters(fields)}
          />
        )}
      </div>
    </Sheet>
  )
}
function FieldsChoice({
  scope,
  datasetIds,
  setDatasetIds,
  filter,
  setFilter,
  types,
  setTypes,
  vector,
  wraps,
  setWraps,
  onMoreFilters,
}) {
  const active = {
    ...filter,
    field_types: types,
    dataset_ids: datasetIds,
  }
  // The market's whole tree, so ticking a category takes every dataset in it.
  const source = useQuery({
    queryKey: ['catalog', 'facets', scope, {}],
    queryFn: () => catalog.facets(scope, {}),
  })
  const counts = useQuery({
    queryKey: ['catalog', 'facets', scope, active],
    queryFn: () => catalog.facets(scope, active),
    placeholderData: keepPreviousData,
  })
  const datasets = useQuery({
    queryKey: ['catalog', 'datasets', scope, ''],
    queryFn: () => catalog.datasets(scope),
  })
  const names = useMemo(() => datasetNames(datasets.data ?? []), [datasets.data])
  const byType = new Map(counts.data?.types.map((t) => [t.id, t.n]))
  const matching = datasetIds.length
    ? types.reduce((sum, t) => sum + (byType.get(t) ?? 0), 0)
    : null
  // Region Exclusive, coverage and the rest of the Data Explorer's filters, less what has
  // its own control here.
  const more = describeFilter(
    {
      ...filter,
      field_types: [],
      region_exclusive: false,
      region_agnostic: false,
    },
    scope.region,
  )
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-body text-ink">
          {matching === null ? (
            'Tick categories, subcategories or datasets.'
          ) : (
            <>
              <span className="num font-medium">{fmt.int(matching)}</span> field
              {matching === 1 ? '' : 's'} match
            </>
          )}
        </span>
        <Button size="sm" variant="ghost" onClick={onMoreFilters}>
          <FilterIcon />
          More Filters in Data Explorer
        </Button>
      </div>
      {more.length > 0 && (
        <p className="text-body-compact text-ink-subtle">Also narrowed by {more.join(' · ')}</p>
      )}
      <Fieldset legend="Field Type">
        <Chips
          label="Field Type"
          value={types}
          onChange={setTypes}
          items={TYPES.map((t) => ({
            value: t,
            label: (
              <span>
                {TYPE_LABELS[t]}{' '}
                <span className="num text-ink-subtle">
                  {fmt.int(counts.data ? (byType.get(t) ?? 0) : null)}
                </span>
              </span>
            ),
          }))}
        />
      </Fieldset>
      {types.includes('MATRIX') && types.includes('VECTOR') && (
        <Fieldset
          legend="Vector Operators"
          hint="A vector field is reduced with one of these; matrix fields are used as they are."
        >
          <Chips
            label="Vector Operators"
            value={wraps}
            onChange={setWraps}
            items={vector.map((op) => ({
              value: op,
              label: op,
            }))}
          />
        </Fieldset>
      )}
      <AvailabilityFilters
        scope={scope}
        counts={counts.data?.availability}
        value={filter}
        onChange={(change) =>
          setFilter((f) => ({
            ...f,
            ...change,
          }))
        }
      />
      {source.isError && <ErrorNotice error={source.error} title="Could not load the datasets" />}
      {source.data ? (
        <DatasetTree
          scope={scope}
          source={source.data}
          counts={counts.data}
          names={names}
          value={datasetIds}
          onChange={setDatasetIds}
        />
      ) : (
        !source.isError && <Skeleton className="h-40" />
      )}
    </div>
  )
}
