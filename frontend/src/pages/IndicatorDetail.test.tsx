import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { IndicatorDetail } from './IndicatorDetail'
import { useIndicator } from '@/hooks/useIndicator'
import { useCommentary } from '@/hooks/useCommentary'
import { useDiagnostic } from '@/hooks/useDiagnostic'
import { useActionPlan } from '@/hooks/useActionPlan'
import { useRoleStore } from '@/store/role-store'

vi.mock('@/hooks/useIndicator')
vi.mock('@/hooks/useCommentary')
vi.mock('@/hooks/useDiagnostic')
vi.mock('@/hooks/useActionPlan')
const mockedUseIndicator = vi.mocked(useIndicator)
const mockedUseCommentary = vi.mocked(useCommentary)
const mockedUseDiagnostic = vi.mocked(useDiagnostic)
const mockedUseActionPlan = vi.mocked(useActionPlan)

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

const EMPTY_COMMENTARY = {
  period: '2024-12-01',
  content: null,
  is_ai_generated: false,
  author_id: null,
}

const EMPTY_ACTION_PLAN = {
  period: '2024-12-01',
  content: null,
  author_id: null,
}

beforeEach(() => {
  mockedUseIndicator.mockReset()
  mockedUseCommentary.mockReset()
  mockedUseDiagnostic.mockReset()
  mockedUseActionPlan.mockReset()
  mockedUseCommentary.mockReturnValue({
    data: EMPTY_COMMENTARY,
    loading: false,
    error: null,
    save: vi.fn().mockResolvedValue(undefined),
  })
  mockedUseDiagnostic.mockReturnValue({ data: null, loading: false, error: null })
  mockedUseActionPlan.mockReturnValue({
    data: EMPTY_ACTION_PLAN,
    draft: null,
    loading: false,
    error: null,
    generate: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
  })
  useRoleStore.setState({ role: 'manager', areaId: null })
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

  it('shows the recorded commentary for the viewed period in an editable field', () => {
    mockedUseIndicator.mockReturnValue({ data: INDICATOR_DATA, loading: false, error: null })
    mockedUseCommentary.mockReturnValue({
      data: { ...EMPTY_COMMENTARY, content: 'Margin dipped due to one-off vendor costs.' },
      loading: false,
      error: null,
      save: vi.fn().mockResolvedValue(undefined),
    })

    renderPage()

    expect(screen.getByRole('textbox', { name: /commentary/i })).toHaveValue(
      'Margin dipped due to one-off vendor costs.'
    )
  })

  it('saves the commentary and reflects the update after refetch', async () => {
    const user = userEvent.setup()
    const mockSave = vi.fn().mockResolvedValue(undefined)
    mockedUseIndicator.mockReturnValue({ data: INDICATOR_DATA, loading: false, error: null })
    mockedUseCommentary.mockReturnValue({
      data: EMPTY_COMMENTARY,
      loading: false,
      error: null,
      save: mockSave,
    })

    renderPage()

    const textbox = screen.getByRole('textbox', { name: /commentary/i })
    await user.type(textbox, 'Revised note.')
    await user.click(screen.getByRole('button', { name: /save commentary/i }))

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith('Revised note.', 'manager')
    )

    mockedUseCommentary.mockReturnValue({
      data: { ...EMPTY_COMMENTARY, content: 'Revised note.' },
      loading: false,
      error: null,
      save: mockSave,
    })
    renderPage()

    expect(screen.getByRole('textbox', { name: /commentary/i })).toHaveValue('Revised note.')
  })

  it('shows the commentary for a different period after navigating periods', async () => {
    const user = userEvent.setup()
    mockedUseIndicator.mockReturnValue({ data: INDICATOR_DATA, loading: false, error: null })
    mockedUseCommentary.mockReturnValue({
      data: { ...EMPTY_COMMENTARY, content: 'December note.' },
      loading: false,
      error: null,
      save: vi.fn().mockResolvedValue(undefined),
    })

    renderPage()

    await user.selectOptions(screen.getByLabelText(/period/i), '2024-11-01')

    expect(mockedUseIndicator).toHaveBeenLastCalledWith('FIN_OCR', '2024-11-01')
  })

  it('does not show the AI Diagnostic Available badge when no diagnostic exists', () => {
    mockedUseIndicator.mockReturnValue({ data: INDICATOR_DATA, loading: false, error: null })
    mockedUseDiagnostic.mockReturnValue({ data: null, loading: false, error: null })

    renderPage()

    expect(screen.queryByText(/ai diagnostic available/i)).not.toBeInTheDocument()
  })

  it('shows the AI Diagnostic Available badge when a diagnostic exists, collapsed by default', () => {
    mockedUseIndicator.mockReturnValue({ data: INDICATOR_DATA, loading: false, error: null })
    mockedUseDiagnostic.mockReturnValue({
      data: {
        pattern: 'sudden_drop',
        confidence: 'medium',
        description: 'A sharp single-period dip.',
        suggested_focus: 'Review what changed in that period.',
      },
      loading: false,
      error: null,
    })

    renderPage()

    expect(screen.getByText(/ai diagnostic available/i)).toBeInTheDocument()
    expect(screen.queryByText('A sharp single-period dip.')).not.toBeInTheDocument()
  })

  it('expands the diagnostic card to show pattern, confidence, and description', async () => {
    const user = userEvent.setup()
    mockedUseIndicator.mockReturnValue({ data: INDICATOR_DATA, loading: false, error: null })
    mockedUseDiagnostic.mockReturnValue({
      data: {
        pattern: 'sudden_drop',
        confidence: 'medium',
        description: 'A sharp single-period dip.',
        suggested_focus: 'Review what changed in that period.',
      },
      loading: false,
      error: null,
    })

    renderPage()
    await user.click(screen.getByRole('button', { name: /ai diagnostic available/i }))

    expect(screen.getByText('sudden_drop')).toBeInTheDocument()
    expect(screen.getByText('medium')).toBeInTheDocument()
    expect(screen.getByText('A sharp single-period dip.')).toBeInTheDocument()
    expect(screen.getByText('Review what changed in that period.')).toBeInTheDocument()
  })

  it('renders info buttons for calculation method, composition, polarity, accumulation type, score curve, and commentary', () => {
    mockedUseIndicator.mockReturnValue({ data: INDICATOR_DATA, loading: false, error: null })

    renderPage()

    expect(screen.getByRole('button', { name: /calculation method/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^composition$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^polarity$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /accumulation type/i })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /how the kpi score is calculated/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^commentary$/i })).toBeInTheDocument()
  })
})

