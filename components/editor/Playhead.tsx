'use client';
import { ui } from '../../lib/ui';
export default function Playhead({ time, duration }: { time: number; duration: number }) {
  return (
    <div className={ui('timeline-playhead')} style={{ left: `${(time / duration) * 100}%` }} />
  );
}
