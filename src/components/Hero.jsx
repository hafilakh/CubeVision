function Hero() {
  function handleStartLearning() {
    console.log('Start Learning clicked')
  }

  return (
    <section className="hero" id="home">
      <div className="hero-inner">
        <div className="hero-content">
          <p className="hero-eyebrow">Webcam-guided Rubik&apos;s Cube tutor</p>
          <h1>Learn to solve a real Rubik&apos;s Cube</h1>
          <p className="hero-text">
            CubeVision teaches you the method, not just the moves. Scan your
            cube, follow visual guidance, and gradually become an independent
            solver.
          </p>
          <button
            type="button"
            className="btn-primary"
            onClick={handleStartLearning}
          >
            Start Learning
          </button>
        </div>

        <div
          className="cube-stage"
          role="img"
          aria-label="Reserved space for the interactive 3D cube"
        >
          <p className="cube-stage-label">
            Interactive 3D cube
            <span>Coming in a later phase</span>
          </p>
        </div>
      </div>
    </section>
  )
}

export default Hero