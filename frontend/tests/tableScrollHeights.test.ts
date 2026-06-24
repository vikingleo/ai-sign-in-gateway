import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import * as tableScrollHeights from '../src/composables/useTableScrollHeights.ts'

const gatewayViewPath = new URL('../src/views/GatewayView.vue', import.meta.url)
const gatewayPageControllerPath = new URL('../src/gatewayPageController.ts', import.meta.url)
const gatewayPageTableLayoutControllerPath = new URL(
  '../src/gatewayPageTableLayoutController.ts',
  import.meta.url,
)

test('createBindPageTableContainerAction stores only html elements', () => {
  assert.equal(
    typeof tableScrollHeights.createBindPageTableContainerAction,
    'function',
    'createBindPageTableContainerAction should be exported',
  )

  const previousHTMLElement = globalThis.HTMLElement
  class FakeHTMLElement {}
  Object.defineProperty(globalThis, 'HTMLElement', {
    configurable: true,
    value: FakeHTMLElement,
  })

  const htmlElement = new FakeHTMLElement() as HTMLElement
  const componentInstance = { $el: htmlElement }
  const nonHtmlElement = {} as Element
  const state = { value: null as HTMLElement | null }
  const bindPageTableContainer = tableScrollHeights.createBindPageTableContainerAction({
    setContainer: (element) => {
      state.value = element
    },
  })

  try {
    bindPageTableContainer(htmlElement)
    assert.equal(state.value, htmlElement)

    bindPageTableContainer(componentInstance)
    assert.equal(state.value, null)

    bindPageTableContainer(nonHtmlElement)
    assert.equal(state.value, null)

    bindPageTableContainer(null)
    assert.equal(state.value, null)
  } finally {
    Object.defineProperty(globalThis, 'HTMLElement', {
      configurable: true,
      value: previousHTMLElement,
    })
  }
})

test('gateway page table layout controller delegates page table container binding through table scroll helpers', async () => {
  const source = await readFile(gatewayPageTableLayoutControllerPath, 'utf8')
  const handler = source.slice(
    source.indexOf('const bindPageTableContainer = createBindPageTableContainerActionImpl({'),
    source.indexOf('return {'),
  )

  assert.match(source, /import \{ createBindPageTableContainerAction, useTableScrollHeights \} from '\.\/composables\/useTableScrollHeights'/)
  assert.match(handler, /createBindPageTableContainerActionImpl\(\{/)
  assert.match(handler, /setContainer: \(element\) => \{[\s\S]*pageTableContainer\.value = element[\s\S]*\}/)
  assert.doesNotMatch(source, /function bindPageTableContainer\(element: Element \| ComponentPublicInstance \| null\)/)
  assert.doesNotMatch(handler, /instanceof HTMLElement/)
})

test('GatewayView uses gateway page table layout controller instead of table scroll helpers directly', async () => {
  const viewSource = await readFile(gatewayViewPath, 'utf8')
  const pageControllerSource = await readFile(gatewayPageControllerPath, 'utf8')
  const foundationControllerSource = await readFile(
    new URL('../src/gatewayPageFoundationController.ts', import.meta.url),
    'utf8',
  )

  assert.match(viewSource, /useGatewayPageController\(\{/)
  assert.match(pageControllerSource, /useGatewayPageFoundation\(\{/)
  assert.match(foundationControllerSource, /import \{ useGatewayPageTableLayout \} from '\.\/gatewayPageTableLayoutController\.ts'/)
  assert.match(foundationControllerSource, /const tableLayout = useGatewayPageTableLayout\(\)/)
  assert.doesNotMatch(viewSource, /from '\.\.\/composables\/useTableScrollHeights'/)
  assert.doesNotMatch(viewSource, /createBindPageTableContainerAction/)
  assert.doesNotMatch(viewSource, /useTableScrollHeights\(\)/)
})
