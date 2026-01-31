export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Approval Console</h1>
      <section style={{ display: "flex", gap: "2rem" }}>
        <div style={{ flex: 1 }}>
          <h2>Jobs</h2>
          <ul>
            <li>
              <strong>Fullstack Developer</strong>
              <div>Remote · Mid</div>
            </li>
          </ul>
        </div>
        <div style={{ flex: 1 }}>
          <h2>Artefacts</h2>
          <p>Tailored summary</p>
          <div>
            <button type="button">Approve</button>
            <button type="button">Reject</button>
            <button type="button">Snooze</button>
          </div>
        </div>
      </section>
    </main>
  );
}
