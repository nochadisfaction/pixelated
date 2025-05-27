/* eslint-disable ts/explicit-function-return-type */
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

const logo = logos.dark || logos.light

const logoSrc = logo
  ? process.env.NODE_ENV === 'development'
    ? (logo.src.replace(/\?.*/, '').replace('/@fs', '')).split('?')[0]
    : (logo.src.replace('/', 'dist/'))
  : ''

const logoBase64 = readFileSync(logoSrc, { encoding: 'base64' })

export async function generateOGImageMarkup(props: Route) {
  const lines = props.entry.data.title.split(/(.{0,30})(?:\s|$)/g).filter(Boolean)
  const data: Record<string, string> = {
    line1: lines[0],
    line2: lines[1],
    line3: lines[2],
  }

  return html`<div tw="relative flex justify-center items-center w-full h-full" style="font-family: 'Inter'">
    <img
      tw="absolute inset-0 w-full h-full"
      src="${plum}"
      alt="open graph"
    />
    <div tw="flex items-center justify-start w-full px-18" style="gap: 20px">
      <div tw="self-start flex justify-center items-center">
        <img
          tw="w-28 h-28"
          src="data:image/${logo?.format === 'svg' ? 'svg+xml' : logo?.format};base64,${logoBase64}"
        />
      </div>

      <div tw="flex flex-col" style="gap: 10px">
        <div tw="text-[#858585] text-2.1rem">${config.title[defaultLang]}</div>
        <div tw="text-white text-3.1rem leading-relaxed mr-18 flex">${data.line1}</div>
      </div>
    </div>
  </div>`
}

export async function generateOGImage(props: Route) {
  const markup = await generateOGImageMarkup(props)
  const svg = await satori(markup, satoriOptions)
  const png = sharp(Buffer.from(svg)).png()
  const response = await png.toBuffer()

  return response
}
