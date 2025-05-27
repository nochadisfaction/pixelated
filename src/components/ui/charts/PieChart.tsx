import React from 'react'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Pie } from 'react-chartjs-2'

ChartJS.register(ArcElement, Tooltip, Legend)

interface PieChartProps {
  data: number[]
  labels: string[]
  colors?: string[]
  className?: string
}

export function PieChart({
  data,
  labels,
  colors = ['#8b5cf6', '#6366f1', '#ec4899', '#14b8a6', '#f59e0b'],
  className = '',
}: PieChartProps) {
  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: colors,
        borderColor: colors.map((color) => color + '40'),
        borderWidth: 1,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#9ca3af',
          padding: 16,
          font: {
            size: 12,
          },
        },
      },
    },
  }

  return (
    <div className={`w-full h-full min-h-[300px] ${className}`}>
      <Pie data={chartData} options={options} />
    </div>
  )
}
