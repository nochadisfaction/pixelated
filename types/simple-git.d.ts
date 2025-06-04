declare module 'simple-git' {
  interface SimpleGit {
    add: (files: string | string[]) => Promise<void>
    commit: (message: string) => Promise<void>
    push: (remote?: string, branch?: string, options?: any) => Promise<void>
    // Add other methods as needed
  }

  export function simpleGit(baseDir?: string, options?: any): SimpleGit
}
