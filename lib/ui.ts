import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...values: ClassValue[]) => twMerge(clsx(values));
// Shared Tailwind recipes. Semantic names also identify editor regions for tests.
const recipes: Record<string, string> = {
  studio:
    'flex min-h-dvh min-w-0 flex-col bg-zinc-950 font-sans text-xs leading-5 text-zinc-200 antialiased lg:h-dvh lg:overflow-hidden [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-xs [&_h3]:font-semibold [&_button]:cursor-pointer [&_button]:disabled:cursor-not-allowed [&_button]:disabled:opacity-40 [&_a]:hover:text-violet-300 [&_svg]:shrink-0',
  loading: 'items-center justify-center gap-4',
  'studio-header':
    'flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-3 lg:px-4',
  'studio-brand':
    'flex shrink-0 items-center gap-3 font-medium [&>span:last-child]:hidden sm:[&>span:last-child]:inline',
  'logo-mark': 'text-2xl font-bold tracking-tight text-violet-300',
  'brand-divider': 'hidden h-5 w-px bg-zinc-800 sm:block',
  beta: 'ml-2 rounded border border-zinc-700 px-1 text-xs text-zinc-400',
  'project-title':
    'flex min-w-0 max-w-80 flex-1 items-center justify-center gap-2 [&_input]:border-transparent [&_input]:bg-transparent [&_input]:text-center',
  'project-dot': 'hidden size-1.5 rounded-full bg-emerald-400 sm:block',
  saved: 'hidden shrink-0 items-center gap-1 text-xs text-zinc-500 xl:flex',
  'header-actions':
    'flex shrink-0 items-center gap-1 [&>button[title^=Redo]]:hidden sm:[&>button[title^=Redo]]:inline-flex',
  separator: 'mx-1 h-4 w-px shrink-0 bg-zinc-800',
  primary: 'border-violet-400 bg-violet-400 font-medium text-zinc-950 hover:bg-violet-300',
  workspace:
    'flex min-h-0 min-w-0 flex-1 flex-col lg:grid lg:grid-cols-[220px_minmax(0,1fr)_300px] xl:grid-cols-[240px_minmax(0,1fr)_320px]',
  library:
    'order-2 flex min-h-0 min-w-0 flex-col border-r border-zinc-800 bg-zinc-900/60 lg:order-none',
  'panel-tabs':
    'flex h-11 shrink-0 items-center gap-1 border-b border-zinc-800 px-2 [&_button]:rounded-md [&_button]:px-3 [&_button]:py-2 [&_button[aria-selected=true]]:bg-zinc-800 [&_button[aria-selected=true]]:text-zinc-100 [&_button]:inline-flex [&_button]:items-center [&_button]:gap-2',
  'library-heading': 'space-y-1 p-4 [&_p]:text-xs [&_p]:text-zinc-500',
  search:
    'mx-4 mb-3 flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-2 [&_input]:border-0 [&_input]:bg-transparent [&_kbd]:text-zinc-500',
  'effect-filters':
    'mb-3 flex shrink-0 flex-wrap gap-1 px-3 [&_button]:rounded [&_button]:px-2 [&_button]:py-1.5 [&_button]:hover:bg-zinc-800',
  active: 'border-violet-400/60 bg-violet-400/10 text-violet-200',
  selected: 'border-violet-300 bg-violet-300/15 text-violet-200 ring-1 ring-violet-300/50',
  'effect-library':
    'grid max-h-64 min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto px-4 pb-4 lg:max-h-none',
  'effect-card':
    'group flex flex-col gap-1.5 rounded-lg text-left text-xs [&>small]:text-xs [&>small]:text-zinc-500 [&>span]:font-medium',
  'effect-art':
    'relative flex h-20 w-full items-center justify-center overflow-hidden rounded-md border border-zinc-700 bg-zinc-800/60 text-2xl text-violet-200 group-hover:border-violet-400/70 [&>i]:hidden',
  'art-1': 'text-cyan-200',
  'art-2': 'text-amber-200',
  'art-3': 'text-rose-200',
  'art-4': 'text-blue-200',
  'art-5': 'text-lime-200',
  'effect-add':
    'absolute right-1 bottom-1 flex size-6 items-center justify-center rounded bg-zinc-950/80 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
  empty: 'col-span-full p-4 text-xs text-zinc-500',
  'library-custom':
    'm-3 flex shrink-0 items-center gap-2 rounded-lg border border-dashed border-zinc-700 p-3 text-left hover:border-violet-400 [&>span]:flex-1 [&_small]:block [&_small]:text-zinc-500',
  'project-tools': 'flex flex-wrap gap-2 px-4 pb-3',
  'project-clips':
    'min-h-0 max-h-64 flex-1 overflow-y-auto px-3 lg:max-h-none [&>button]:mb-1 [&>button]:flex [&>button]:w-full [&>button]:items-center [&>button]:gap-3 [&>button]:rounded-md [&>button]:p-2 [&>button]:text-left [&_strong]:block [&_small]:block [&_small]:text-zinc-500 [&>button>span:nth-child(2)]:min-w-0 [&>button>span:nth-child(2)]:flex-1 [&>button>span:nth-child(2)>strong]:truncate',
  'clip-mini':
    'flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800 font-medium',
  'demo-section': 'border-t border-zinc-800 p-3 [&_button]:mt-2 [&_button]:w-full',
  eyebrow: 'text-xs font-medium uppercase tracking-wider text-zinc-500',
  'library-foot':
    'flex h-9 shrink-0 items-center justify-between border-t border-zinc-800 px-3 text-xs text-zinc-500',
  'tiny-dot': 'mr-2 inline-block size-1.5 rounded-full bg-emerald-400',
  composition: 'order-1 flex min-h-0 min-w-0 flex-col bg-zinc-950 lg:order-none',
  'composition-bar':
    'flex h-11 shrink-0 items-center justify-between gap-2 border-b border-zinc-800 px-4 text-xs text-zinc-400 [&>div]:flex [&>div]:items-center [&>div]:gap-3',
  'tab-name': 'flex items-center gap-2 text-zinc-200',
  'stage-area': 'flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-4 lg:p-6',
  'stage-topline':
    'flex w-full items-center justify-between text-xs text-zinc-500 [&>span]:flex [&>span]:items-center [&>span]:gap-2',
  'live-dot': 'size-1.5 rounded-full bg-emerald-400',
  'stage-frame':
    'relative max-h-full w-full overflow-hidden rounded-md border border-zinc-700 bg-zinc-900 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full [&>canvas]:touch-none',
  checker: 'bg-zinc-800 bg-[url(/checker.svg)] bg-repeat',
  'stage-corner': 'hidden',
  'safe-area':
    'pointer-events-none absolute inset-[10%] rounded-sm border border-dashed border-emerald-400/40',
  'stage-bottomline': 'flex w-full items-center justify-between gap-3 text-xs text-zinc-500',
  transport:
    'flex min-h-14 flex-wrap py-2 shrink-0 items-center justify-between gap-2 border-t border-zinc-800 px-3',
  'preview-options':
    'flex items-center gap-1 [&>.preview-scale]:hidden xl:[&>.preview-scale]:block',
  'playback-controls': 'flex items-center gap-2',
  'play-button': 'size-9 rounded-full border-0 bg-violet-400 text-zinc-950 hover:bg-violet-300',
  'transport-time': 'flex items-center gap-2 font-mono text-xs [&_select]:w-16',
  muted: 'text-zinc-500',
  inspector:
    'order-3 flex min-h-0 min-w-0 flex-col border-l border-zinc-800 bg-zinc-900/60 lg:order-none',
  'inspector-heading':
    'flex h-11 shrink-0 items-center justify-between border-b border-zinc-800 px-4 text-xs text-zinc-400 [&>span:first-child]:flex [&>span:first-child]:items-center [&>span:first-child]:gap-2',
  'selection-tag': 'rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500',
  'selected-summary':
    'flex shrink-0 items-center gap-3 p-4 [&_strong]:block [&_strong]:max-w-52 [&_strong]:truncate [&_strong]:font-medium [&_small]:block [&_small]:text-xs [&_small]:text-zinc-500',
  'selected-icon':
    'flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800',
  'inspector-tabs':
    'flex shrink-0 gap-1 border-b border-zinc-800 px-3 pb-2 [&_button]:flex-1 [&_button]:rounded-md [&_button]:px-2 [&_button]:py-2 [&_button]:text-xs [&_button[aria-selected=true]]:bg-zinc-800 [&_button[aria-selected=true]]:text-violet-200',
  'inspector-body': 'max-h-96 min-h-0 flex-1 overflow-y-auto lg:max-h-none',
  'inspector-section':
    'space-y-3 border-b border-zinc-800 p-4 [&_h3]:mb-3 [&_h3]:flex [&_h3]:items-center [&_h3]:justify-between [&_h3>span]:font-normal [&_h3>span]:text-zinc-500',
  field: 'grid min-w-0 gap-1.5 text-xs [&>span]:text-zinc-400',
  'field-grid': 'grid grid-cols-2 gap-3',
  'number-wrap':
    'relative flex min-w-0 items-center [&_input]:pr-7 [&>span]:pointer-events-none [&>span]:absolute [&>span]:right-2 [&>span]:text-xs [&>span]:text-zinc-500',
  'lyric-input': 'min-h-24 resize-y leading-6',
  'glyph-selector':
    'flex flex-wrap gap-1 [&_button]:size-7 [&_button]:rounded [&_button]:border [&_button]:border-zinc-700 [&_button]:bg-zinc-800 [&_button]:text-xs',
  'text-button': 'border-transparent bg-transparent text-violet-300 hover:bg-violet-300/10',
  'color-field': 'flex items-center gap-2 [&_input[type=color]]:w-10 [&_span]:font-mono',
  checkbox:
    'flex items-center gap-2 text-xs text-zinc-400 [&_input]:size-4 [&_input]:shrink-0 [&_input]:accent-violet-400',
  hint: 'text-xs leading-5 text-zinc-500',
  'effect-stack':
    'space-y-2 [&>button]:flex [&>button]:w-full [&>button]:items-center [&>button]:gap-2 [&>button]:rounded-md [&>button]:border [&>button]:border-zinc-700 [&>button]:p-2 [&>button]:text-left [&_strong]:block [&_strong]:font-medium [&_small]:block [&_small]:text-xs [&_small]:text-zinc-500',
  'effect-order':
    'flex size-6 shrink-0 items-center justify-center rounded bg-zinc-800 text-zinc-500',
  'stack-actions': 'flex flex-wrap gap-2',
  'slider-control':
    'flex items-center gap-3 [&_input]:min-w-0 [&_input]:flex-1 [&_span]:w-9 [&_span]:text-right [&_span]:font-mono',
  'key-clock': 'text-right font-mono text-xs text-zinc-500',
  'key-add': 'flex gap-2',
  graph:
    'relative overflow-hidden rounded-md border border-zinc-700 bg-zinc-950 p-2 [&_svg]:h-28 [&_svg]:w-full',
  'graph-label': 'font-mono text-xs text-zinc-400',
  'graph-axis': 'flex justify-between text-xs text-zinc-500',
  'key-list':
    'space-y-2 [&_button]:flex [&_button]:w-full [&_button]:items-center [&_button]:justify-between [&_button]:rounded [&_button]:border [&_button]:border-zinc-700 [&_button]:px-2 [&_button]:py-1.5 [&_small]:text-xs [&_small]:text-zinc-500',
  'inspector-foot':
    'flex h-9 shrink-0 items-center justify-center border-t border-zinc-800 text-xs text-zinc-500',
  'timeline-panel':
    'flex h-80 max-h-[45dvh] min-h-64 shrink-0 flex-col border-t border-zinc-800 bg-zinc-900',
  'timeline-toolbar':
    'flex min-h-11 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-zinc-800 px-3 py-1.5 [&>div]:flex [&>div]:items-center [&>div]:gap-1.5 [&>div]:flex-wrap',
  'timeline-count': 'hidden rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-500 sm:block',
  'timeline-right': 'ml-auto shrink-0 font-mono text-xs [&_input]:w-24',
  'zoom-label': 'text-zinc-500',
  'loop-region-tools':
    'flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-800 px-3 py-2 [&_.field]:flex [&_.field]:items-center [&_.field]:gap-1.5 [&_.number-wrap]:w-20 [&>.hint]:hidden 2xl:[&>.hint]:block [&>.hint]:ml-auto',
  'swipe-choice': 'flex items-center gap-2 text-xs text-zinc-500 [&_select]:w-36',
  'timeline-scroll': 'min-h-0 flex-1 overflow-auto overscroll-x-contain',
  'timeline-content': 'relative min-h-full',
  'timeline-row': 'flex min-w-0 border-b border-zinc-800',
  'track-label':
    'sticky left-0 z-20 flex w-[188px] shrink-0 items-center gap-2 border-r border-zinc-800 bg-zinc-900 px-3 text-xs text-zinc-400 [&_strong]:min-w-0 [&_strong]:flex-1 [&_strong]:truncate [&_strong]:font-normal',
  'region-row': 'h-8',
  'ruler-row': 'sticky top-0 z-10 h-8 bg-zinc-950',
  'ruler-label': 'text-xs text-zinc-500',
  'region-lane': 'relative h-8 shrink-0 bg-zinc-900',
  'region-range':
    'absolute top-1 h-6 min-w-2 cursor-grab touch-none rounded-sm border border-zinc-600 bg-violet-400/10 [&>span]:block [&>span]:truncate [&>span]:px-4 [&>span]:text-center [&>span]:text-xs [&>span]:text-violet-200',
  enabled: 'border-violet-400 bg-violet-400/20',
  'region-handle': 'absolute inset-y-0 w-3 touch-none bg-violet-300 text-xs text-zinc-950',
  start: 'left-0 cursor-ew-resize',
  end: 'right-0 cursor-ew-resize',
  'time-ruler':
    'relative h-8 shrink-0 select-none border-b border-zinc-800 [&>span]:absolute [&>span]:top-1 [&>span]:border-l [&>span]:border-zinc-700 [&>span]:pl-1 [&>span]:text-xs [&>span]:text-zinc-500 [&>span]:last:-translate-x-full',
  'playhead-handle': 'absolute bottom-0 z-10 h-3 w-2 -translate-x-1/2 rounded-t bg-violet-300',
  'track-index': 'text-xs text-zinc-600',
  'clip-lane': 'relative shrink-0 bg-zinc-950/50',
  'muted-layer': 'opacity-40',
  'timeline-clip':
    'absolute flex h-8 min-w-2 touch-none items-center gap-2 overflow-hidden rounded-md border border-(--clip-color) bg-(--clip-color)/15 px-2 text-xs text-(--clip-color) focus-visible:outline-2 focus-visible:outline-violet-300',
  'trim-handle':
    'absolute inset-y-0 z-10 w-2 cursor-ew-resize touch-none bg-white/10 opacity-0 hover:bg-white/30 hover:opacity-100',
  left: 'left-0',
  right: 'right-0',
  'clip-content': 'flex min-w-0 flex-1 items-center gap-2 truncate [&>span]:shrink-0',
  'clip-duration': 'shrink-0 font-mono text-xs opacity-70',
  'timeline-playhead': 'pointer-events-none absolute inset-y-0 z-10 w-px bg-violet-300',
  'audio-row': 'h-12',
  'audio-lane':
    'relative flex h-12 shrink-0 items-center bg-zinc-950/50 [&>svg]:absolute [&>svg]:inset-0 [&>svg]:h-full [&>svg]:w-full [&_button]:flex [&_button]:items-center [&_button]:gap-2 [&_button]:mx-2 [&_button]:text-xs [&_button]:text-zinc-500',
  'key-row': 'h-9',
  'key-lane': 'relative h-9 shrink-0 bg-zinc-950/50',
  'timeline-key': 'absolute top-1.5 -translate-x-1/2 text-violet-300',
  statusbar:
    'flex min-h-8 shrink-0 flex-wrap items-center justify-between gap-2 border-t border-zinc-800 px-3 text-xs text-zinc-500 [&>div]:flex [&>div]:items-center [&>div]:gap-3 [&_a]:inline-flex [&_a]:items-center [&_a]:gap-1.5',
  'obs-sync': 'hidden items-center gap-1.5 sm:flex',
  version: 'hidden sm:inline',
  'restore-banner':
    'fixed right-4 bottom-12 left-4 z-50 flex flex-wrap items-center gap-3 rounded-lg border border-amber-400/40 bg-zinc-900 p-4 text-sm shadow-xl [&>span]:flex-1',
  'modal-backdrop':
    'fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm',
  modal:
    'flex max-h-[90dvh] w-full max-w-xl flex-col overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl',
  wide: 'max-w-3xl',
  'modal-heading':
    'mb-4 flex items-center justify-between gap-3 [&_h2]:text-lg [&_h2]:font-semibold',
  'modal-description': 'mb-4 text-sm leading-6 text-zinc-400',
  'code-error':
    'mb-4 rounded-md border border-rose-400/40 bg-rose-400/10 p-3 text-sm text-rose-200',
  'export-option':
    'mb-2 flex w-full items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 text-left hover:border-violet-400/50 [&_strong]:block [&_strong]:text-sm [&_small]:block [&_small]:text-xs [&_small]:text-zinc-500',
  'export-icon':
    'flex size-10 shrink-0 items-center justify-center rounded-md bg-violet-400/10 text-violet-300',
  'obs-note':
    'mt-4 space-y-3 rounded-lg border border-zinc-700 p-4 text-sm [&_p]:text-xs [&_p]:text-zinc-400 [&_code]:block [&_code]:break-all [&_code]:text-xs [&_code]:text-violet-200',
  'relay-controls': 'flex flex-wrap gap-2 [&_input]:flex-1',
  'code-tabs': 'mb-4 flex flex-wrap gap-2',
  'code-editor': 'min-h-64 w-full font-mono text-sm',
  'modal-actions': 'mt-4 flex items-center justify-between gap-3',
  'shortcut-list':
    'space-y-2 [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:gap-4 [&_kbd]:rounded [&_kbd]:border [&_kbd]:border-zinc-700 [&_kbd]:bg-zinc-800 [&_kbd]:px-2 [&_kbd]:py-1 [&_kbd]:text-xs',
  'docs-link': 'mt-4 inline-flex items-center gap-2 text-xs text-violet-300',
  'modal-status': 'mt-4 text-xs text-zinc-500',
  'bezier-editor': 'grid gap-3',
  'bezier-graph':
    'overflow-hidden rounded-md border border-zinc-700 bg-zinc-950 [&_svg]:h-44 [&_svg]:w-full [&_text]:fill-zinc-500 [&_text]:text-xs [&_circle[role]]:cursor-grab [&_circle[role]]:touch-none [&_circle[role]:focus]:stroke-white',
  'bezier-values':
    'grid grid-cols-4 gap-2 [&_label]:grid [&_label]:gap-1 [&_label]:text-xs [&_label]:text-zinc-400',
  'motion-path-editor': 'grid gap-3',
  'path-graph':
    'overflow-hidden rounded-md border border-zinc-700 bg-zinc-950 [&_svg]:h-44 [&_svg]:w-full [&_circle[role]]:cursor-grab [&_circle[role]]:touch-none [&_circle[role]:focus]:stroke-white',
  'path-values':
    'grid gap-2 [&>div]:grid [&>div]:grid-cols-[64px_1fr_1fr] [&>div]:items-center [&>div]:gap-2 [&_label]:grid [&_label]:gap-1 [&_small]:text-xs [&_small]:text-zinc-500',
  'context-menu': 'z-50 w-60 rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-2xl',
};
export function ui(value: string) {
  return cn(value, ...value.split(/\s+/).map((name) => recipes[name] || ''));
}
