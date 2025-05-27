declare module '@mui/material' {
  import type * as React from 'react'

  export const Box: React.FC<{
    sx?: Record<string, any>
    children?: React.ReactNode
    [key: string]: any
  }>

  export const CircularProgress: React.FC<{
    size?: number | string
    [key: string]: any
  }>

  export const Typography: React.FC<{
    variant?:
      | 'h1'
      | 'h2'
      | 'h3'
      | 'h4'
      | 'h5'
      | 'h6'
      | 'body1'
      | 'body2'
      | 'subtitle1'
      | 'subtitle2'
    sx?: Record<string, any>
    children?: React.ReactNode
    [key: string]: any
  }>
}
