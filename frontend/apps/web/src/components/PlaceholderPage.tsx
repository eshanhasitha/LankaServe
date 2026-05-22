export default function PlaceholderPage({ title, description, endpoint }) {
  return (
    <section className="content-page">
      <h1>{title}</h1>
      <p>{description}</p>
      {endpoint ? <code>Backend endpoint: {endpoint}</code> : null}
    </section>
  );
}
