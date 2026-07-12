import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Executive } from './Executive'
import { useExecutiveOverview } from '@/hooks/useExecutiveOverview'

vi.mock('@/hooks/useExecutiveOverview')
const mockedUseExecutiveOverview = vi.mocked(useExecutiveOverview)

const AREA_NAMES = ['Finance', 'Sales', 'Marketing', 'Operations', 'People'] as const

const OVERVIEW_DATA = {
  areas: AREA_NAMES.map((name, index) => ({
    area_id: `area-${index + 1}`,
    name,
    pillar: 'Revenue Growth',
    score: 86.4,
    grade: 'A',
    score_mom_delta: -3.2,
  })),
  pillars: [
    {
      name: 'Revenue Growth',
      areas: [...AREA_NAMES],
      rollup_grade: 'B',
      rollup_score: 78.7,
    },
  ],
  heatmap: AREA_NAMES.map((name, index) => ({
    area_id: `area-${index + 1}`,
    name,
    cells: Array.from({ length: 9 }, (_, periodIndex) => ({
      period: `2024-${String(periodIndex + 1).padStart(2, '0')}-01`,
      grade: 'A',
      score: 70 + periodIndex + index * 10,
    })),
  })),
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
    expect(screen.getAllByText('86').length).toBeGreaterThan(0)

    // Pillar panel
    expect(screen.getAllByText('Revenue Growth').length).toBeGreaterThan(0)
    expect(screen.getByText('78.7')).toBeInTheDocument()

    // Graph-link card
    expect(screen.getByRole('link', { name: /strategy graph/i })).toHaveAttribute('href', '/graph')
  })

  it('rounds an area score card to a whole number instead of showing raw floating point', () => {
    mockedUseExecutiveOverview.mockReturnValue({
      data: {
        ...OVERVIEW_DATA,
        areas: [
          { ...OVERVIEW_DATA.areas[0], score: 86.10672797740617 },
          ...OVERVIEW_DATA.areas.slice(1),
        ],
      },
      loading: false,
      error: null,
    })

    renderPage()

    expect(screen.getAllByText('86').length).toBeGreaterThan(0)
    expect(screen.queryByText('86.10672797740617')).not.toBeInTheDocument()
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

  it('lays out all five department score cards in a single row on wide screens', () => {
    mockedUseExecutiveOverview.mockReturnValue({ data: OVERVIEW_DATA, loading: false, error: null })

    renderPage()

    const financeCard = screen.getByRole('link', { name: /finance/i })
    const cardGrid = financeCard.parentElement
    expect(cardGrid?.children.length).toBe(AREA_NAMES.length)
    expect(cardGrid?.className).toMatch(/lg:grid-cols-5/)
  })

  it('defaults the heatmap to the most recent 6 periods and expands to full history on request', async () => {
    const user = userEvent.setup()
    mockedUseExecutiveOverview.mockReturnValue({ data: OVERVIEW_DATA, loading: false, error: null })

    renderPage()

    const columnHeaders = screen.getAllByRole('columnheader')
    // one header is the "Area" label column, the rest are period columns
    expect(columnHeaders.length - 1).toBe(6)
    expect(screen.queryByText('2024-01')).not.toBeInTheDocument()
    expect(screen.getByText('2024-09')).toBeInTheDocument()

    const expandButton = screen.getByRole('button', { name: /show full history/i })
    await user.click(expandButton)

    const expandedHeaders = screen.getAllByRole('columnheader')
    expect(expandedHeaders.length - 1).toBe(9)
    expect(screen.getByText('2024-01')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show recent/i })).toBeInTheDocument()
  })

  it('shows the numeric score inside each heatmap cell', () => {
    mockedUseExecutiveOverview.mockReturnValue({ data: OVERVIEW_DATA, loading: false, error: null })

    renderPage()

    // last of the 6 default periods for Finance (periodIndex 8 -> score 78)
    expect(screen.getByText('78')).toBeInTheDocument()
  })

  it('stretches the default 6-period heatmap to the full page width but not the expanded view', async () => {
    const user = userEvent.setup()
    mockedUseExecutiveOverview.mockReturnValue({ data: OVERVIEW_DATA, loading: false, error: null })

    renderPage()

    const table = screen.getByRole('table')
    expect(table.className).toMatch(/\bw-full\b/)

    await user.click(screen.getByRole('button', { name: /show full history/i }))

    expect(table.className).not.toMatch(/\bw-full\b/)
  })
})
