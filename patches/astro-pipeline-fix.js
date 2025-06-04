// Patched version of pipeline.js with Buffer fix
import { getServerOutputDirectory } from './node_modules/.pnpm/astro@5.7.5_@azure+cosmos@4.3.0_@azure+data-tables@13.3.0_@azure+storage-blob@12.27.0_@_24b03433faf428bf3a23e429310c1629/node_modules/astro/dist/prerender/utils.js'
import {
  BEFORE_HYDRATION_SCRIPT_ID,
  PAGE_SCRIPT_ID,
} from './node_modules/.pnpm/astro@5.7.5_@azure+cosmos@4.3.0_@azure+data-tables@13.3.0_@azure+storage-blob@12.27.0_@_24b03433faf428bf3a23e429310c1629/node_modules/astro/dist/vite-plugin-scripts/index.js'
import {
  routeIsFallback,
  routeIsRedirect,
} from './node_modules/.pnpm/astro@5.7.5_@azure+cosmos@4.3.0_@azure+data-tables@13.3.0_@azure+storage-blob@12.27.0_@_24b03433faf428bf3a23e429310c1629/node_modules/astro/dist/core/redirects/helpers.js'
import { RedirectSinglePageBuiltModule } from './node_modules/.pnpm/astro@5.7.5_@azure+cosmos@4.3.0_@azure+data-tables@13.3.0_@azure+storage-blob@12.27.0_@_24b03433faf428bf3a23e429310c1629/node_modules/astro/dist/core/redirects/index.js'
import { Pipeline } from './node_modules/.pnpm/astro@5.7.5_@azure+cosmos@4.3.0_@azure+data-tables@13.3.0_@azure+storage-blob@12.27.0_@_24b03433faf428bf3a23e429310c1629/node_modules/astro/dist/core/render/index.js'
import {
  createAssetLink,
  createStylesheetElementSet,
} from './node_modules/.pnpm/astro@5.7.5_@azure+cosmos@4.3.0_@azure+data-tables@13.3.0_@azure+storage-blob@12.27.0_@_24b03433faf428bf3a23e429310c1629/node_modules/astro/dist/core/render/ssr-element.js'
import { createDefaultRoutes } from './node_modules/.pnpm/astro@5.7.5_@azure+cosmos@4.3.0_@azure+data-tables@13.3.0_@azure+storage-blob@12.27.0_@_24b03433faf428bf3a23e429310c1629/node_modules/astro/dist/core/routing/default.js'
import { findRouteToRewrite } from './node_modules/.pnpm/astro@5.7.5_@azure+cosmos@4.3.0_@azure+data-tables@13.3.0_@azure+storage-blob@12.27.0_@_24b03433faf428bf3a23e429310c1629/node_modules/astro/dist/core/routing/rewrite.js'
import { getOutDirWithinCwd } from './node_modules/.pnpm/astro@5.7.5_@azure+cosmos@4.3.0_@azure+data-tables@13.3.0_@azure+storage-blob@12.27.0_@_24b03433faf428bf3a23e429310c1629/node_modules/astro/dist/core/build/common.js'
import {
  cssOrder,
  getPageData,
  mergeInlineCss,
} from './node_modules/.pnpm/astro@5.7.5_@azure+cosmos@4.3.0_@azure+data-tables@13.3.0_@azure+storage-blob@12.27.0_@_24b03433faf428bf3a23e429310c1629/node_modules/astro/dist/core/build/internal.js'
import {
  ASTRO_PAGE_MODULE_ID,
  ASTRO_PAGE_RESOLVED_MODULE_ID,
} from './node_modules/.pnpm/astro@5.7.5_@azure+cosmos@4.3.0_@azure+data-tables@13.3.0_@azure+storage-blob@12.27.0_@_24b03433faf428bf3a23e429310c1629/node_modules/astro/dist/core/build/plugins/plugin-pages.js'
import {
  getPagesFromVirtualModulePageName,
  getVirtualModulePageName,
} from './node_modules/.pnpm/astro@5.7.5_@azure+cosmos@4.3.0_@azure+data-tables@13.3.0_@azure+storage-blob@12.27.0_@_24b03433faf428bf3a23e429310c1629/node_modules/astro/dist/core/build/plugins/util.js'
import { i18nHasFallback } from './node_modules/.pnpm/astro@5.7.5_@azure+cosmos@4.3.0_@azure+data-tables@13.3.0_@azure+storage-blob@12.27.0_@_24b03433faf428bf3a23e429310c1629/node_modules/astro/dist/core/build/util.js'

// Import Buffer from the buffer module
import { Buffer } from 'buffer'

// Add Buffer to global namespace to fix the error
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer
}

// The rest of the pipeline.js implementation would go here

// Export the BuildPipeline class (stub for demonstration)
export class BuildPipeline extends Pipeline {
  constructor(
    internals,
    manifest,
    options,
    config = options.settings.config,
    settings = options.settings,
    defaultRoutes = createDefaultRoutes(manifest),
  ) {
    // Original constructor implementation
    super(
      options.logger,
      manifest,
      options.runtimeMode,
      manifest.renderers,
      null,
      settings.buildOutput === 'server',
      settings.buildOutput === 'server',
    )
    this.internals = internals
    this.manifest = manifest
    this.options = options
    this.config = config
    this.settings = settings
    this.defaultRoutes = defaultRoutes
  }

  static async retrieveManifest(settings, internals) {
    const baseDirectory = getServerOutputDirectory(settings)
    const manifestEntryUrl = new URL(
      `${internals.manifestFileName}?time=${Date.now()}`,
      baseDirectory,
    )

    // Import the manifest with Buffer fix applied
    const manifestModule = await import(manifestEntryUrl.toString())
    const { manifest } = manifestModule

    if (!manifest) {
      throw new Error(
        "Astro couldn't find the emitted manifest. This is an internal error, please file an issue.",
      )
    }

    const renderersEntryUrl = new URL(
      `renderers.mjs?time=${Date.now()}`,
      baseDirectory,
    )
    const renderers = await import(renderersEntryUrl.toString())

    const middleware = internals.middlewareEntryPoint
      ? async function () {
          const mod = await import(internals.middlewareEntryPoint.toString())
          return { onRequest: mod.onRequest }
        }
      : manifest.middleware

    return {
      manifest: Object.assign(manifest, {
        middleware,
      }),
      renderers,
    }
  }
}
