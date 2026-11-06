export const HOURS = [10,11,12,13,14,15,16,17,18,19,20,21,22,23,0,1];
export function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function hasTooManyConsecutiveHours(slots) {
  let count=0;
  return HOURS.some(hour=>{count=slots.includes(hour)?count+1:0;return count>2;});
}
