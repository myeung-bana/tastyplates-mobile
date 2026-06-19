import assert from 'node:assert/strict'

import {
  computeTrustSet,
  computeTrustSetForRegion,
  resolveTrustSet,
} from './cuisineTaxonomy'

function runCuisineTaxonomyTests(): void {
  assert.deepEqual(
    computeTrustSet('japanese', ['korean', 'chinese']),
    ['korean', 'chinese'],
  )

  assert.deepEqual(computeTrustSet('japanese', ['japanese']), ['japanese'])

  assert.deepEqual(computeTrustSet('japanese', ['indian']), [])

  assert.deepEqual(computeTrustSetForRegion('East Asian', ['korean']), ['korean'])

  assert.deepEqual(
    resolveTrustSet({ cuisineParam: 'East Asian', userPalate: ['korean', 'chinese'] }),
    ['korean', 'chinese'],
  )

  assert.deepEqual(
    resolveTrustSet({ cuisineParam: 'japanese', userPalate: ['korean', 'chinese'] }),
    ['korean', 'chinese'],
  )
}

runCuisineTaxonomyTests()
