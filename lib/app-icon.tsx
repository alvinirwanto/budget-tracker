import { ImageResponse } from "next/og";

const PINK = "#ff3378";

/**
 * Draws the app icon: a white wallet on pink. `safe` shrinks the wallet so it
 * survives the circle or squircle crop that Android uses for maskable icons.
 */
export function appIcon(size: number, safe = false) {
  const w = size * (safe ? 0.42 : 0.56);
  const h = w * 0.72;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: PINK,
        }}
      >
        <div
          style={{
            width: w,
            height: h,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            background: "#ffffff",
            borderRadius: w * 0.16,
            paddingRight: w * 0.08,
          }}
        >
          <div
            style={{
              width: w * 0.3,
              height: h * 0.36,
              background: PINK,
              borderRadius: w * 0.09,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: w * 0.07, height: w * 0.07, background: "#ffffff", borderRadius: 999 }} />
          </div>
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
