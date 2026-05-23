export const fmtKsh = (n: number) =>
  `Ksh ${Number(n).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export const fmtDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
