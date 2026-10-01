'use client';
import { ui } from '../../lib/ui';
import { useEditor } from './EditorContext';
import Icon from '../Icon';

import { Input } from '../ui';

export default function EditorFooter() {
  const {
    score,
    current,
    time,
    loop,
    status,
    setModal,
    relayConnected,
    broadcast,
    setBroadcast,
    scoreRef,
    timeRef,
    playingRef,
    loopRef,
    broadcastRef,
    send,
  } = useEditor();
  return (
    <footer className={ui('statusbar')}>
      <span role="status">
        <span className={ui('tiny-dot')} />
        {status}
      </span>
      <div>
        <label className={ui('obs-sync')}>
          <Input
            type="checkbox"
            checked={broadcast}
            onChange={(e) => {
              broadcastRef.current = e.target.checked;
              setBroadcast(e.target.checked);
              if (e.target.checked) {
                send('load', { score: scoreRef.current });
                send('loop', { loop: loopRef.current });
                send(playingRef.current ? 'play' : 'seek', { time: timeRef.current });
              }
            }}
          />
          <span>{relayConnected ? 'OBS relay connected ·' : 'Sync local player'}</span>
        </label>
        <a href="/player.html?autoplay=0" target="_blank" rel="noreferrer">
          <Icon name="eye" size={12} />
          Player
        </a>
        <button onClick={() => setModal('help')}>⌨ Shortcuts</button>
      </div>
    </footer>
  );
}
