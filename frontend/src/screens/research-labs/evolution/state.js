/** The Evolution Lab's choices, kept between visits. */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_SCOPE } from '@/lib/scope'
export const useEvolutionLab = create()(
  persist(
    () => ({
      region: DEFAULT_SCOPE.region,
      delay: DEFAULT_SCOPE.delay,
      universe: DEFAULT_SCOPE.universe,
      seedIds: [],
      cores: null,
      simulations: null,
      population: null,
      neutralizations: [],
      mutationRate: 0.05,
      autoJobId: null,
      appliedJobId: null,
    }),
    {
      name: 'alpha-harness-evolution-lab',
      // Version 1 leaves cores unchosen, so Settings' default for new tasks applies.
      version: 1,
      migrate: (stored) => ({
        ...stored,
        cores: null,
      }),
    },
  ),
)
