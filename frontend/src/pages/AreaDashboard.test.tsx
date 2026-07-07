import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AreaDashboard } from './AreaDashboard'
import { useAreaDashboard } from '@/hooks/useAreaDashboard'
import { useAreas } from '@/hooks/useAreas'
import { useRoleStore } from '@/store/role-store'

vi.mock('@/hooks/useAreaDashboard')
vi.mock('@/hooks/useAreas')
const mockedUseAreaDashboard = vi.mocked(useAreaDashboard)
const mockedUseAreas = vi.mocked(useAreas)

const AREAS = [
  { id: 'area-1', name: 'Sales', pillar: 'Growth', score: 82.3, grade: 'B' },
  { id: 'area-2', name: 'Support', pillar: 'Ops', score: 91.0, grade: 'A' },
]

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
  useRoleStore.setState({ role: 'manager', areaId: 'area-1', profileLabel: 'Sales Manager' })
  mockedUseAreas.mockReturnValue({ areas: null, loading: false, error: null })
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

  it('renders info buttons for the score formula, grade brackets, status thresholds, MoM trend, and chart reading guide', () => {
    mockedUseAreaDashboard.mockReturnValue({
      data: DASHBOARD_DATA,
      loading: false,
      error: null,
    })

    renderPage()

    expect(screen.getByRole('button', { name: /department score formula/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /grade brackets/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /kpi status thresholds/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /month-over-month trend/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reading the trend chart/i })).toBeInTheDocument()
  })

  it('links each KPI to the indicator detail page tagged with the current area', () => {
    mockedUseAreaDashboard.mockReturnValue({
      data: DASHBOARD_DATA,
      loading: false,
      error: null,
    })

    renderPage()

    expect(screen.getByRole('link', { name: /operating cost ratio/i })).toHaveAttribute(
      'href',
      '/indicator?code=FIN_OCR&areaId=area-1'
    )
  })

  it('does not show an area picker for a manager', () => {
    mockedUseAreaDashboard.mockReturnValue({ data: DASHBOARD_DATA, loading: false, error: null })
    mockedUseAreas.mockReturnValue({ areas: AREAS, loading: false, error: null })

    renderPage()

    expect(screen.queryByRole('combobox', { name: /area/i })).not.toBeInTheDocument()
  })

  it('shows an area picker for an executive, defaulting to the first area', () => {
    useRoleStore.setState({ role: 'executive', areaId: null, profileLabel: 'Executive' })
    mockedUseAreas.mockReturnValue({ areas: AREAS, loading: false, error: null })
    mockedUseAreaDashboard.mockReturnValue({ data: DASHBOARD_DATA, loading: false, error: null })

    renderPage()

    expect(screen.getByRole('combobox', { name: /area/i })).toHaveValue('area-1')
    expect(mockedUseAreaDashboard).toHaveBeenCalledWith('area-1')
  })

  it('lets an admin switch which area the dashboard shows', async () => {
    const user = userEvent.setup()
    useRoleStore.setState({ role: 'admin', areaId: null, profileLabel: 'Admin' })
    mockedUseAreas.mockReturnValue({ areas: AREAS, loading: false, error: null })
    mockedUseAreaDashboard.mockReturnValue({ data: DASHBOARD_DATA, loading: false, error: null })

    renderPage()
    await user.selectOptions(screen.getByRole('combobox', { name: /area/i }), 'area-2')

    expect(mockedUseAreaDashboard).toHaveBeenLastCalledWith('area-2')
    expect(screen.getByRole('link', { name: /operating cost ratio/i })).toHaveAttribute(
      'href',
      '/indicator?code=FIN_OCR&areaId=area-2'
    )
  })
})
