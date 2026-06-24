import test from 'node:test'
import assert from 'node:assert/strict'

import { useGatewayRouteFilters } from '../src/gatewayRouteFilterController.ts'

test('builds route filter state from mutable filter refs', () => {
  const filters = useGatewayRouteFilters()
  filters.routeSearch.value = ' api '
  filters.selectedGroups.value = ['prod']
  filters.selectedRouteTypes.value = ['codex']
  filters.selectedIssueStates.value = ['with_error']

  assert.deepEqual(filters.state.value, {
    routeSearch: ' api ',
    selectedGroups: ['prod'],
    selectedRouteTypes: ['codex'],
    selectedIssueStates: ['with_error'],
  })
  assert.equal(filters.activeCount.value, 4)
})

test('toggles route type filters through controller state', () => {
  const filters = useGatewayRouteFilters()

  filters.toggleRouteType('codex')
  filters.toggleRouteType('gemini')
  filters.toggleRouteType('codex')

  assert.deepEqual(filters.selectedRouteTypes.value, ['gemini'])
  assert.equal(filters.isRouteTypeActive('gemini'), true)
  assert.equal(filters.isRouteTypeActive('codex'), false)
})

test('clears route filters through controller actions', () => {
  const filters = useGatewayRouteFilters()
  filters.routeSearch.value = ' api '
  filters.selectedGroups.value = ['prod']
  filters.selectedRouteTypes.value = ['codex']
  filters.selectedIssueStates.value = ['with_error']

  filters.clearRouteTypes()
  assert.deepEqual(filters.selectedRouteTypes.value, [])
  assert.equal(filters.activeCount.value, 3)

  filters.clearFilters()

  assert.deepEqual(filters.state.value, {
    routeSearch: '',
    selectedGroups: [],
    selectedRouteTypes: [],
    selectedIssueStates: [],
  })
  assert.equal(filters.activeCount.value, 0)
})
