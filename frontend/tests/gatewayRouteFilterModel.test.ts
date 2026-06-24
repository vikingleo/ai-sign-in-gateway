import test from 'node:test'
import assert from 'node:assert/strict'

import {
  activeGatewayRouteFilterCount,
  buildGatewayRouteFilterState,
  clearGatewayRouteTypeFilters,
  clearGatewayRouteFilters,
  isGatewayRouteTypeFilterActive,
  toggleGatewayRouteTypeFilter,
} from '../src/gatewayRouteFilterModel.ts'
import type { GatewayIssueState } from '../src/gatewayViewConfig.ts'
import type { GatewayRoute } from '../src/types.ts'

test('toggles gateway route type filters without mutating previous selections', () => {
  const selected: Array<GatewayRoute['route_type']> = ['codex']

  assert.deepEqual(toggleGatewayRouteTypeFilter(selected, 'gemini'), ['codex', 'gemini'])
  assert.deepEqual(toggleGatewayRouteTypeFilter(selected, 'codex'), [])
  assert.deepEqual(selected, ['codex'])
})

test('counts active route filters using trimmed search text', () => {
  const selectedGroups = ['prod', 'backup']
  const selectedRouteTypes: Array<GatewayRoute['route_type']> = ['codex']
  const selectedIssueStates: GatewayIssueState[] = ['with_error']

  assert.equal(
    activeGatewayRouteFilterCount({
      routeSearch: '  api  ',
      selectedGroups,
      selectedRouteTypes,
      selectedIssueStates,
    }),
    5,
  )
  assert.equal(
    activeGatewayRouteFilterCount({
      routeSearch: '   ',
      selectedGroups: [],
      selectedRouteTypes: [],
      selectedIssueStates: [],
    }),
    0,
  )
})

test('builds gateway route filter state without reusing mutable arrays', () => {
  const selectedGroups = ['prod', 'backup']
  const selectedRouteTypes: Array<GatewayRoute['route_type']> = ['codex']
  const selectedIssueStates: GatewayIssueState[] = ['with_error']

  const state = buildGatewayRouteFilterState({
    routeSearch: ' api ',
    selectedGroups,
    selectedRouteTypes,
    selectedIssueStates,
  })

  assert.deepEqual(state, {
    routeSearch: ' api ',
    selectedGroups,
    selectedRouteTypes,
    selectedIssueStates,
  })
  assert.notEqual(state.selectedGroups, selectedGroups)
  assert.notEqual(state.selectedRouteTypes, selectedRouteTypes)
  assert.notEqual(state.selectedIssueStates, selectedIssueStates)
})

test('builds an empty route filter state for clear actions', () => {
  assert.deepEqual(clearGatewayRouteFilters(), {
    routeSearch: '',
    selectedGroups: [],
    selectedRouteTypes: [],
    selectedIssueStates: [],
  })
})

test('reads and clears route type filter state', () => {
  const selected: Array<GatewayRoute['route_type']> = ['codex', 'gemini']

  assert.equal(isGatewayRouteTypeFilterActive(selected, 'codex'), true)
  assert.equal(isGatewayRouteTypeFilterActive(selected, 'gpt'), false)
  assert.deepEqual(clearGatewayRouteTypeFilters(), [])
})
