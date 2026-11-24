/** True once the user has moved between pages inside the app, so "back" has an app page to go to. */
let moved = false;

export function markMoved() {
  moved = true;
}

export function hasMoved() {
  return moved;
}
