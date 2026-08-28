import { useEffect, useRef, useState } from "react";
import mqtt from "mqtt";
import "./App.css";

const BROKER_URL = "ws://localhost:9001";
const TOPIC_FILTER = "perimeter/+/alert";

const EVENT_META = {
  footsteps: { label: "Footsteps", color: "#e8b34a", severity: "caution" },
  vehicle: { label: "Vehicle", color: "#e8734a", severity: "alert" },
  glass_break: { label: "Glass Break", color: "#e14b4b", severity: "critical" },
  normal: { label: "Normal", color: "#4ade80", severity: "clear" },
};

function metaFor(event) {
  return EVENT_META[event] || { label: event, color: "#8b93a7", severity: "unknown" };
}

export default function App() {
  const [status, setStatus] = useState("connecting");
  const [events, setEvents] = useState([]);
  const [nodes, setNodes] = useState({});
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

  return (
    <div className={`app ${isAlarmState ? "app--alarm" : ""}`}>
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__mark" />
          <div>
            <h1>Perimeter Watch</h1>
            <p>Autonomous acoustic intrusion monitoring</p>
          </div>
        </div>
        <div className={`status-pill status-pill--${status}`}>
          <span className="status-pill__dot" />
          {status === "connected" && "Broker connected"}
          {status === "connecting" && "Connecting..."}
          {status === "disconnected" && "Disconnected"}
          {status === "error" && "Connection error"}
        </div>
      </header>

      <section className="nodes">
        {Object.keys(nodes).length === 0 && (
          <div className="empty-hint">
            Waiting for the first event from a node... start <code>backend/simulator.py</code> or your ESP32 firmware.
          </div>
        )}
        {Object.entries(nodes).map(([nodeId, latest]) => {
          const meta = metaFor(latest.event);
          return (
            <div key={nodeId} className="node-card" style={{ "--accent": meta.color }}>
              <div className="node-card__header">
                <span className="node-card__id">{nodeId}</span>
                <span className={`node-card__badge node-card__badge--${meta.severity}`}>{meta.label}</span>
              </div>
              <div className="node-card__confidence">
                <div className="node-card__bar">
                  <div
                    className="node-card__bar-fill"
                    style={{ width: `${Math.round((latest.confidence || 0) * 100)}%` }}
                  />
                </div>
                <span>{Math.round((latest.confidence || 0) * 100)}% confidence</span>
              </div>
              <div className="node-card__time">
                {latest.receivedAt.toLocaleTimeString()}
              </div>
            </div>
          );
        })}
      </section>

      <section className="log">
        <div className="log__header">
          <h2>Event log</h2>
          <span>{events.length} received</span>
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
              {events.map((e, i) => {
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
              {events.length === 0 && (
                <tr>
                  <td colSpan={5} className="log__empty">
                    No events yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
