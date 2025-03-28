/**
 * Interface for geographical coordinates
 */
export interface ICoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Interface for address
 */
export interface IAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: ICoordinates;
} 