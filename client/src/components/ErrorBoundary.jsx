import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err) {
    console.error('模块渲染出错：', err);
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 40, maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif' }}>
          <h2>这个页面出错了</h2>
          <p style={{ color: '#8a90a2', lineHeight: 1.6 }}>
            {String((this.state.err && this.state.err.message) || this.state.err)}
          </p>
          <button className="btn primary" onClick={() => location.reload()}>刷新重试</button>
        </div>
      );
    }
    return this.props.children;
  }
}
