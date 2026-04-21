import { render, screen, fireEvent } from '@testing-library/react'
import { StatTile } from '@/components/StatTile'

describe('StatTile', () => {
  it('renders the value and label in the success state', () => {
    render(
      <StatTile
        label="Day streak"
        value={12}
        loading={false}
        error={null}
        onRetry={() => {}}
      />,
    )
    expect(screen.getByTestId('stat-Day streak-value')).toHaveTextContent('12')
    expect(screen.getByText('Day streak')).toBeInTheDocument()
  })

  it('falls back to an em-dash when the value is null and the request succeeded', () => {
    render(
      <StatTile
        label="Day streak"
        value={null}
        loading={false}
        error={null}
        onRetry={() => {}}
      />,
    )
    expect(screen.getByTestId('stat-Day streak-value')).toHaveTextContent('—')
  })

  it('shows a loading placeholder while loading', () => {
    render(
      <StatTile
        label="Day streak"
        value={null}
        loading={true}
        error={null}
        onRetry={() => {}}
      />,
    )
    expect(screen.getByTestId('stat-Day streak-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('stat-Day streak-value')).not.toBeInTheDocument()
  })

  it('shows an inline retry button when there is an error', () => {
    const onRetry = jest.fn()
    render(
      <StatTile
        label="Day streak"
        value={null}
        loading={false}
        error={new Error('boom')}
        onRetry={onRetry}
      />,
    )
    const retry = screen.getByTestId('stat-Day streak-error')
    expect(retry).toHaveTextContent(/couldn.?t load/i)
    fireEvent.click(retry)
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('prefers the loading state over an error when both are set', () => {
    render(
      <StatTile
        label="Day streak"
        value={null}
        loading={true}
        error={new Error('stale')}
        onRetry={() => {}}
      />,
    )
    expect(screen.getByTestId('stat-Day streak-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('stat-Day streak-error')).not.toBeInTheDocument()
  })
})
