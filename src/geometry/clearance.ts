export const RECOMMENDED_CLEARANCE = 70;

export function isTightClearance(cm: number) {
  return cm > 0 && cm < RECOMMENDED_CLEARANCE;
}
