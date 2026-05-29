import { Component, type ErrorInfo, type ReactNode } from "react";
import { capture } from "@/lib/monitoring";

interface Props {
  children: ReactNode;
  /** Optional label so we know which boundary caught the error. */
  scope?: string;
  /** Optional custom fallback renderer. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * App-wide error boundary.
 *
 * A render-time crash anywhere below this boundary would otherwise unmount the
 * entire React tree and leave the user staring at a blank white page. Instead
 * we:
 *   1. Catch the error and show a calm, on-brand recovery screen.
 *   2. Report it to the monitoring backend (the system-error log) so it's
 *      captured for later reference and fixes — the same place server errors go.
 *   3. Offer the user a way to recover (retry / reload) without losing the tab.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    capture(error, {
      level: "fatal",
      errorType: error.name || "ReactRenderError",
      context: {
        scope: this.props.scope ?? "app",
        componentStack: info.componentStack?.slice(0, 4000),
      },
    });
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div
        role="alert"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center"
      >
        <div className="max-w-md space-y-3">
          <h1 className="text-xl font-semibold text-[#3D0814]">
            Something went wrong on this page
          </h1>
          <p className="text-sm text-muted-foreground">
            We hit an unexpected problem and have logged it for our team. You can
            try again, or head back to the homepage.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={this.reset}
            className="rounded-md bg-[#6B0F1A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3D0814]"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
            className="rounded-md border border-[#6B0F1A] px-4 py-2 text-sm font-medium text-[#6B0F1A] transition-colors hover:bg-[#6B0F1A]/5"
          >
            Go to homepage
          </button>
        </div>
      </div>
    );
  }
}
