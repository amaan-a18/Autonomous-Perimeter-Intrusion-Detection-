import { useEffect, useMemo, useRef, useState } from "react";
import mqtt from "mqtt";
import "./App.css";

const BROKER_URL = "ws://localhost:9001";
const TOPIC_FILTER = "perimeter/+/alert";

const EVENT_META = {
  footsteps: { label: "Footsteps", color: "#e8b34a", severity: "caution" },
  vehicle: { label: "Vehicle", color: "#e8734a", severity: "alert" },
  glass_break: { label: "Glass Break", color: "#e14b4b", severity: "critical" },
  normal: { label: "Normal", color: "#39e6c4", severity: "clear" },
};

function metaFor(event) {
  return EVENT_META[event] || { label: event, color: "#8b93a7", severity: "unknown" };
}

// Position N points evenly around a circle of given radius, centered at (cx, cy)
function ringPositions(count, radius, cx, cy, startAngle = -90) {
  if (count === 0) return [];
  return Array.from({ length: count }, (_, i) => {
    const angle = ((startAngle + (360 / count) * i) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

export default function App() {
  const [status, setStatus] = useState("connecting");
  const [events, setEvents] = useState([]);
  const [nodes, setNodes] = useState({});
  const [query, setQuery] = useState("");
  const clientRef = useRef(null);

  useEffect(() => {
    const client = mqtt.connect(BROKER_URL, { reconnectPeriod: 2000 });
    clientRef.current = client;

    client.on("connect", () => {
      setStatus("connected");
      client.subscribe(TOPIC_FILTER);
    });
    client.on("reconnect", () => setStatus("connecting"));
    client.on("close", () => setStatus("disconnected"));
    client.on("error", () => setStatus("error"));

    client.on("message", (topic, message) => {
      let data;
      try {
        data = JSON.parse(message.toString());
      } catch {
        return;
      }
      const nodeId = topic.split("/")[1] || "unknown";
      const entry = {
        ...data,
        node: nodeId,
        receivedAt: new Date(),
      };
      setEvents((prev) => [entry, ...prev].slice(0, 100));
      setNodes((prev) => ({ ...prev, [nodeId]: entry }));
    });

    return () => client.end(true);
  }, []);

  const activeAlerts = events.filter((e) => e.event !== "normal").slice(0, 1);
  const isAlarmState = activeAlerts.length > 0 && activeAlerts[0].receivedAt > new Date(Date.now() - 8000);

  const nodeIds = Object.keys(nodes);
  const latestEvent = events[0] || null;
  const latestMeta = latestEvent ? metaFor(latestEvent.event) : metaFor("normal");

  const stats = useMemo(() => {
    const flagged = events.filter((e) => e.event !== "normal").length;
    const critical = events.filter((e) => e.event === "glass_break").length;
    const avgConfidence = events.length
      ? Math.round((events.reduce((s, e) => s + (e.confidence || 0), 0) / events.length) * 100)
      : 0;
    return { total: events.length, nodes: nodeIds.length, flagged, critical, avgConfidence };
  }, [events, nodeIds.length]);

  const trend = events.slice(0, 24).reverse();

  const filteredEvents = events.filter((e) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return e.node?.toLowerCase().includes(q) || metaFor(e.event).label.toLowerCase().includes(q);
  });

  const ring = ringPositions(nodeIds.length, 92, 130, 130);

  return (
    <div className={`app ${isAlarmState ? "app--alarm" : ""}`}>
      <aside className="rail">
        <span className="rail__mark" />
        <nav className="rail__nav">
          <span className="rail__icon rail__icon--active" title="Live map">◎</span>
          <span className="rail__icon" title="Nodes">▤</span>
          <span className="rail__icon" title="Events">☰</span>
          <span className="rail__icon" title="Settings">⚙</span>
        </nav>
      </aside>

      <div className="shell">
        <header className="topbar">
          <div className="topbar__brand">
            <div>
              <h1>Perimeter Watch</h1>
              <p>Autonomous acoustic intrusion monitoring</p>
            </div>
          </div>
          <div className="topbar__search">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by node or event type…"
            />
          </div>
          <div className={`status-pill status-pill--${status}`}>
            <span className="status-pill__dot" />
            {status === "connected" && "Broker connected"}
            {status === "connecting" && "Connecting..."}
            {status === "disconnected" && "Disconnected"}
            {status === "error" && "Connection error"}
          </div>
        </header>

        <main className="grid">
          {/* Left: radial node map */}
          <section className="panel map-panel">
            <div className="panel__header">
              <h2>Node map</h2>
              <span>{stats.nodes} online</span>
            </div>
            <div className="radial">
              <svg viewBox="0 0 260 260" className="radial__svg">
                <circle cx="130" cy="130" r="92" className="radial__ring" />
                <circle cx="130" cy="130" r="56" className="radial__ring radial__ring--inner" />
                {ring.map((p, i) => (
                  <line key={i} x1="130" y1="130" x2={p.x} y2={p.y} className="radial__spoke" />
                ))}
                <circle cx="130" cy="130" r="40" className="radial__hub" />
                {ring.map((p, i) => {
                  const nodeId = nodeIds[i];
                  const meta = metaFor(nodes[nodeId]?.event);
                  return (
                    <circle
                      key={nodeId}
                      cx={p.x}
                      cy={p.y}
                      r="9"
                      style={{ fill: meta.color }}
                      className="radial__node"
                    />
                  );
                })}
              </svg>
              <div className="radial__hub-label">
                <strong>{stats.nodes}</strong>
                <span>Active nodes</span>
              </div>
            </div>
            {nodeIds.length === 0 && (
              <div className="empty-hint">
                Waiting for the first event... start <code>backend/simulator.py</code> or your ESP32 firmware.
              </div>
            )}
            <div className="node-legend">
              {nodeIds.map((nodeId) => {
                const meta = metaFor(nodes[nodeId]?.event);
                return (
                  <div key={nodeId} className="node-legend__item">
                    <span className="node-legend__dot" style={{ background: meta.color }} />
                    <span className="node-legend__id">{nodeId}</span>
                    <span className="node-legend__badge">{meta.label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Middle: stats + log */}
          <section className="middle">
            <div className="stat-row">
              <div className="stat-chip">
                <span className="stat-chip__value">{stats.total}</span>
                <span className="stat-chip__label">Total events</span>
              </div>
              <div className="stat-chip">
                <span className="stat-chip__value">{stats.nodes}</span>
                <span className="stat-chip__label">Nodes</span>
              </div>
              <div className="stat-chip stat-chip--warn">
                <span className="stat-chip__value">{stats.flagged}</span>
                <span className="stat-chip__label">Flagged</span>
              </div>
              <div className="stat-chip stat-chip--danger">
                <span className="stat-chip__value">{stats.critical}</span>
                <span className="stat-chip__label">Critical</span>
              </div>
            </div>

            <div className="panel log">
              <div className="panel__header">
                <h2>Event log</h2>
                <span>{filteredEvents.length} shown</span>
              </div>
              <div className="log__table-wrap">
                <table className="log__table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Node</th>
                      <th>Event</th>
                      <th>Confidence</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((e, i) => {
                      const meta = metaFor(e.event);
                      return (
                        <tr key={i} className={e.event !== "normal" ? "log__row--flag" : ""}>
                          <td>{e.receivedAt.toLocaleTimeString()}</td>
                          <td>{e.node}</td>
                          <td>
                            <span className="log__event-dot" style={{ background: meta.color }} />
                            {meta.label}
                          </td>
                          <td>{Math.round((e.confidence || 0) * 100)}%</td>
                          <td className="log__source">{e.source_clip || "—"}</td>
                        </tr>
                      );
                    })}
                    {filteredEvents.length === 0 && (
                      <tr>
                        <td colSpan={5} className="log__empty">
                          No events yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Right: detail + confidence chart */}
          <section className="panel detail-panel">
            <div className="panel__header">
              <h2>Latest event</h2>
              {latestEvent && <span>{latestEvent.receivedAt.toLocaleTimeString()}</span>}
            </div>

            {latestEvent ? (
              <>
                <div className="detail-badge" style={{ "--accent": latestMeta.color }}>
                  <span className="detail-badge__dot" />
                  {latestMeta.label} · {latestEvent.node}
                </div>

                <div className="confidence-chart">
                  <div className="confidence-chart__label">
                    <span>Confidence trend</span>
                    <strong>{stats.avgConfidence}% avg</strong>
                  </div>
                  <svg viewBox="0 0 240 70" preserveAspectRatio="none" className="confidence-chart__svg">
                    {trend.map((e, i) => {
                      const h = Math.max(4, (e.confidence || 0) * 60);
                      const w = 240 / Math.max(trend.length, 1);
                      const meta = metaFor(e.event);
                      return (
                        <rect
                          key={i}
                          x={i * w + 1}
                          y={64 - h}
                          width={Math.max(2, w - 2)}
                          height={h}
                          rx="1.5"
                          style={{ fill: meta.color }}
                          opacity={0.55 + (i / Math.max(trend.length, 1)) * 0.45}
                        />
                      );
                    })}
                  </svg>
                </div>

                <div className="detail-grid">
                  <div className="detail-grid__item">
                    <span>Confidence</span>
                    <strong>{Math.round((latestEvent.confidence || 0) * 100)}%</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Source clip</span>
                    <strong className="mono">{latestEvent.source_clip || "—"}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Node</span>
                    <strong>{latestEvent.node}</strong>
                  </div>
                  <div className="detail-grid__item">
                    <span>Status</span>
                    <strong className={isAlarmState ? "text-danger" : "text-ok"}>
                      {isAlarmState ? "Alarm" : "Clear"}
                    </strong>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-hint">No events received yet.</div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
