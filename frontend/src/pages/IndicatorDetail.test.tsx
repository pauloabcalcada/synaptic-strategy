import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { IndicatorDetail } from './IndicatorDetail'
import { useIndicator } from '@/hooks/useIndicator'

vi.mock('@/hooks/useIndicator')
const mockedUseIndicator = vi.mocked(useIndicator)

const INDICATOR_DATA = {
  name: 'Operating Cost Ratio',
  code: 'FIN_OCR',
  unit: 'percentage',
  polarity: 'lower_is_better' as const,
  calculation_method: 'Operating expenses divided by total revenue.',
  composition: 'Payroll + infrastructure + marketing + G&A costs.',
  accumulation_type: 'last' as const,
  kpi_type: 'numerical' as const,
  period: '2024-12-01',
  result: 60.1,
  target: 62.0,
  kpi_score: 82.5,
  status: 'on_track' as const,
  history: [
    { period: '2024-11-01', result: 61.0, target: 62.0, kpi_score: 78.0, status: 'on_track' as const },
    { period: '2024-12-01', result: 60.1, target: 62.0, kpi_score: 82.5, status: 'on_track' as const },
  ],
}

function renderPage(code = 'FIN_OCR') {
  return render(
    <MemoryRouter initialEntries={[`/indicator?code=${code}`]}>
      <IndicatorDetail />
    </MemoryRouter>
  )
}

beforeEach(() => {
  mockedUseIndicator.mockReset()
})

describe('IndicatorDetail', () => {
  it('shows a loading state while the indicator is fetching', () => {
    mockedUseIndicator.mockReturnValue({ data: null, loading: true, error: null })

    renderPage()

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', () => {
    mockedUseIndicator.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('boom'),
    })

    renderPage()

    expect(screen.getByText(/couldn.t load/i)).toBeInTheDocument()
  })

  it('renders the metadata block and current result/target/score/status', () => {
    mockedUseIndicator.mockReturnValue({
      data: INDICATOR_DATA,
      loading: false,
      error: null,
    })

    renderPage()

    expect(screen.getByText('Operating Cost Ratio')).toBeInTheDocument()
    expect(screen.getByText(INDICATOR_DATA.calculation_method)).toBeInTheDocument()
    expect(screen.getByText(INDICATOR_DATA.composition)).toBeInTheDocument()
    expect(screen.getByText('82.5')).toBeInTheDocument()
    expect(screen.getByText('on_track')).toBeInTheDocument()
  })
})
