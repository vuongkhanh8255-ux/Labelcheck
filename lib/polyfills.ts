// Polyfill for Map.prototype.getOrInsertComputed (ES2025)
// Required for older browsers (Safari < 18.4, older Chrome/Edge)
const MapProto = Map.prototype as any;

if (typeof Map !== 'undefined' && !MapProto.getOrInsertComputed) {
  MapProto.getOrInsertComputed = function(key: any, callbackFn: (key: any) => any) {
    if (this.has(key)) return this.get(key);
    const value = callbackFn(key);
    this.set(key, value);
    return value;
  };
}

if (typeof Map !== 'undefined' && !MapProto.getOrInsert) {
  MapProto.getOrInsert = function(key: any, defaultValue: any) {
    if (this.has(key)) return this.get(key);
    this.set(key, defaultValue);
    return defaultValue;
  };
}

export {};
