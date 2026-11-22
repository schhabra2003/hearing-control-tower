import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/EmptyState';
import { navigate } from '@/lib/router';
import { actions } from '@/lib/store';

interface State {
  failed: boolean;
  detail?: string;
}

/**
 * Keeps one page that throws (a bad link, a corrupt saved session) from blanking the whole app:
 * the shell stays, and the page offers Today or a reset of the example. Keyed on the path
 * by the shell, so another page renders fresh.
 */
export class PageErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(error: unknown): State {
    return { failed: true, detail: error instanceof Error ? error.message : String(error) };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo): void {
    /* The fallback below is the whole response; nothing is logged or sent. */
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <ErrorState
        testId="page-error"
        size="page"
        detail={this.state.detail}
        icon={<AlertTriangle aria-hidden />}
        title="This page could not be shown"
        description="Go to Today, or reset the example if it happens again. The sheet is never changed."
        action={
          <>
            <Button variant="primary" size="md" onClick={() => navigate('/')}>Go to Today</Button>
            <Button
              variant="secondary"
              data-testid="error-reset"
              onClick={() => {
                actions.reset();
                this.setState({ failed: false });
              }}
            >
              Reset the example
            </Button>
          </>
        }
      />
    );
  }
}
