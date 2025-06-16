/**
 * This module provides a unified search interface for both server and client environments.
 * It uses dynamic imports to prevent SSR issues with browser-only dependencies.
 */

// Types we need in both environments
export interface SearchDocument {
  id: string | number
  title: string
  content: string
  url: string
  tags?: string[]
  category?: string
}

export interface SearchResult {
  id: string | number
  title: string
  content: string
  url: string
  score?: number
  matches?: Array<{ field: string; match: string }>
}

export interface SearchConfig {
  tokenize?: string
  resolution?: number
  optimize?: boolean
  cache?: boolean | number
}

export interface SearchOptions {
  limit?: number
  threshold?: number
  boost?: Record<string, number>
  suggest?: boolean
}

export interface IndexOptions {
  tokenize?: string
  resolution?: number
  optimize?: boolean
  context?: boolean
}

export interface ISearchClient {
  search(query: string, options?: SearchOptions): SearchResult[]
  importDocuments(documents: SearchDocument[]): void
}

// Define post structure for content collections
export interface BlogPost {
  slug: string
  data: {
    title: string
    tags?: string[]
    category?: string
  }
}

// Define blogSearch interface for content collections
export interface PostInput {
  slug: string;
  data: {
    title: string;
    tags?: string[];
    category?: string;
  };
}

export interface BlogSearchInterface {
  addPost: (post: PostInput, content: string) => void
  search: (query: string) => SearchResult[]
  _posts: SearchDocument[]
}

// Declare global extensions for browser environment
declare global {
  interface Window {
    searchClient: ISearchClient
    _pendingSearchDocs: SearchDocument[]
  }
}

// Server-side compatible dummy implementation
class ServerSearchClient implements ISearchClient {
  search(): SearchResult[] {
    return []
  }
  importDocuments(): void {
    /* No-op on server */
  }
}

// Blog search implementation for API route
export const blogSearch: BlogSearchInterface = {
  _posts: [] as SearchDocument[],

  addPost(post: PostInput, content: string) {
    // Extract a summary for search results (first 200 chars)
    const summary = content.slice(0, 200).replace(/<[^>]*>?/gm, '')

    // Create a search document
    const doc: SearchDocument = {
      id: post.slug,
      title: post.data.title,
      content: summary,
      url: `/blog/${post.slug}`,
      tags: post.data.tags || [],
      category: post.data.category,
    }

    // Add to local store
    this._posts.push(doc)

    // If client is available, also add to search index
    if (typeof window !== 'undefined' && window.searchClient) {
      window.searchClient.importDocuments([doc])
    }
  },

  search(query: string): SearchResult[] {
    // In browser, use the real search client
    if (typeof window !== 'undefined' && window.searchClient) {
      return window.searchClient.search(query)
    }

    // Simple server-side fallback that does basic text matching
    if (!query) {
      return []
    }

    const lowerQuery = query.toLowerCase()
    return this._posts
      .filter((post: SearchDocument) => {
        return (
          post.title.toLowerCase().includes(lowerQuery) ||
          post.content.toLowerCase().includes(lowerQuery) ||
          post.tags?.some((tag: string) =>
            tag.toLowerCase().includes(lowerQuery),
          )
        )
      })
      .map((post: SearchDocument) => ({
        ...post,
        score: 1,
        matches: [{ field: 'title', match: post.title }],
      }))
  },
}

// Helper function to create a search document
export function createSearchDocument(
  id: string | number,
  title: string,
  content: string,
  url: string,
  tags?: string[],
  category?: string,
): SearchDocument {
  return {
    id,
    title,
    content,
    url,
    tags,
    category,
  }
}

// Create a client-side implementation with a safer approach for lazy loading
let searchClientInstance: ISearchClient = new ServerSearchClient()

// Only execute browser-specific code in browser environment
if (typeof window !== 'undefined') {
  // Safe storage for documents until real implementation loads
  window._pendingSearchDocs = window._pendingSearchDocs || []

  // Create a proxy client that stores documents and forwards to real implementation when ready
  const proxyClient: ISearchClient = {
    search(query: string, options?: SearchOptions): SearchResult[] {
      return searchClientInstance.search(query, options)
    },
    importDocuments(documents: SearchDocument[]): void {
      if (searchClientInstance instanceof ServerSearchClient) {
        // Store documents for when real client loads
        window._pendingSearchDocs = [...window._pendingSearchDocs, ...documents]
      } else {
        // Forward to real implementation
        searchClientInstance.importDocuments(documents)
      }
    },
  }

  // Make client available globally
  window.searchClient = proxyClient

    // Dynamically load the browser implementation
    // Using top-level await in an IIFE to avoid blocking
    ; (async () => {
      try {
        // Dynamic import with explicit .ts extension to help bundlers
        const { initBrowserSearch } = await import('./search-browser.js')
        const realClient = await initBrowserSearch()

        // Import any pending documents
        if (window._pendingSearchDocs.length > 0) {
          realClient.importDocuments(window._pendingSearchDocs)
          window._pendingSearchDocs = []
        }

        // Update the instance
        searchClientInstance = realClient
      } catch (error) {
        console.error('Failed to load search implementation:', error)
      }
    })()

  // Export the proxy client
  searchClientInstance = proxyClient
}

// Export the client instance
export const searchClient = searchClientInstance

// Note: This module is designed for ESM environments (Astro, Vite, etc.)
// All exports are available as named exports for modern import syntax
// For legacy CommonJS environments, use dynamic imports instead:
// const { blogSearch, searchClient, createSearchDocument } = await import('./search.js')
