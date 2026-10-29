import { Component } from "react";

// If any page crashes, show a message instead of a blank white screen.
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.error(err); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h1 className="text-2xl font-extrabold">Something went wrong</h1>
        <p className="mt-2 text-slate-600">Please reload the page. If it keeps happening, check that the server is running and VITE_API_URL is correct.</p>
        <button className="btn-primary mt-5" onClick={() => window.location.assign("/")}>Back to the store</button>
      </div>
    );
  }
}
