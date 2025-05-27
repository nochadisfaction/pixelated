import project from 'virtual:vitesse/project-context'
import { createPathFormatter } from './create-path-formatter'

export const formatPath = createPathFormatter({
  format: project.build.format,
  trailingSlash: project.trailingSlash,
})
