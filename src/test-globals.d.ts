import type {} from '@vue/test-utils'

declare module '@vue/test-utils' {
  interface DOMWrapper<NodeType extends Node> {
    element: HTMLInputElement
  }
}
