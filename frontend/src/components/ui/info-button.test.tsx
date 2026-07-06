import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InfoButton } from './info-button'
import { infoTexts } from '@/lib/info-texts'

vi.mock('@/lib/info-texts', () => ({
  infoTexts: {
    shortCopy: { title: 'Short Copy Title', body: 'A brief explanation.', mode: 'tooltip' },
    longCopy: { title: 'Long Copy Title', body: 'A much longer, detailed explanation.', mode: 'slideover' },
  },
}))

describe('InfoButton', () => {
  it('renders a button that is initially collapsed', () => {
    render(<InfoButton textKey="shortCopy" />)

    expect(screen.getByRole('button', { name: /short copy title/i })).toBeInTheDocument()
    expect(screen.queryByText(infoTexts.shortCopy.body)).not.toBeInTheDocument()
  })

  it('shows the keyed copy in a tooltip when mode is tooltip', async () => {
    const user = userEvent.setup()
    render(<InfoButton textKey="shortCopy" />)

    await user.click(screen.getByRole('button', { name: /short copy title/i }))

    await waitFor(() =>
      expect(screen.getByText(infoTexts.shortCopy.body)).toBeInTheDocument()
    )
  })

  it('shows the keyed copy in a slide-over panel when mode is slideover', async () => {
    const user = userEvent.setup()
    render(<InfoButton textKey="longCopy" />)

    await user.click(screen.getByRole('button', { name: /long copy title/i }))

    await waitFor(() =>
      expect(screen.getByRole('dialog')).toHaveTextContent(infoTexts.longCopy.body)
    )
  })
})
