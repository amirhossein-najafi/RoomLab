import { nanoid } from "nanoid";

export function uid() {
  return nanoid(10);
}

export function slugId() {
  return nanoid(8).toLowerCase();
}
