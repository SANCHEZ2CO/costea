import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center">
                    <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200">
                        <h2 className="text-xl font-bold mb-2">Algo salió mal</h2>
                        <p className="mb-4">Se ha producido un error al cargar este componente.</p>
                        <details className="text-left text-xs bg-white dark:bg-black/20 p-4 rounded overflow-auto max-h-48 mb-4 font-mono">
                            <summary className="cursor-pointer font-bold mb-2">Ver Detalles del Error</summary>
                            {this.state.error && this.state.error.toString()}
                        </details>
                        <button
                            onClick={() => this.setState({ hasError: false })}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition"
                        >
                            Intentar de nuevo
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
