"use client";

import { InputHTMLAttributes, useState } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | string | undefined;
  onValue: (value: number) => void;
  /** number sent to the parent while the box is empty */
  emptyValue?: number;
};

// Number box where the user can clear the "0" with Backspace and type a new value.
export default function NumInput({ value, onValue, emptyValue = 0, onFocus, onBlur, ...rest }: Props) {
  const [text, setText] = useState<string | null>(null);
  return <input
    {...rest}
    type="number"
    value={text ?? String(value ?? "")}
    onFocus={e => { setText(String(value ?? "")); e.target.select(); onFocus?.(e); }}
    onChange={e => { const v = e.target.value; setText(v); onValue(v === "" ? emptyValue : Number(v)); }}
    onBlur={e => { setText(null); onBlur?.(e); }}
  />;
}
