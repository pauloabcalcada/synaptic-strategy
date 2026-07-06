import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AreaDashboard } from './AreaDashboard'
import { useAreaDashboard } from '@/hooks/useAreaDashboard'
import { useRoleStore } from '@/store/role-store'

vi.mock('@/hooks/useAreaDashboard')
const mockedUseAreaDashboard = vi.mocked(useAreaDashboard)

const DASHBOARD_DATA = {
  period: '2024-12-01',
  score: 86.4,
  grade: 'A',
  score_mom_delta: -3.2,
  kpis: [
    {
      code: 'FIN_OCR',
      name: 'Operating Cost Ratio',
      unit: 'percentage',
      result: 60.1,
      target: 62.0,
      kpi_score: 82.5,
      status: 'on_track' as const,
      mom_trend: 1.2,
      sparkline: [70, 75, 80, 82.5],
    },
    {
      code: 'GOV_REG',
      name: 'Regulatory Filing On-Time Rate',
      unit: 'percentage',
      result: 0,
      target: 100,
      kpi_score: 0,
      status: 'off_track' as const,
      mom_trend: null,
      sparkline: [100, 0],
    },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AreaDashboard />
    </MemoryRouter>
  )
}

beforeEach(() => {
  useRoleStore.setState({ role: 'manager', areaId: 'area-1' })
})

describe('AreaDashboard', () => {
  it('shows a loading state while the dashboard is fetching', () => {
    mockedUseAreaDashboard.mockReturnValue({ data: null, loading: true, error: null })

    renderPage()

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', () => {
    mockedUseAreaDashboard.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('boom'),
    })

    renderPage()

    expect(screen.getByText(/couldn.t load/i)).toBeInTheDocument()
  })

  it('renders the score badge, grade, and per-KPI status treatment', () => {
    mockedUseAreaDashboard.mockReturnValue({
      data: DASHBOARD_DATA,
      loading: false,
      error: null,
    })

    renderPage()

    expect(screen.getByText('86.4')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('Operating Cost Ratio')).toBeInTheDocument()
    expect(screen.getByText('on_track')).toBeInTheDocument()
    expect(screen.getByText('off_track')).toBeInTheDocument()
  })
})
