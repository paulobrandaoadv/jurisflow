"use client";

import type { ReactNode } from "react";

type ConfirmSubmitProps = {
  mensagem: string;
  children: ReactNode;
};

export function ConfirmSubmit({ mensagem, children }: ConfirmSubmitProps) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (!window.confirm(mensagem)) event.preventDefault();
      }}
      className="text-xs text-red-700 underline hover:text-red-900"
    >
      {children}
    </button>
  );
}
