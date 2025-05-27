declare module 'commander' {
  export class Command {
    [x: string]: any
    [x: string]: any
    [x: string]: any
    [x: string]: any
    constructor(name?: string)
    option(
      flags: string,
      description?: string,
      defaultValue?: string | boolean | number,
    ): this
    parse(argv?: string[]): this
    opts(): { [key: string]: any }
  }

  export const program: Command
}
