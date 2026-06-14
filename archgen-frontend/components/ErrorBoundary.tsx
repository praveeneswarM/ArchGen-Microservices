"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Global React Error Boundary.
 * Catches render-phase exceptions from any child component tree and
 * displays a recoverable error card instead of a blank white page.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    // Log to console for debugging
    console.error("[ArchGen ErrorBoundary] Caught render error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-8">
        <div className="max-w-lg w-full bg-[#18181b] border border-rose-500/20 rounded-2xl p-8 shadow-2xl">
          {/* Icon */}
          <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center mb-5">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
          </div>

          {/* Heading */}
          <h1 className="text-base font-bold text-slate-100 font-sans tracking-wide mb-1">
            {this.props.fallbackLabel ?? "Render Error Detected"}
          </h1>
          <p className="text-xs text-slate-400 font-mono mb-5">
            The application encountered an unexpected rendering failure. The error
            has been logged to the console.
          </p>

          {/* Error detail */}
          {this.state.error && (
            <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-4 mb-5 overflow-auto max-h-48">
              <p className="text-[10px] font-mono text-rose-400 leading-relaxed whitespace-pre-wrap">
                {this.state.error.message}
              </p>
              {this.state.errorInfo?.componentStack && (
                <p className="text-[9px] font-mono text-slate-500 mt-2 leading-relaxed whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack.trim()}
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 bg-white hover:bg-slate-100 text-black text-xs font-mono font-bold px-4 py-2 rounded-lg transition-all active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Component
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-[#27272a] text-slate-300 text-xs font-mono px-4 py-2 rounded-lg transition-all"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
