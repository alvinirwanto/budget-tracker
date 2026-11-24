import { Fragment } from "react";

/** Matches amounts made by formatIDR: "Rp 17.688.000" and "-Rp 100.000". */
const AMOUNT = /(-?Rp[  ]\d[\d.]*)/g;

/** Plain text with every amount of money set in the money font. */
export function MoneyText({ children }: { children: string }) {
  return (
    <>
      {children.split(AMOUNT).map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="money">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
