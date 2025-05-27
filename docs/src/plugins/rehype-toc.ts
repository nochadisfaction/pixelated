import type { RehypePlugin } from '@astrojs/markdown-remark'
import { findAndReplace } from 'hast-util-find-and-replace'
import { visit } from 'unist-util-visit'

export const rehypeToc: RehypePlugin = () => {
  return (tree, file: any) => {
    let replaced = false
    visit(tree, (node) => {
      findAndReplace(node, [/\[\[toc\]\]/gi, (text) => {
        if (!replaced) {
          file.data.astro.frontmatter.hasToc = true
          replaced = true
          return
        }
        return text // Return the original text if already replaced
      }])
    })
  }
}
