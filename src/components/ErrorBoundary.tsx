import { Component, type ReactNode } from 'react';
export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="recovery-screen">
          <div className="panel">
            <span className="section-label">ARNAV SPACE SIMULATION</span>
            <h1>Let's restore your observatory.</h1>
            <p>
              A page module could not open. Reconnect or reload the saved offline release to
              continue. Your device saves remain available.
            </p>
            <button className="solid-button" onClick={() => location.reload()}>
              Reload observatory
            </button>
          </div>
        </main>
      );
    return this.props.children;
  }
}
