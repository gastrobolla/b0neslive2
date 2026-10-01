import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Shield } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public props: Props;
  public setState!: (state: Partial<State> | ((prevState: State) => Partial<State>)) => void;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Bønes App ErrorBoundary] Fanget uventet feil:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[350px] w-full flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 shadow-xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-red-700 uppercase tracking-wider mb-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Bønes IL Kampsenter</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                {this.props.fallbackTitle || 'Noe gikk galt under visningen'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Det oppstod en uventet feil ved lasting av dette oppgjøret. Dataene dine er trygge, og du kan gå tilbake til kampsenteret eller laste siden på nytt.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-mono text-left truncate">
                Feilmelding: {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#165094] hover:bg-[#113e73] text-white transition-all shadow-xs cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Gå til forsiden</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Last på nytt</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
