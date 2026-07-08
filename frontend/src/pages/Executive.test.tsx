import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Executive } from './Executive'
import { useExecutiveOverview } from '@/hooks/useExecutiveOverview'

vi.mock('@/hooks/useExecutiveOverview')
const mockedUseExecutiveOverview = vi.mocked(useExecutiveOverview)

const OVERVIEW_DATA = {
  areas: [
    {
      area_id: 'area-1',
      name: 'Finance',
      pillar: 'Revenue Growth',
      score: 86.4,
      grade: 'A',
      score_mom_delta: -3.2,
    },
    {
      area_id: 'area-2',
      name: 'Sales',
      pillar: 'Revenue Growth',
      score: 71.0,
      grade: 'B',
      score_mom_delta: 1.5,
    },
  ],
  pillars: [
    {
      name: 'Revenue Growth',
      areas: ['Finance', 'Sales'],
      rollup_grade: 'B',
      rollup_score: 78.7,
    },
  ],
  heatmap: [
    {
      area_id: 'area-1',
      name: 'Finance',
      cells: [{ period: '2024-12-01', grade: 'A', score: 86.4 }],
    },
    {
      area_id: 'area-2',
      name: 'Sales',
      cells: [{ period: '2024-12-01', grade: 'B', score: 71.0 }],
    },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Executive />
    </MemoryRouter>
  )
}

beforeEach(() => {
  mockedUseExecutiveOverview.mockReset()
})

describe('Executive', () => {
  it('shows a loading state while the overview is fetching', () => {
    mockedUseExecutiveOverview.mockReturnValue({ data: null, loading: true, error: null })

    renderPage()

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', () => {
    mockedUseExecutiveOverview.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('boom'),
    })

    renderPage()

    expect(screen.getByText(/couldn.t load/i)).toBeInTheDocument()
  })

  it('renders score cards, the heatmap, the pillar panel, and a graph-link card', () => {
    mockedUseExecutiveOverview.mockReturnValue({ data: OVERVIEW_DATA, loading: false, error: null })

    renderPage()

    // Score cards
    expect(screen.getAllByText('Finance').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Sales').length).toBeGreaterThan(0)
    expect(screen.getByText('86.4')).toBeInTheDocument()

    // Pillar panel
    expect(screen.getAllByText('Revenue Growth').length).toBeGreaterThan(0)
    expect(screen.getByText('78.7')).toBeInTheDocument()

    // Graph-link card
    expect(screen.getByRole('link', { name: /strategy graph/i })).toHaveAttribute('href', '/graph')
  })

  it('renders info buttons for score aggregation, heatmap legend, and pillar grouping', () => {
    mockedUseExecutiveOverview.mockReturnValue({ data: OVERVIEW_DATA, loading: false, error: null })

    renderPage()

    expect(screen.getByRole('button', { name: /score aggregation/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /heatmap legend/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /pillar grouping/i })).toBeInTheDocument()
  })

  it('navigates to the area dashboard when a score card is clicked', async () => {
    const user = userEvent.setup()
    mockedUseExecutiveOverview.mockReturnValue({ data: OVERVIEW_DATA, loading: false, error: null })

    renderPage()

    expect(screen.getByRole('link', { name: /finance/i })).toHaveAttribute(
      'href',
      '/area?id=area-1'
    )
    await user.click(screen.getByRole('link', { name: /finance/i }))
  })
})
