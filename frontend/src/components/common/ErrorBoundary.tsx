'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
    componentName?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-xs">
                    <strong>Error in {this.props.componentName || 'Component'}:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">{this.state.error?.message}</pre>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
