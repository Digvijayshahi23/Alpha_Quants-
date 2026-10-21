/**
 * The Data Explorer's dataset filter as a tree: Category → Subcategory → Dataset. Pure, so the
 * picker only renders it; the choice itself is always a list of dataset ids.
 */

/** The facet lists the tree is built from (`CatalogFacets` fits). */

/**
 * Built from the datasets themselves, so every dataset sits exactly once under its own
 * category. Categories, subcategories and datasets keep the facets' order: largest first.
 */
export function buildTree(source) {
  const trunks = new Map()
  const trunkOf = (id, name) => {
    const key = id ?? ''
    let trunk = trunks.get(key)
    if (!trunk) {
      trunk = {
        key,
        id: key,
        name: name ?? id ?? 'Uncategorised',
        ids: [],
        subcategories: [],
        loose: [],
      }
      trunks.set(key, trunk)
    }
    return trunk
  }
  for (const c of source.categories) trunkOf(c.id, c.name)
  const subcategoryName = new Map(source.subcategories.map((s) => [s.id, s.name]))
  const subcategoryRank = new Map(source.subcategories.map((s, i) => [s.id, i]))
  const branches = new Map()
  for (const d of source.datasets) {
    const trunk = trunkOf(d.category_id)
    trunk.ids.push(d.id)
    if (!d.subcategory_id) {
      trunk.loose.push(d.id)
      continue
    }
    const key = `${trunk.key}|${d.subcategory_id}`
    let branch = branches.get(key)
    if (!branch) {
      branch = {
        key,
        id: d.subcategory_id,
        name: subcategoryName.get(d.subcategory_id) ?? d.subcategory_id,
        ids: [],
      }
      branches.set(key, branch)
      trunk.subcategories.push(branch)
    }
    branch.ids.push(d.id)
  }
  const rank = (b) => subcategoryRank.get(b.id) ?? Number.MAX_SAFE_INTEGER
  for (const trunk of trunks.values()) trunk.subcategories.sort((a, b) => rank(a) - rank(b))
  return [...trunks.values()].filter((t) => t.ids.length > 0)
}

/** One removable pick: a whole category, a whole subcategory, or a single dataset. */

/** The picks under one subcategory, or under none for datasets that have no subcategory. */

/** Everything ticked in one category, so a shared path is written once. */

/**
 * What is ticked, grouped by where it sits: one entry per category, holding whole
 * subcategories and single datasets beneath it. A whole category is one pick.
 */
export function summarize(tree, value, nameOf) {
  const chosen = new Set(value)
  const covered = new Set()
  const pick = (key, name, ids) => {
    for (const id of ids) covered.add(id)
    return {
      key,
      name,
      ids,
    }
  }
  // A group of one is its dataset: naming the group would hide which dataset it is.
  const all = (ids) => ids.length > 1 && ids.every((id) => chosen.has(id))
  const datasets = (ids) =>
    ids.filter((id) => chosen.has(id)).map((id) => pick(`d:${id}`, nameOf(id), [id]))
  const summary = []
  for (const trunk of tree) {
    if (!trunk.ids.some((id) => chosen.has(id))) continue
    if (all(trunk.ids)) {
      summary.push({
        key: trunk.key,
        name: trunk.name,
        whole: pick(`c:${trunk.key}`, trunk.name, trunk.ids),
        branches: [],
      })
      continue
    }
    const branches = []
    for (const branch of trunk.subcategories) {
      if (!branch.ids.some((id) => chosen.has(id))) continue
      const whole = all(branch.ids)
      branches.push({
        key: branch.key,
        name: branch.name,
        whole: whole ? pick(`s:${branch.key}`, branch.name, branch.ids) : null,
        datasets: whole ? [] : datasets(branch.ids),
      })
    }
    const loose = datasets(trunk.loose)
    if (loose.length)
      branches.push({
        key: `${trunk.key}|`,
        name: null,
        whole: null,
        datasets: loose,
      })
    summary.push({
      key: trunk.key,
      name: trunk.name,
      whole: null,
      branches,
    })
  }
  const unknown = value.filter((id) => !covered.has(id))
  if (unknown.length) {
    summary.push({
      key: 'unknown',
      name: null,
      whole: null,
      branches: [
        {
          key: 'unknown|',
          name: null,
          whole: null,
          datasets: datasets(unknown),
        },
      ],
    })
  }
  return summary
}

/**
 * Dataset ids to the names people read, each with its id: BRAIN gives some datasets the very
 * same name ("ETF Risk Data" is both model237 and risk82), and the id is also what a field's
 * prefix and every BRAIN page use.
 */
export function datasetNames(rows) {
  return new Map(
    rows.map((r) => [
      r.dataset_id,
      r.name && r.name !== r.dataset_id ? `${r.name} (${r.dataset_id})` : r.dataset_id,
    ]),
  )
}
