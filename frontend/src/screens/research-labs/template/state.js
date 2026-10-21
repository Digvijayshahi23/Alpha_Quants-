/** The Template Lab draft: the template being written, its variables and the task's settings. */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_SCOPE } from '@/lib/scope'

const DRAFT = {
  region: DEFAULT_SCOPE.region,
  delay: DEFAULT_SCOPE.delay,
  text: '',
  variables: {},
  universes: [],
  neutralizations: [],
  investability: [],
  decay: '0',
  truncation: '0.08',
  pasteurization: 'ON',
  nanHandling: 'ON',
  testYears: '2',
  testMonths: '0',
  cores: null,
  simulations: null,
  templateId: null,
  name: '',
  dirty: false,
  opened: {
    text: '',
    variables: {},
  },
  picking: null,
  view: 'code',
}

/** Every variable with its defaults filled in. */
function whole(variables) {
  return Object.fromEntries(
    Object.entries(variables ?? {}).map(([name, v]) => [
      name,
      v.kind === 'fields'
        ? {
            ...v,
            dataset_ids: v.dataset_ids ?? [],
          }
        : {
            ...v,
            values: v.values ?? '',
          },
    ]),
  )
}
export const useTemplateLab = create()(
  persist(
    (set) => ({
      ...DRAFT,
      open: (templateId, name, text, variables) =>
        set({
          templateId,
          name,
          text,
          variables,
          dirty: false,
          opened: {
            text,
            variables,
          },
        }),
      write: (text) =>
        set({
          text,
          dirty: true,
        }),
      define: (name, variable) =>
        set((s) => {
          const variables = {
            ...s.variables,
          }
          if (variable) variables[name] = variable
          else delete variables[name]
          return {
            variables,
            dirty: true,
          }
        }),
      saved: (templateId, name) =>
        set((s) => ({
          templateId,
          name,
          dirty: false,
          opened: {
            text: s.text,
            variables: s.variables,
          },
        })),
    }),
    {
      name: 'alpha-harness-template-lab',
      // Version 3 types templates; a draft of blocks keeps only its market and its size.
      // Version 4 repairs a version 3 draft holding a variable opened from a saved template
      // without its defaults: a fields variable with no `dataset_ids` failed the whole screen.
      version: 4,
      migrate: (stored, version) => {
        const old = stored ?? {}
        if (version === 3)
          return {
            ...DRAFT,
            ...old,
            variables: whole(old.variables),
            opened: {
              text: old.opened?.text ?? '',
              variables: whole(old.opened?.variables),
            },
          }
        return {
          ...DRAFT,
          region: old.region ?? DRAFT.region,
          delay: old.delay ?? DRAFT.delay,
          cores: old.cores ?? null,
          simulations: old.simulations ?? null,
        }
      },
      partialize: ({ open: _open, write: _write, define: _define, saved: _saved, ...draft }) =>
        draft,
    },
  ),
)
