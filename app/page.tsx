import Link from 'next/link';
import HomePreview from '../components/HomePreview';
import Icon from '../components/Icon';
const features = [
  {
    number: '01',
    title: 'A timeline you can feel.',
    text: 'Layer text, shapes and images. Trim clips, mark moments, and shape movement with keyframes and Bézier curves.',
  },
  {
    number: '02',
    title: 'Make every character yours.',
    text: 'Style individual characters and stack motion. Use the code editor when you want to write your own effects.',
  },
  {
    number: '03',
    title: 'From studio to stream.',
    text: 'Export an offline player or a lightweight score. Transparent Canvas rendering works in an OBS Browser Source.',
  },
];
function FeatureCard({ number, title, text }: (typeof features)[number]) {
  return (
    <article className="space-y-3 border-t border-zinc-800 pt-6">
      <span className="text-xs font-medium tracking-wider text-violet-300">
        {number} / LILT STUDIO
      </span>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm leading-6 text-zinc-400">{text}</p>
    </article>
  );
}
export default function Home() {
  return (
    <main className="mx-auto max-w-7xl px-6 sm:px-10">
      <nav className="flex h-24 items-center justify-between border-b border-zinc-800">
        <Link href="/" className="text-4xl font-bold tracking-tight text-violet-300">
          lilt.
        </Link>
        <span className="hidden text-xs tracking-widest text-zinc-500 sm:block">
          WORDS IN MOTION
        </span>
        <Link
          href="/studio"
          className="flex items-center gap-2 text-sm font-medium hover:text-violet-300"
        >
          Open studio
          <Icon name="arrow" />
        </Link>
      </nav>
      <section className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
        <div className="space-y-8">
          <p className="text-xs font-medium tracking-widest text-violet-300">
            A SMALL STUDIO FOR BIG FEELINGS
          </p>
          <h1 className="text-5xl leading-tight font-semibold tracking-tight sm:text-6xl">
            Your words.
            <br />
            Their <em className="font-serif font-normal text-violet-300">own rhythm.</em>
          </h1>
          <p className="max-w-md text-base leading-7 text-zinc-400">
            Choreograph lyrics, shape a moment, and make every character move with intention.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/studio"
              className="inline-flex h-11 items-center gap-3 rounded-lg bg-violet-400 px-5 text-sm font-medium text-zinc-950 hover:bg-violet-300"
            >
              Make something move
              <Icon name="arrow" />
            </Link>
            <a
              href="/player.html"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-3 rounded-lg border border-zinc-700 px-5 text-sm hover:bg-zinc-800"
            >
              Watch the player
              <Icon name="play" />
            </a>
          </div>
          <p className="text-xs tracking-widest text-zinc-500">
            CANVAS 2D · VANILLA JAVASCRIPT · OBS READY
          </p>
        </div>
        <HomePreview />
      </section>
      <section className="grid gap-10 pb-16 md:grid-cols-3">
        {features.map((feature) => (
          <FeatureCard key={feature.number} {...feature} />
        ))}
      </section>
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800 py-6 text-xs text-zinc-500">
        <span>LILT STUDIO</span>
        <p>Built for the joy of making words move.</p>
        <a href="/lilt/SOURCE-README.md" className="hover:text-violet-300">
          Renderer documentation ↗
        </a>
      </footer>
    </main>
  );
}
