import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StrategyGraph } from './StrategyGraph'
import { useStrategyGraph } from '@/hooks/useStrategyGraph'

vi.mock('@/hooks/useStrategyGraph')
const mockedUseStrategyGraph = vi.mocked(useStrategyGraph)

// @xyflow/react measures nodes via ResizeObserver, which jsdom doesn't provide.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

const GRAPH_DATA = {
  nodes: [
    {
      id: 'FIN_OCR',
      label: 'Operating Cost Ratio',
      department: 'Finance',
      score: 86.4,
      grade: 'A',
      weight: 0.3,
      result: 60.1,
      target: 62.0,
      active_diagnostic: true,
    },
    {
      id: 'FIN_EBITDA',
      label: 'EBITDA Margin',
      department: 'Finance',
      score: 86.4,
      grade: 'A',
      weight: 0.2,
      result: 19.1,
      target: 18.0,
      active_diagnostic: false,
    },
  ],
  edges: [{ source: 'FIN_OCR', target: 'FIN_EBITDA', label: 'impacts' }],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <StrategyGraph />
    </MemoryRouter>
  )
}

beforeEach(() => {
  mockedUseStrategyGraph.mockReset()
})

describe('StrategyGraph', () => {
  it('shows a loading state while the graph is fetching', () => {
    mockedUseStrategyGraph.mockReturnValue({ data: null, loading: true, error: null })

    renderPage()

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows an error state when the fetch fails', () => {
    mockedUseStrategyGraph.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('boom'),
    })

    renderPage()

    expect(screen.getByText(/couldn.t load/i)).toBeInTheDocument()
  })

  it('renders a node per KPI and info buttons for edge direction, node encoding, and relationship labels', () => {
    mockedUseStrategyGraph.mockReturnValue({ data: GRAPH_DATA, loading: false, error: null })

    renderPage()

    expect(screen.getByText('Operating Cost Ratio')).toBeInTheDocument()
    expect(screen.getByText('EBITDA Margin')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reading directed edges/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /node encoding/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /relationship labels/i })).toBeInTheDocument()
  })

  it('renders a warning glyph only on nodes with an active diagnostic', () => {
    mockedUseStrategyGraph.mockReturnValue({ data: GRAPH_DATA, loading: false, error: null })

    renderPage()

    expect(screen.getAllByTitle('Active AI diagnostic')).toHaveLength(1)
  })
})
