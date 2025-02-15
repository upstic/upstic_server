interface Location {
  latitude: number;
  longitude: number;
}

export function calculateDistance(location1: Location | string, location2: Location | string): number {
  // For now, return a mock distance
  // TODO: Implement actual distance calculation using Google Maps API or similar
  return Math.random() * 100;
}
