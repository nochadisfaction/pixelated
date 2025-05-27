import React, { Children } from 'react'

interface StepsProps {
  children: React.ReactNode
}

export function Steps({ children }: StepsProps) {
  const stepsArray = Children.toArray(children)

  return (
    <div className="steps-container mb-8">
      {stepsArray.map((step, index) => (
        <div
          key={index}
          className="step-item mb-6 pl-8 border-l-2 border-gray-200 relative"
        >
          <div className="step-circle absolute -left-3 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm">
            {index + 1}
          </div>
          <div className="step-content">{step}</div>
        </div>
      ))}
    </div>
  )
}
