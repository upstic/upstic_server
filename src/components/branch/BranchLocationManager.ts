import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';
import { GeolocationService } from '../../services/geolocation.service';
import { ValidationService } from '../../services/validation.service';
import { NotificationService } from '../../services/notification.service';

@Injectable()
export class BranchLocationManager {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly SEARCH_RADIUS = 50; // kilometers
  private readonly MAX_RESULTS = 100;
  private readonly GEOCODING_BATCH_SIZE = 50;

  constructor(
    @InjectModel('Branch') private branchModel: Model<any>,
    @InjectModel('Region') private regionModel: Model<any>,
    @InjectModel('Coverage') private coverageModel: Model<any>,
    private geolocationService: GeolocationService,
    private validationService: ValidationService,
    private notificationService: NotificationService,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async createBranch(
    input: BranchInput
  ): Promise<BranchResponse> {
    try {
      // Validate branch data
      await this.validateBranchData(input);

      // Geocode address
      const location = await this.geolocationService.geocode(input.address);

      // Create branch record
      const branch = await this.branchModel.create({
        ...input,
        location,
        status: 'active',
        createdAt: new Date()
      });

      // Update region coverage
      await this.updateRegionCoverage(branch);

      // Notify relevant parties
      await this.notifyBranchCreation(branch);

      return {
        success: true,
        branchId: branch._id,
        message: 'Branch created successfully'
      };
    } catch (error) {
      this.logger.error('Error creating branch:', error);
      throw error;
    }
  }

  async findNearbyBranches(
    input: LocationQuery
  ): Promise<BranchSearchResponse> {
    const cacheKey = this.generateSearchCacheKey(input);
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      // Convert address to coordinates if needed
      const coordinates = input.coordinates || 
        await this.geolocationService.geocode(input.address);

      // Find branches within radius
      const branches = await this.branchModel.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [coordinates.longitude, coordinates.latitude]
            },
            $maxDistance: input.radius || this.SEARCH_RADIUS * 1000 // convert to meters
          }
        },
        status: 'active'
      }).limit(input.limit || this.MAX_RESULTS);

      // Calculate distances and sort
      const results = await this.processBranchResults(branches, coordinates);

      const response = {
        branches: results,
        metadata: this.generateSearchMetadata(input, results)
      };

      await this.cacheService.set(cacheKey, response, this.CACHE_TTL);
      return response;
    } catch (error) {
      this.logger.error('Error finding nearby branches:', error);
      throw error;
    }
  }

  async updateBranchDetails(
    branchId: string,
    input: BranchUpdateInput
  ): Promise<BranchResponse> {
    try {
      // Validate update data
      await this.validateBranchUpdate(input);

      // Get current branch data
      const currentBranch = await this.branchModel.findById(branchId);
      if (!currentBranch) {
        throw new Error('Branch not found');
      }

      // Process location update if address changed
      let location = currentBranch.location;
      if (input.address) {
        location = await this.geolocationService.geocode(input.address);
      }

      // Update branch record
      const branch = await this.branchModel.findByIdAndUpdate(
        branchId,
        {
          ...input,
          location,
          updatedAt: new Date()
        },
        { new: true }
      );

      // Update region coverage if location changed
      if (input.address) {
        await this.updateRegionCoverage(branch);
      }

      // Clear relevant caches
      await this.clearBranchCaches(branchId);

      return {
        success: true,
        branchId: branch._id,
        message: 'Branch updated successfully'
      };
    } catch (error) {
      this.logger.error('Error updating branch:', error);
      throw error;
    }
  }

  async getBranchStatistics(
    branchId: string
  ): Promise<BranchStatistics> {
    const cacheKey = `branch:stats:${branchId}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    try {
      const branch = await this.branchModel.findById(branchId);
      if (!branch) {
        throw new Error('Branch not found');
      }

      const stats = await this.calculateBranchStatistics(branch);
      await this.cacheService.set(cacheKey, stats, this.CACHE_TTL);

      return stats;
    } catch (error) {
      this.logger.error('Error getting branch statistics:', error);
      throw error;
    }
  }

  private async processBranchResults(
    branches: any[],
    coordinates: Coordinates
  ): Promise<BranchResult[]> {
    return branches.map(branch => ({
      id: branch._id,
      name: branch.name,
      address: branch.address,
      distance: this.calculateDistance(
        coordinates,
        branch.location.coordinates
      ),
      contact: branch.contact,
      services: branch.services,
      operatingHours: branch.operatingHours
    })).sort((a, b) => a.distance - b.distance);
  }

  private async updateRegionCoverage(
    branch: any
  ): Promise<void> {
    try {
      const region = await this.findOrCreateRegion(branch.location);
      await this.coverageModel.findOneAndUpdate(
        { regionId: region._id },
        {
          $addToSet: { branchIds: branch._id },
          updatedAt: new Date()
        },
        { upsert: true }
      );
    } catch (error) {
      this.logger.error('Error updating region coverage:', error);
      throw error;
    }
  }

  private calculateDistance(
    point1: Coordinates,
    point2: [number, number]
  ): number {
    // Haversine formula implementation
    const R = 6371; // Earth's radius in kilometers
    const lat1 = this.toRadians(point1.latitude);
    const lat2 = this.toRadians(point2[1]);
    const deltaLat = this.toRadians(point2[1] - point1.latitude);
    const deltaLon = this.toRadians(point2[0] - point1.longitude);

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLon/2) * Math.sin(deltaLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI/180);
  }

  private generateSearchCacheKey(
    input: LocationQuery
  ): string {
    return `branch:search:${JSON.stringify(input)}`;
  }
}

interface BranchInput {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  contact: {
    phone: string;
    email: string;
  };
  services: string[];
  operatingHours: Array<{
    day: string;
    open: string;
    close: string;
  }>;
  capacity?: {
    workers: number;
    clients: number;
  };
  facilities?: string[];
}

interface BranchResponse {
  success: boolean;
  branchId: string;
  message: string;
}

interface LocationQuery {
  address?: {
    street?: string;
    city: string;
    state: string;
    country: string;
  };
  coordinates?: Coordinates;
  radius?: number;
  limit?: number;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface BranchSearchResponse {
  branches: BranchResult[];
  metadata: {
    query: LocationQuery;
    total: number;
    radius: number;
  };
}

interface BranchResult {
  id: string;
  name: string;
  address: any;
  distance: number;
  contact: any;
  services: string[];
  operatingHours: any[];
}

interface BranchUpdateInput {
  name?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  contact?: {
    phone: string;
    email: string;
  };
  services?: string[];
  operatingHours?: Array<{
    day: string;
    open: string;
    close: string;
  }>;
  status?: 'active' | 'inactive' | 'maintenance';
}

interface BranchStatistics {
  workers: {
    total: number;
    active: number;
    available: number;
  };
  clients: {
    total: number;
    active: number;
  };
  services: {
    total: number;
    byType: Record<string, number>;
  };
  utilization: {
    daily: Array<{
      date: string;
      rate: number;
    }>;
    weekly: number;
    monthly: number;
  };
  performance: {
    responseTime: number;
    satisfaction: number;
    efficiency: number;
  };
} 