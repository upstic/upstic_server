import { RateCard, IRateCard } from '../models/RateCard';
import { Shift } from '../models/Shift';
import { Client } from '../models/Client';
import { AppError } from '../middleware/errorHandler';
import { redisService } from './redis.service';

export class FinancialService {
  static async createRateCard(rateCardData: Partial<IRateCard>): Promise<IRateCard> {
    const client = await Client.findById(rateCardData.clientId);
    if (!client) {
      throw new AppError(404, 'Client not found');
    }

    // Check for overlapping rate cards
    const existingRateCard = await RateCard.findOne({
      clientId: rateCardData.clientId,
      jobType: rateCardData.jobType,
      effectiveFrom: { $lte: rateCardData.effectiveFrom },
      $or: [
        { effectiveTo: { $gte: rateCardData.effectiveFrom } },
        { effectiveTo: null }
      ]
    });

    if (existingRateCard) {
      throw new AppError(400, 'Overlapping rate card exists for this period');
    }

    const rateCard = new RateCard(rateCardData);
    await rateCard.save();

    // Clear cache
    await this.clearRateCardCache(rateCardData.clientId);

    return rateCard;
  }

  static async calculateShiftCost(shiftId: string): Promise<{
    baseCost: number;
    overtimeCost: number;
    allowances: number;
    taxes: number;
    totalCost: number;
  }> {
    const shift = await Shift.findById(shiftId).populate('clientId');
    if (!shift) {
      throw new AppError(404, 'Shift not found');
    }

    const rateCard = await this.getActiveRateCard(shift.clientId, shift.jobId);
    if (!rateCard) {
      throw new AppError(404, 'No active rate card found');
    }

    const hours = shift.totalHours || 0;
    let baseCost = 0;
    let overtimeCost = 0;
    let allowances = 0;

    // Calculate base cost
    if (hours <= rateCard.minimumHours) {
      baseCost = rateCard.baseRate * rateCard.minimumHours;
    } else {
      const regularHours = Math.min(hours, 8);
      const overtimeHours = Math.max(0, hours - 8);
      
      baseCost = regularHours * rateCard.baseRate;
      overtimeCost = overtimeHours * rateCard.overtimeRate;
    }

    // Add allowances
    if (rateCard.allowances) {
      allowances = Object.values(rateCard.allowances).reduce((sum, value) => sum + (value || 0), 0);
    }

    // Calculate markup
    let markup = 0;
    if (rateCard.markup.type === 'flat') {
      markup = (baseCost + overtimeCost) * (rateCard.markup.percentage / 100);
    } else {
      // Handle tiered markup
      const applicableTier = rateCard.markup.tiers?.find(tier => hours <= tier.hours);
      if (applicableTier) {
        markup = (baseCost + overtimeCost) * (applicableTier.percentage / 100);
      }
    }

    // Calculate taxes
    const subtotal = baseCost + overtimeCost + allowances + markup;
    const taxes = rateCard.taxes.applicable && rateCard.taxes.rate 
      ? subtotal * (rateCard.taxes.rate / 100)
      : 0;

    return {
      baseCost,
      overtimeCost,
      allowances,
      taxes,
      totalCost: subtotal + taxes
    };
  }

  private static async getActiveRateCard(
    clientId: string,
    jobType: string
  ): Promise<IRateCard | null> {
    const cacheKey = `ratecard:${clientId}:${jobType}`;
    const cachedRateCard = await redisService.get(cacheKey);
    
    if (cachedRateCard) {
      return cachedRateCard;
    }

    const rateCard = await RateCard.findOne({
      clientId,
      jobType,
      effectiveFrom: { $lte: new Date() },
      $or: [
        { effectiveTo: { $gt: new Date() } },
        { effectiveTo: null }
      ]
    });

    if (rateCard) {
      await redisService.set(cacheKey, rateCard, 3600); // Cache for 1 hour
    }

    return rateCard;
  }

  private static async clearRateCardCache(clientId: string): Promise<void> {
    const pattern = `ratecard:${clientId}:*`;
    await redisService.deletePattern(pattern);
  }
} 