const OFF_TRACK_INDICATOR_DATA = { ...INDICATOR_DATA, status: 'off_track' as const }

const GENERATED_DRAFT = {
  probable_causes: ['Vendor cost spike'],
  actions: [
    { action: 'Renegotiate vendor contract', responsible: 'manager', deadline_type: 'short_term' as const },
  ],
  monitoring_suggestion: 'Review monthly.',
}

describe('IndicatorDetail action plan generator', () => {
  it('does not show the Suggest Action Plan button for an executive role', () => {
    mockedUseIndicator.mockReturnValue({ data: OFF_TRACK_INDICATOR_DATA, loading: false, error: null })
    useRoleStore.setState({ role: 'executive', areaId: null })

    renderPage()

    expect(screen.queryByRole('button', { name: /suggest action plan/i })).not.toBeInTheDocument()
  })

  it('does not show the Suggest Action Plan button for a manager when the indicator is on track', () => {
    mockedUseIndicator.mockReturnValue({ data: INDICATOR_DATA, loading: false, error: null })

    renderPage()

    expect(screen.queryByRole('button', { name: /suggest action plan/i })).not.toBeInTheDocument()
  })

  it('shows the Suggest Action Plan button for a manager on an off-track indicator', () => {
    mockedUseIndicator.mockReturnValue({ data: OFF_TRACK_INDICATOR_DATA, loading: false, error: null })

    renderPage()

    expect(screen.getByRole('button', { name: /suggest action plan/i })).toBeInTheDocument()
  })

  it('generates a draft and populates an editable form', async () => {
    const user = userEvent.setup()
    const mockGenerate = vi.fn().mockResolvedValue(undefined)
    mockedUseIndicator.mockReturnValue({ data: OFF_TRACK_INDICATOR_DATA, loading: false, error: null })
    mockedUseActionPlan.mockReturnValue({
      data: EMPTY_ACTION_PLAN,
      draft: null,
      loading: false,
      error: null,
      generate: mockGenerate,
      save: vi.fn().mockResolvedValue(undefined),
    })

    renderPage()
    await user.click(screen.getByRole('button', { name: /suggest action plan/i }))

    expect(mockGenerate).toHaveBeenCalled()

    mockedUseActionPlan.mockReturnValue({
      data: EMPTY_ACTION_PLAN,
      draft: GENERATED_DRAFT,
      loading: false,
      error: null,
      generate: mockGenerate,
      save: vi.fn().mockResolvedValue(undefined),
    })
    renderPage()

    expect(screen.getByRole('textbox', { name: /probable causes/i })).toHaveValue(
      'Vendor cost spike'
    )
    expect(screen.getByRole('textbox', { name: /monitoring suggestion/i })).toHaveValue(
      'Review monthly.'
    )
  })

  it('saves the (possibly edited) draft as the action plan', async () => {
    const user = userEvent.setup()
    const mockSave = vi.fn().mockResolvedValue(undefined)
    mockedUseIndicator.mockReturnValue({ data: OFF_TRACK_INDICATOR_DATA, loading: false, error: null })
    mockedUseActionPlan.mockReturnValue({
      data: EMPTY_ACTION_PLAN,
      draft: GENERATED_DRAFT,
      loading: false,
      error: null,
      generate: vi.fn().mockResolvedValue(undefined),
      save: mockSave,
    })

    renderPage()

    const monitoringField = screen.getByRole('textbox', { name: /monitoring suggestion/i })
    await user.clear(monitoringField)
    await user.type(monitoringField, 'Review weekly.')
    await user.click(screen.getByRole('button', { name: /save action plan/i }))

    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(
        {
          probable_causes: ['Vendor cost spike'],
          actions: GENERATED_DRAFT.actions,
          monitoring_suggestion: 'Review weekly.',
        },
        'manager'
      )
    )
  })

  it('shows the saved action plan content in the form when one already exists', () => {
    mockedUseIndicator.mockReturnValue({ data: OFF_TRACK_INDICATOR_DATA, loading: false, error: null })
    mockedUseActionPlan.mockReturnValue({
      data: { ...EMPTY_ACTION_PLAN, content: GENERATED_DRAFT, author_id: 'manager' },
      draft: null,
      loading: false,
      error: null,
      generate: vi.fn().mockResolvedValue(undefined),
      save: vi.fn().mockResolvedValue(undefined),
    })

    renderPage()

    expect(screen.getByRole('textbox', { name: /probable causes/i })).toHaveValue(
      'Vendor cost spike'
    )
  })
})
