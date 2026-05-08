"use client";

import { useState } from "react";
import { colorFromLogin, initials } from "@/lib/format";

interface Props {
  login: string;
  url?: string;
  size?: number;
  ringColor?: string;
}

export function Avatar({ login, url, size = 22, ringColor = "#111114" }: Props) {
  const [errored, setErrored] = useState(false);
  const showImg = url && !errored;

  if (showImg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={login}
        title={login}
        loading="lazy"
        onError={() => setErrored(true)}
        className="inline-block rounded-full shrink-0"
        style={{
          width: size,
          height: size,
          boxShadow: `0 0 0 1.5px ${ringColor}`,
        }}
      />
    );
  }

  const c = colorFromLogin(login);
  return (
    <div
      title={login}
      className="inline-flex items-center justify-center rounded-full font-medium tracking-tight shrink-0 select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, ${c}, ${c}aa)`,
        color: "#0a0a0c",
        boxShadow: `0 0 0 1.5px ${ringColor}`,
      }}
    >
      {initials(login)}
    </div>
  );
}
