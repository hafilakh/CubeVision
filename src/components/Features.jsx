const features = [
  {
    title: 'Scan your cube',
    text: 'Use your webcam to read all six faces, then review and correct any colors it gets wrong.',
    color: 'blue',
  },
  {
    title: 'Interactive 3D cube',
    text: 'A virtual cube that matches yours and shows each move with clear arrows.',
    color: 'green',
  },
  {
    title: 'Learn the method',
    text: 'A layer-by-layer approach that explains why each step works, not just which moves to make.',
    color: 'yellow',
  },
  {
    title: 'Adapts to you',
    text: 'Choose guided, hint, or independent mode, with progress saved in your browser.',
    color: 'orange',
  },
]

function Features() {
  return (
    <section className="features" id="learn">
      <div className="features-inner">
        <h2>Built to make you an independent solver</h2>
        <p className="features-intro">
          CubeVision is under development. These are the parts we are building,
          in order.
        </p>

        <ul className="features-grid">
          {features.map((feature) => (
            <li key={feature.title} className="feature-card">
              <span
                className={`feature-dot cell-${feature.color}`}
                aria-hidden="true"
              />
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <span className="feature-status">Planned</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export default Features