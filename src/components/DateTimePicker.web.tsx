// Web fallback for @react-native-community/datetimepicker (which is native-only).
// react-native-web renders through react-dom, so a real <input type="date|time">
// works here and gives the browser's built-in date/time picker.
import React, { useEffect, useRef } from 'react';

type DTChange = { type: 'set' | 'dismissed' };

interface Props {
  value: Date;
  mode?: 'date' | 'time';
  display?: string;
  is24Hour?: boolean;
  maximumDate?: Date;
  minimumDate?: Date;
  onChange?: (event: DTChange, date?: Date) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function DateTimePicker({
  value, mode = 'date', maximumDate, minimumDate, onChange,
}: Props) {
  const ref = useRef<HTMLInputElement | null>(null);
  const isTime = mode === 'time';

  // Pop the browser's native picker as soon as we mount (mirrors the RN modal UX).
  useEffect(() => {
    const el = ref.current as any;
    if (el && typeof el.showPicker === 'function') {
      try { el.showPicker(); } catch {}
    } else {
      el?.focus?.();
    }
  }, []);

  const handleChange = (ev: any) => {
    const v: string = ev.target.value;
    if (!v) { onChange?.({ type: 'dismissed' }, undefined); return; }
    const next = new Date(value.getTime());
    if (isTime) {
      const [h, m] = v.split(':').map(Number);
      next.setHours(h, m, 0, 0);
    } else {
      const [y, mo, da] = v.split('-').map(Number);
      next.setFullYear(y, mo - 1, da);
    }
    onChange?.({ type: 'set' }, next);
  };

  return React.createElement('input', {
    ref,
    type: isTime ? 'time' : 'date',
    value: isTime ? toTimeStr(value) : toDateStr(value),
    max: !isTime && maximumDate ? toDateStr(maximumDate) : undefined,
    min: !isTime && minimumDate ? toDateStr(minimumDate) : undefined,
    onChange: handleChange,
    style: {
      fontSize: 16,
      padding: '10px 12px',
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.2)',
      background: 'rgba(255,255,255,0.06)',
      color: '#fff',
      colorScheme: 'dark',
      marginTop: 8,
      width: '100%',
      boxSizing: 'border-box',
      fontFamily: 'inherit',
    },
  });
}
