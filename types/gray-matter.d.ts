declare module 'gray-matter' {
  export interface GrayMatterFile<T = any> {
    data: any
    content: T
    excerpt?: T
    orig: T
    language: string
    matter: string
    stringify: (lang: string) => T
  }

  function matter<T = string>(
    content: T,
    options?: {
      excerpt?: boolean | ((instance: GrayMatterFile<T>) => void)
      excerpt_separator?: string
      engines?: Record<string, any>
      language?: string
      delimiters?: string | [string, string]
    },
  ): GrayMatterFile<T>

  namespace matter {
    export function stringify<T = string>(
      content: T,
      data: any,
      options?: { language?: string; delimiters?: [string, string] },
    ): string

    export function read(
      filepath: string,
      options?: {
        excerpt?: boolean | ((instance: GrayMatterFile<string>) => void)
        excerpt_separator?: string
        engines?: Record<string, any>
        language?: string
        delimiters?: string | [string, string]
      },
    ): GrayMatterFile<string>
  }

  export = matter
}
