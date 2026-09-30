'use client';
import { cloneElement, isValidElement, useId, type ReactNode, type ComponentProps } from 'react';
import { Tooltip, Tabs } from 'radix-ui';
import { cn, ui } from '../../lib/ui';
import Icon from '../Icon';
export function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const child =
    isValidElement<{ id?: string }>(children) && typeof children.type === 'string'
      ? cloneElement(children, { id: children.props.id || id })
      : children;
  return (
    <label className={ui('field')} htmlFor={id}>
      <span>{label}</span>
      {child}
    </label>
  );
}
const inputClass =
  'h-9 w-full min-w-0 rounded-md border border-zinc-700 bg-zinc-950 px-2.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus-visible:border-violet-400 focus-visible:ring-2 focus-visible:ring-violet-400/20 disabled:opacity-50';
export function Input({ className, type, ...props }: ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        type === 'checkbox'
          ? 'size-4 accent-violet-400'
          : type === 'range'
            ? 'h-8 min-w-0 accent-violet-400'
            : type === 'color'
              ? 'h-9 w-full cursor-pointer rounded-md border border-zinc-700 bg-zinc-950 p-1'
              : inputClass,
        className,
      )}
      {...props}
    />
  );
}
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return <select className={cn(inputClass, 'pr-6', className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea className={cn(inputClass, 'h-auto min-h-24 py-2 leading-6', className)} {...props} />
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  return (
    <Field label={label}>
      <div className={ui('number-wrap')}>
        <Input
          type="number"
          aria-label={label}
          value={Number(value.toFixed(3))}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            if (e.target.value !== '') {
              const n = Number(e.target.value);
              if (Number.isFinite(n))
                onChange(Math.max(min ?? -Infinity, Math.min(max ?? Infinity, n)));
            }
          }}
        />
        <span>{suffix}</span>
      </div>
    </Field>
  );
}
export function Button({
  icon,
  children,
  title,
  className = '',
  onClick,
  ...props
}: Omit<ComponentProps<'button'>, 'onClick'> & { icon?: string; onClick?: () => void }) {
  const button = (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 disabled:opacity-40',
        !children && 'size-8 p-0',
        ui(className),
      )}
      onClick={onClick}
      aria-label={title || undefined}
      title={title}
      {...props}
    >
      {icon && <Icon name={icon} />} {children}
    </button>
  );
  if (!title) return button;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{button}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="z-[100] rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1.5 text-xs text-zinc-100 shadow-lg"
        >
          {title}
          <Tooltip.Arrow className="fill-zinc-800" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
export function Section({
  title,
  children,
  description,
}: {
  title: ReactNode;
  children: ReactNode;
  description?: string;
}) {
  return (
    <section className={ui('inspector-section')}>
      <h3 className="text-xs font-semibold text-zinc-100">{title}</h3>
      {description && <p className="text-xs text-zinc-500">{description}</p>}
      {children}
    </section>
  );
}
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-xs text-zinc-400">
      {children}
    </kbd>
  );
}

export function TabsControl({
  value,
  onChange,
  items,
  label,
  children,
  listClass = 'panel-tabs',
  contentClass = '',
}: {
  value: string;
  onChange: (value: string) => void;
  items: { id: string; label: string; icon?: string }[];
  label: string;
  children: (id: string) => ReactNode;
  listClass?: string;
  contentClass?: string;
}) {
  return (
    <Tabs.Root value={value} onValueChange={onChange} className="flex min-h-0 flex-1 flex-col">
      <Tabs.List aria-label={label} className={ui(listClass)}>
        {items.map((item) => (
          <Tabs.Trigger
            key={item.id}
            value={item.id}
            className="inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs text-zinc-500 outline-none hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-violet-400 data-[state=active]:bg-zinc-800 data-[state=active]:text-violet-200"
          >
            {item.icon && <Icon name={item.icon} />} {item.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {items.map((item) => (
        <Tabs.Content
          key={item.id}
          value={item.id}
          className={cn('min-h-0 flex-1 focus:outline-none', ui(contentClass))}
        >
          {children(item.id)}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
