import type { Root } from 'mdast'
import { toString as mdastToString } from 'mdast-util-to-string'
import getReadingTime from 'reading-time'
import type { VFile } from 'vfile'

/**
 * Used to add a reading time property to the frontmatter of your Markdown or MDX files.
 *
 * @see https://docs.astro.build/en/recipes/reading-time/
 */
function remarkReadingTime() {
  //
  return (tree: Root, file: VFile) => {
    const frontmatter = file.data.astro?.frontmatter
    // biome-ignore lint/complexity/useLiteralKeys: <explanation>
    if (!frontmatter || frontmatter['minutesRead'] || frontmatter['minutesRead'] === 0) {
      return
    }

    const textOnPage = mdastToString(tree)
    const readingTime = getReadingTime(textOnPage)

    // biome-ignore lint/complexity/useLiteralKeys: <explanation>
    frontmatter['minutesRead'] = Math.max(1, Math.round(readingTime.minutes))
  }
}

export default remarkReadingTime
