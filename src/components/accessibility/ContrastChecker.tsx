import type { ChangeEvent } from 'react'
import { useState } from 'react'

export function ContrastChecker() {
  const [color1, setColor1] = useState('#FFFFFF')
  const [color2, setColor2] = useState('#000000')

  return (
    <div>
      <div>
        <label>
          Color 1:
          <input
            type="color"
            value={color1}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setColor1(e.target.value)
            }
          />
        </label>
      </div>
      <div>
        <label>
          Color 2:
          <input
            type="color"
            value={color2}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setColor2(e.target.value)
            }
          />
        </label>
      </div>
    </div>
  )
}
