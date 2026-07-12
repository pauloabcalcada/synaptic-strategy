import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AreaDashboard } from './AreaDashboard'
import { useAreaDashboard } from '@/hooks/useAreaDashboard'
import { useAreaCommentary } from '@/hooks/useAreaCommentary'
import { useAreaAiSummary } from '@/hooks/useAreaAiSummary'
import { useAreas } from '@/hooks/useAreas'
import { useChat } from '@/hooks/useChat'
import { useRoleStore } from '@/store/role-store'

vi.mock('@/hooks/useAreaDashboard')
vi.mock('@/hooks/useAreaCommentary')
vi.mock('@/hooks/useAreaAiSummary')
vi.mock('@/hooks/useAreas')
vi.mock('@/hooks/useChat')
const mockedUseAreaDashboard = vi.mocked(useAreaDashboard)
const mockedUseAreaCommentary = vi.mocked(useAreaCommentary)
const mockedUseAreaAiSummary = vi.mocked(useAreaAiSummary)
const mockedUseAreas = vi.mocked(useAreas)
const mockedUseChat = vi.mocked(useChat)

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
      weight: 0.3,
      variance: 1.9,
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
      weight: 0.2,
      variance: -100,
    },
  ],
}

function renderPage(path = '/area') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AreaDashboard />
    </MemoryRouter>
  )
}

const mockSaveAreaCommentary = vi.fn()
const mockChatSend = vi.fn()

beforeEach(() => {
  useRoleStore.setState({ role: 'manager', areaId: 'area-1', profileLabel: 'Sales Manager' })
  mockedUseAreas.mockReturnValue({ areas: null, loading: false, error: null })
  mockSaveAreaCommentary.mockReset()
  mockChatSend.mockReset()
  mockedUseAreaAiSummary.mockReturnValue({
    data: { period: '2024-12-01', summary: null },
    loading: false,
    error: null,
  })
  mockedUseChat.mockReturnValue({ messages: [], streaming: false, send: mockChatSend })
  mockedUseAreaCommentary.mockReturnValue({
    data: null,
    loading: false,
    error: null,
    save: mockSaveAreaCommentary,
  })
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

  it('shows each KPI weight as a subtitle and variance as a column', () => {
    mockedUseAreaDashboard.mockReturnValue({
      data: DASHBOARD_DATA,
      loading: false,
      error: null,
    })

    renderPage()

    expect(screen.getByText('30% weight')).toBeInTheDocument()
    expect(screen.getByText('20% weight')).toBeInTheDocument()
    expect(screen.getByText('+1.9')).toBeInTheDocument()
    expect(screen.getByText('-100.0')).toBeInTheDocument()
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

  it('shows the Monthly Commentary panel with an info button and persists on save', async () => {
    const user = userEvent.setup()
    mockedUseAreaDashboard.mockReturnValue({ data: DASHBOARD_DATA, loading: false, error: null })
    mockedUseAreaCommentary.mockReturnValue({
      data: { period: '2024-12-01', content: '', is_ai_generated: false, author_id: null },
      loading: false,
      error: null,
      save: mockSaveAreaCommentary,
    })

    renderPage()

    expect(screen.getByText('Monthly Commentary')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /monthly commentary/i }).length).toBeGreaterThan(0)

    await user.type(document.getElementById('area-commentary-content')!, 'Great quarter overall.')
    await user.click(screen.getByRole('button', { name: /save commentary/i }))

    expect(mockSaveAreaCommentary).toHaveBeenCalledWith('Great quarter overall.', 'Sales Manager')
  })

  it('preselects the area from an ?id= query param (e.g. arriving from the Executive Overview)', () => {
    useRoleStore.setState({ role: 'admin', areaId: null, profileLabel: 'Admin' })
    mockedUseAreas.mockReturnValue({ areas: AREAS, loading: false, error: null })
    mockedUseAreaDashboard.mockReturnValue({ data: DASHBOARD_DATA, loading: false, error: null })

    renderPage('/area?id=area-2')

    expect(screen.getByRole('combobox', { name: /area/i })).toHaveValue('area-2')
    expect(mockedUseAreaDashboard).toHaveBeenCalledWith('area-2')
  })

  it('shows an empty AI Diagnostic Summary panel with an info button when there is no summary', () => {
    mockedUseAreaDashboard.mockReturnValue({ data: DASHBOARD_DATA, loading: false, error: null })
    mockedUseAreaAiSummary.mockReturnValue({
      data: { period: '2024-12-01', summary: null },
      loading: false,
      error: null,
    })

    renderPage()

    expect(screen.getByText('AI Diagnostic Summary')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /ai diagnostic summary/i })
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /chat with/i })).not.toBeInTheDocument()
  })

  it('renders the flagged KPI diagnostic and a Chat with [indicator] launcher', () => {
    mockedUseAreaDashboard.mockReturnValue({ data: DASHBOARD_DATA, loading: false, error: null })
    mockedUseAreaAiSummary.mockReturnValue({
      data: {
        period: '2024-12-01',
        summary: {
          indicator_code: 'GOV_REG',
          indicator_name: 'Regulatory Filing On-Time Rate',
          pattern: 'sudden_drop',
          confidence: 'medium',
          description: 'A sharp single-period dip.',
          suggested_focus: 'Review what changed in the dip period.',
        },
      },
      loading: false,
      error: null,
    })

    renderPage()

    expect(screen.getByText('sudden_drop')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
    expect(screen.getByText('A sharp single-period dip.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /chat with regulatory filing on-time rate/i })
    ).toBeInTheDocument()
  })

  it('opens the chat drawer scoped to the flagged KPI when the launcher is clicked', async () => {
    const user = userEvent.setup()
    mockedUseAreaDashboard.mockReturnValue({ data: DASHBOARD_DATA, loading: false, error: null })
    mockedUseAreaAiSummary.mockReturnValue({
      data: {
        period: '2024-12-01',
        summary: {
          indicator_code: 'GOV_REG',
          indicator_name: 'Regulatory Filing On-Time Rate',
          pattern: 'sudden_drop',
          confidence: 'medium',
          description: 'A sharp single-period dip.',
          suggested_focus: 'Review what changed in the dip period.',
        },
      },
      loading: false,
      error: null,
    })

    renderPage()
    await user.click(
      screen.getByRole('button', { name: /chat with regulatory filing on-time rate/i })
    )

    expect(
      screen.getByRole('heading', { name: /chat with regulatory filing on-time rate/i })
    ).toBeInTheDocument()

    const input = screen.getByRole('textbox', { name: /ask a question/i })
    await user.type(input, 'Why did this drop?')
    await user.click(screen.getByRole('button', { name: /^send$/i }))

    expect(mockChatSend).toHaveBeenCalledWith('Why did this drop?')
  })
})
