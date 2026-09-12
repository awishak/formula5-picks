import { Component } from "react";

// Catches a render crash and shows what broke instead of an empty screen.
//
// Why this exists: main.jsx renders straight into #root with nothing above it,
// so any throw outside the MyPicks boundary unmounts the whole tree. The page
// then shows index.html's body colour — #1e1e2a — and a player reports a "gray
// screen" with nothing else to go on. PickIntel was the largest unprotected
// screen and is exactly where players land once a deadline has passed.
//
// `where` names the screen so a screenshot is enough to locate the failure.
export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null, info: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    console.error(`${this.props.where || "App"} crash:`, error, info);
    this.setState({ info });
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ padding: "40px 20px", background: "#fff", minHeight: "100vh" }}>
        <p style={{ fontFamily: "'Geologica', sans-serif", fontWeight: 900, fontSize: 18, color: "#e04a4a", marginBottom: 8 }}>
          {this.props.where || "App"} Crashed
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#1e1e2a", marginBottom: 12, wordBreak: "break-word" }}>
          {String(this.state.error)}
        </p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#6b6b80", marginBottom: 12 }}>
          Screenshot this and send it to Andrew.
        </p>
        <pre style={{ fontFamily: "monospace", fontSize: 10, color: "#6b6b80", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {this.state.info?.componentStack || ""}
        </pre>
      </div>
    );
  }
}
