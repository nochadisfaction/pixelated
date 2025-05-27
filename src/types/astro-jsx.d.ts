/**
 * Global TypeScript declarations for Astro JSX elements
 * Prevents "JSX element implicitly has type 'any'" errors
 */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }

    interface HTMLAttributes {
      class?: string
      [key: string]: any
    }

    // Add Element type for components that return JSX.Element
    type Element = any

    // Add ElementClass for class components
    interface ElementClass {
      render: any
    }

    // Add ElementAttributesProperty for props type inference
    interface ElementAttributesProperty {
      props: {}
    }
  }
}

export {}
