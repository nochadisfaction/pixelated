import React, { useState, useEffect, useMemo } from 'react'

import { DashboardWidget } from './DashboardWidget'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Download, Search, ArrowUp, ArrowDown } from 'lucide-react'

export interface Column {
  key: string
  label: string
  render?: (value: any, row: any) => React.ReactNode
  sortable?: boolean
  filterable?: boolean
}

export interface TableWidgetProps {
  title: string
  description?: string
  columns: Column[]
  data: Record<string, any>[]
  isLoading?: boolean
  className?: string
  refreshInterval?: number
  enableSearch?: boolean
  enableExport?: boolean
  fetchData?: () => Promise<Record<string, any>[]>
  pagination?: {
    pageSize: number
    initialPage?: number
  }
}

export function TableWidget({
  title,
  description,
  columns,
  data: initialData,
  isLoading: initialLoading = false,
  className = '',
  refreshInterval,
  enableSearch = true,
  enableExport = true,
  fetchData,
  pagination,
}: TableWidgetProps) {
  const [data, setData] = useState<Record<string, any>[]>(initialData)
  const [isLoading, setIsLoading] = useState(initialLoading)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)
  const [currentPage, setCurrentPage] = useState(pagination?.initialPage || 1)

  useEffect(() => {
    const loadData = async () => {
      if (fetchData) {
        try {
          setIsLoading(true)
          const newData = await fetchData()
          setData(newData)
        } catch (error) {
          console.error('Error fetching table data:', error)
        } finally {
          setIsLoading(false)
        }
      }
    }

    loadData()

    if (refreshInterval && fetchData) {
      const interval = setInterval(loadData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [fetchData, refreshInterval])

  // Handle refresh
  const handleRefresh = async () => {
    if (fetchData) {
      try {
        setIsLoading(true)
        const newData = await fetchData()
        setData(newData)
      } catch (error) {
        console.error('Error refreshing table data:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  // Handle sorting
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'

    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }

    setSortConfig({ key, direction })
  }

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1) // Reset to first page on search
  }

  // Handle export
  const handleExport = () => {
    const headers = columns.map((col) => col.label).join(',')
    const rows = filteredData
      .map((row) =>
        columns
          .map((col) => {
            const value = row[col.key]
            // Handle values with commas by quoting them
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value}"`
            }
            return value
          })
          .join(','),
      )
      .join('\n')

    const csv = `${headers}\n${rows}`

    // Create a download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.setAttribute('href', url)
    link.setAttribute(
      'download',
      `${title.toLowerCase().replace(/\s+/g, '-')}-export.csv`,
    )
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter and sort data
  const filteredData = useMemo(() => {
    // First filter the data
    let filtered = [...data]

    if (searchTerm) {
      const lowercasedSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter((row) =>
        columns.some((column) => {
          const value = row[column.key]
          if (value === null || value === undefined) {
            return false
          }
          return String(value).toLowerCase().includes(lowercasedSearchTerm)
        }),
      )
    }

    // Then sort the data
    if (sortConfig) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] === null) {
          return 1
        }
        if (b[sortConfig.key] === null) {
          return -1
        }

        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }

    return filtered
  }, [data, searchTerm, sortConfig, columns])

  // Pagination
  const paginatedData = useMemo(() => {
    if (!pagination) {
      return filteredData
    }

    const startIndex = (currentPage - 1) * pagination.pageSize
    return filteredData.slice(startIndex, startIndex + pagination.pageSize)
  }, [filteredData, pagination, currentPage])

  // Calculate total pages
  const totalPages = pagination
    ? Math.ceil(filteredData.length / pagination.pageSize)
    : 1

  // Custom actions
  const actions = (
    <fieldset className="flex space-x-2" aria-label="Table controls">
      <legend className="sr-only">Table controls</legend>
      {enableSearch && (
        <div className="relative w-48">
          <label htmlFor="table-search" className="sr-only">
            Search table
          </label>
          <Input
            id="table-search"
            placeholder="Search..."
            value={searchTerm}
            onChange={handleSearch}
            className="pl-8"
          />

          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
        </div>
      )}
      {enableExport && (
        <Button
          size="sm"
          variant="outline"
          className="flex items-center gap-1"
          onClick={handleExport}
        >
          <Download className="h-4 w-4" />
          <span className="sr-only md:not-sr-only">Export</span>
        </Button>
      )}
    </fieldset>
  )

  return (
    <DashboardWidget
      title={title}
      description={description}
      isLoading={isLoading}
      onRefresh={fetchData ? handleRefresh : undefined}
      className={className}
      actions={actions}
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>
                  {column.sortable ? (
                    <button
                      className="flex items-center space-x-1 text-left font-medium"
                      onClick={() => requestSort(column.key)}
                    >
                      <span>{column.label}</span>
                      {sortConfig?.key === column.key &&
                        (sortConfig.direction === 'asc' ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        ))}
                    </button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody aria-live="polite">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column) => (
                    <TableCell key={`${rowIndex}-${column.key}`}>
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key] !== undefined
                          ? String(row[column.key])
                          : '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center py-8 text-gray-500"
                >
                  {searchTerm ? 'No results found.' : 'No data available.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            Showing{' '}
            {Math.min(
              (currentPage - 1) * pagination.pageSize + 1,
              filteredData.length,
            )}{' '}
            to{' '}
            {Math.min(currentPage * pagination.pageSize, filteredData.length)}{' '}
            of {filteredData.length} results
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </DashboardWidget>
  )
}
