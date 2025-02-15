import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';

@Injectable()
export class SkillRequirementManager {
  private readonly CACHE_TTL = 3600; // 1 hour

  constructor(
    @InjectModel('Skill') private skillModel: Model<any>,
    @InjectModel('SkillCategory') private categoryModel: Model<any>,
    private cacheService: CacheService,
    private logger: Logger
  ) {}

  async defineSkillRequirements(
    input: SkillRequirementInput
  ): Promise<SkillRequirementResponse> {
    try {
      // Validate skill data
      await this.validateSkillData(input);

      // Create or update skill requirements
      const skillRequirement = await this.skillModel.create({
        ...input,
        status: 'active',
        createdAt: new Date()
      });

      // Update cache
      await this.invalidateSkillCache();

      return {
        success: true,
        skillId: skillRequirement._id,
        message: 'Skill requirements defined successfully'
      };
    } catch (error) {
      this.logger.error('Error defining skill requirements:', error);
      throw error;
    }
  }

  async getSkillsByCategory(
    category: string
  ): Promise<SkillCategoryResponse> {
    const cacheKey = `skills:category:${category}`;
    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const skills = await this.skillModel.find({
      category,
      status: 'active'
    });

    const response = {
      category,
      skills: skills.map(skill => ({
        id: skill._id,
        name: skill.name,
        level: skill.level,
        requirements: skill.requirements
      }))
    };

    await this.cacheService.set(cacheKey, response, this.CACHE_TTL);
    return response;
  }

  async validateSkillSet(
    skills: SkillValidationInput[]
  ): Promise<SkillValidationResponse> {
    try {
      const validations = await Promise.all(
        skills.map(async skill => {
          const requirement = await this.skillModel.findOne({
            name: skill.name,
            status: 'active'
          });

          if (!requirement) {
            return {
              skill: skill.name,
              valid: false,
              message: 'Skill not found'
            };
          }

          return this.validateSkillLevel(skill, requirement);
        })
      );

      return {
        valid: validations.every(v => v.valid),
        validations
      };
    } catch (error) {
      this.logger.error('Error validating skills:', error);
      throw error;
    }
  }

  private async validateSkillData(
    input: SkillRequirementInput
  ): Promise<void> {
    // Check if category exists
    const category = await this.categoryModel.findById(input.categoryId);
    if (!category) {
      throw new Error('Invalid skill category');
    }

    // Validate levels
    if (input.levels) {
      const validLevels = ['beginner', 'intermediate', 'expert'];
      input.levels.forEach(level => {
        if (!validLevels.includes(level.name)) {
          throw new Error(`Invalid skill level: ${level.name}`);
        }
      });
    }

    // Check for duplicate skills
    const existing = await this.skillModel.findOne({
      name: input.name,
      status: 'active'
    });

    if (existing) {
      throw new Error('Skill already exists');
    }
  }

  private validateSkillLevel(
    skill: SkillValidationInput,
    requirement: any
  ): SkillValidation {
    const validation: SkillValidation = {
      skill: skill.name,
      valid: true,
      details: {}
    };

    // Check level
    if (requirement.levels) {
      const levelIndex = requirement.levels.findIndex(
        l => l.name === skill.level
      );
      if (levelIndex === -1) {
        validation.valid = false;
        validation.details.level = 'Invalid skill level';
      }
    }

    // Check experience
    if (requirement.minimumExperience && 
        skill.yearsOfExperience < requirement.minimumExperience) {
      validation.valid = false;
      validation.details.experience = 'Insufficient experience';
    }

    // Check certifications
    if (requirement.requiredCertifications?.length > 0) {
      const missingCerts = requirement.requiredCertifications.filter(
        cert => !skill.certifications?.includes(cert)
      );
      if (missingCerts.length > 0) {
        validation.valid = false;
        validation.details.certifications = `Missing certifications: ${missingCerts.join(', ')}`;
      }
    }

    return validation;
  }

  private async invalidateSkillCache(): Promise<void> {
    const categories = await this.categoryModel.find();
    await Promise.all(
      categories.map(category =>
        this.cacheService.delete(`skills:category:${category._id}`)
      )
    );
  }
}

interface SkillRequirementInput {
  name: string;
  categoryId: string;
  description?: string;
  levels?: Array<{
    name: 'beginner' | 'intermediate' | 'expert';
    description: string;
    requirements?: string[];
  }>;
  minimumExperience?: number;
  requiredCertifications?: string[];
  assessmentCriteria?: Array<{
    criterion: string;
    weight: number;
  }>;
  keywords?: string[];
}

interface SkillValidationInput {
  name: string;
  level?: string;
  yearsOfExperience?: number;
  certifications?: string[];
}

interface SkillValidation {
  skill: string;
  valid: boolean;
  details?: Record<string, string>;
  message?: string;
}

interface SkillRequirementResponse {
  success: boolean;
  skillId: string;
  message: string;
}

interface SkillCategoryResponse {
  category: string;
  skills: Array<{
    id: string;
    name: string;
    level: string;
    requirements: any;
  }>;
}

interface SkillValidationResponse {
  valid: boolean;
  validations: SkillValidation[];
} 