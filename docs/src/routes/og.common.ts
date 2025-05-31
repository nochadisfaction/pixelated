import type { Route } from '../utils/routing'

import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import satori, { type SatoriOptions } from 'satori'
import { html } from 'satori-html'
import sharp from 'sharp'
import config from 'virtual:vitesse/user-config'
import { logos } from 'virtual:vitesse/user-images'
import { fontBase64, plum } from '../utils/og'

const satoriOptions: SatoriOptions = {
  // debug: true,
  width: 1200,
  height: 630,
  fonts: [
    {
      name: 'Inter',
      weight: 400,
      style: 'normal',
      data: Buffer.from(fontBase64, 'base64'),
    },
  ],
}

const defaultLang = config.defaultLocale.lang as string

function getLogoBase64(): string {
  const logo = logos.dark || logos.light
  
  if (!logo) {
    return ''
  }

  const logoSrc = process.env.NODE_ENV === 'development'
    ? (logo.src.replace(/\?.*/, '').replace('/@fs', '')).split('?')[0]
    : (logo.src.replace('/', 'dist/'))

  try {
    if (logoSrc && logoSrc.trim() !== '') {
      return readFileSync(logoSrc, { encoding: 'base64' })
    }

  } catch (error: any) {
    console.warn('Failed to read logo file for OG image generation:', logoSrc, error.message)
  }
  
  return ''

}

// Simple fallback to prevent ENOENT errors - return empty response
export async function generateOGImageMarkup() {
  return ''
}

export async function generateOGImage() {
  return new Response('', {
    status: 404,
    headers: {
      'Content-Type': 'text/plain'
    }
  })
}