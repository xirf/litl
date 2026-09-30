export default function Overlay() {
  return (
    <iframe
      title="Lilt OBS overlay"
      className="obs-overlay"
      src="/player.html"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 0,
        background: 'transparent',
      }}
    />
  );
}
