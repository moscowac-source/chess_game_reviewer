import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

function Boom(): React.ReactElement {
  throw new Error('kaboom')
}

describe('ErrorBoundary', () => {
  const originalError = console.error

  beforeEach(() => {
    // React logs the caught error to console.error during the test render;
    // silence that noise so the test output is clean.
    console.error = jest.fn()
  })

  afterEach(() => {
    console.error = originalError
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="fallback">fallback</div>}>
        <div data-testid="child">happy</div>
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.queryByTestId('fallback')).not.toBeInTheDocument()
  })

  it('renders the fallback when a child throws', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="fallback">fallback</div>}>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByTestId('fallback')).toBeInTheDocument()
  })
})
