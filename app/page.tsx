import Link from 'next/link';
import HomePreview from '../components/HomePreview';
import './home.css';
export default function Home() {
  return (
    <main className="home">
      <nav className="home-nav">
        <Link href="/" className="home-logo">
          li<span>lt</span>
          <i />
        </Link>
        <span className="home-nav-caption">WORDS IN MOTION</span>
        <Link href="/studio" className="home-open">
          Open studio <span>↗</span>
        </Link>
      </nav>
      <section className="home-hero">
        <div className="hero-copy">
          <div className="home-eyebrow">
            <span />A SMALL STUDIO FOR BIG FEELINGS
          </div>
          <h1>
            Your words.
            <br />
            Their <em>own rhythm.</em>
          </h1>
          <p>
            Choreograph lyrics, shape a moment, and make every character move with intention. A
            visual studio with a little soul.
          </p>
          <div className="hero-actions">
            <Link href="/studio" className="home-primary">
              Make something move <span>↗</span>
            </Link>
            <a href="/player.html" target="_blank" rel="noreferrer" className="home-secondary">
              Watch the player <span>▶</span>
            </a>
          </div>
          <div className="hero-detail">
            <span>CANVAS 2D</span>
            <i />
            <span>VANILLA JAVASCRIPT</span>
            <i />
            <span>OBS READY</span>
          </div>
        </div>
        <HomePreview />
      </section>
      <section className="home-features">
        <div>
          <span className="feature-number">01 / CHOREOGRAPH</span>
          <h2>A timeline you can feel.</h2>
          <p>
            Layer voices, trim clips, and find the exact frame. Character effects and keyframes
            bring the rhythm into focus.
          </p>
        </div>
        <div>
          <span className="feature-number">02 / MAKE IT YOURS</span>
          <h2>Every glyph has a story.</h2>
          <p>
            Style individual characters. Stack motion and materials. Write your own effects without
            rewriting the renderer.
          </p>
        </div>
        <div>
          <span className="feature-number">03 / TAKE IT ANYWHERE</span>
          <h2>From studio to stream.</h2>
          <p>
            Export a standalone player or a lightweight score. Transparent Canvas rendering fits
            right into an OBS Browser Source.
          </p>
        </div>
      </section>
      <footer className="home-footer">
        <span>LILT STUDIO / 04</span>
        <p>Built for the joy of making words move.</p>
        <a href="/lilt/SOURCE-README.md">Renderer documentation ↗</a>
      </footer>
    </main>
  );
}
