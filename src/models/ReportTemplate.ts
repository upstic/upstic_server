import { Schema, model, Document, Types } from 'mongoose';

/**
 * Enum for report template type
 */
export enum ReportTemplateType {
  FINANCIAL = 'FINANCIAL',
  OPERATIONAL = 'OPERATIONAL',
  PERFORMANCE = 'PERFORMANCE',
  COMPLIANCE = 'COMPLIANCE',
  ANALYTICS = 'ANALYTICS',
  DASHBOARD = 'DASHBOARD',
  CUSTOM = 'CUSTOM'
}

/**
 * Enum for report template status
 */
export enum ReportTemplateStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Enum for report data source type
 */
export enum ReportDataSourceType {
  DATABASE = 'DATABASE',
  API = 'API',
  FILE = 'FILE',
  MANUAL = 'MANUAL',
  EXTERNAL = 'EXTERNAL'
}

/**
 * Enum for report visualization type
 */
export enum ReportVisualizationType {
  TABLE = 'TABLE',
  BAR_CHART = 'BAR_CHART',
  LINE_CHART = 'LINE_CHART',
  PIE_CHART = 'PIE_CHART',
  AREA_CHART = 'AREA_CHART',
  SCATTER_PLOT = 'SCATTER_PLOT',
  HEATMAP = 'HEATMAP',
  GAUGE = 'GAUGE',
  CARD = 'CARD',
  MAP = 'MAP',
  CUSTOM = 'CUSTOM'
}

/**
 * Enum for report export format
 */
export enum ReportExportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  JSON = 'JSON',
  HTML = 'HTML',
  IMAGE = 'IMAGE'
}

/**
 * Enum for report schedule frequency
 */
export enum ReportScheduleFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM'
}

/**
 * Interface for report parameter
 */
export interface IReportParameter {
  name: string;
  label: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  options?: Array<{
    label: string;
    value: any;
  }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
  dependsOn?: string;
  visibleWhen?: {
    parameter: string;
    value: any;
    operator?: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
  };
}

/**
 * Interface for report data source
 */
export interface IReportDataSource {
  name: string;
  type: ReportDataSourceType;
  description?: string;
  
  // For DATABASE type
  collection?: string;
  query?: string;
  aggregation?: any[];
  
  // For API type
  endpoint?: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  body?: any;
  
  // For FILE type
  filePath?: string;
  fileType?: string;
  
  // Common fields
  parameters?: string[]; // Parameter names that affect this data source
  transformations?: Array<{
    type: 'filter' | 'sort' | 'group' | 'aggregate' | 'map' | 'join' | 'custom';
    config: any;
  }>;
  cache?: {
    enabled: boolean;
    ttlMinutes: number;
  };
}

/**
 * Interface for report visualization
 */
export interface IReportVisualization {
  id: string;
  name: string;
  type: ReportVisualizationType;
  dataSource: string; // Name of the data source
  title?: string;
  description?: string;
  
  // Data mapping
  dataMapping: {
    x?: string;
    y?: string;
    series?: string;
    value?: string;
    category?: string;
    color?: string;
    size?: string;
    label?: string;
    tooltip?: string[];
    columns?: string[];
  };
  
  // Appearance
  appearance: {
    width?: number;
    height?: number;
    position?: {
      row: number;
      column: number;
      rowSpan?: number;
      colSpan?: number;
    };
    colors?: string[];
    showLegend?: boolean;
    showLabels?: boolean;
    showGrid?: boolean;
    showTooltip?: boolean;
    theme?: 'light' | 'dark' | 'custom';
    customCSS?: string;
  };
  
  // Interactivity
  interactivity?: {
    drillDown?: boolean;
    filters?: boolean;
    sorting?: boolean;
    highlighting?: boolean;
    clickAction?: {
      type: 'filter' | 'navigate' | 'drillDown' | 'custom';
      target?: string;
      config?: any;
    };
  };
  
  // Advanced options
  options?: any;
}

/**
 * Interface for report section
 */
export interface IReportSection {
  id: string;
  title: string;
  description?: string;
  order: number;
  visualizations: string[]; // IDs of visualizations in this section
  parameters?: string[]; // Parameter names visible in this section
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  conditionalDisplay?: {
    parameter: string;
    value: any;
    operator?: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
  };
}

/**
 * Interface for report schedule
 */
export interface IReportSchedule {
  enabled: boolean;
  frequency: ReportScheduleFrequency;
  time?: string; // HH:MM format
  dayOfWeek?: number; // 0-6, 0 is Sunday
  dayOfMonth?: number; // 1-31
  month?: number; // 1-12
  customCron?: string;
  timezone?: string;
  startDate?: Date;
  endDate?: Date;
  recipients: Array<{
    type: 'email' | 'user' | 'group' | 'webhook';
    value: string;
  }>;
  exportFormat: ReportExportFormat;
  includeParameters?: boolean;
  subject?: string;
  message?: string;
  lastRun?: Date;
  nextRun?: Date;
}

/**
 * Interface for report template
 */
export interface IReportTemplate extends Document {
  // Core data
  name: string;
  code: string;
  description?: string;
  type: ReportTemplateType;
  status: ReportTemplateStatus;
  
  // Content
  parameters: IReportParameter[];
  dataSources: IReportDataSource[];
  visualizations: IReportVisualization[];
  sections: IReportSection[];
  
  // Layout
  layout: {
    type: 'fixed' | 'responsive' | 'grid';
    config?: any;
  };
  
  // Scheduling
  schedule?: IReportSchedule;
  
  // Export options
  exportOptions: {
    formats: ReportExportFormat[];
    headerTemplate?: string;
    footerTemplate?: string;
    paperSize?: 'A4' | 'Letter' | 'Legal' | 'Tabloid';
    orientation?: 'portrait' | 'landscape';
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  };
  
  // Access control
  isPublic: boolean;
  accessRoles?: string[];
  
  // Metadata
  tags?: string[];
  version: number;
  
  // Usage tracking
  usageCount: number;
  lastUsed?: Date;
  
  // Audit fields
  createdBy: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  activate(): Promise<IReportTemplate>;
  deactivate(): Promise<IReportTemplate>;
  archive(): Promise<IReportTemplate>;
  duplicate(): Promise<IReportTemplate>;
  incrementUsage(): Promise<IReportTemplate>;
  addParameter(parameter: IReportParameter): Promise<IReportTemplate>;
  addDataSource(dataSource: IReportDataSource): Promise<IReportTemplate>;
  addVisualization(visualization: IReportVisualization): Promise<IReportTemplate>;
  addSection(section: IReportSection): Promise<IReportTemplate>;
}

/**
 * Schema for report template
 */
const reportTemplateSchema = new Schema<IReportTemplate>(
  {
    // Core data
    name: {
      type: String,
      required: [true, 'Report template name is required'],
      trim: true,
      index: true
    },
    code: {
      type: String,
      required: [true, 'Report template code is required'],
      trim: true,
      unique: true,
      index: true
    },
    description: {
      type: String,
      trim: true
    },
    type: {
      type: String,
      enum: Object.values(ReportTemplateType),
      required: [true, 'Report template type is required'],
      index: true
    },
    status: {
      type: String,
      enum: Object.values(ReportTemplateStatus),
      default: ReportTemplateStatus.DRAFT,
      index: true
    },
    
    // Content
    parameters: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      label: {
        type: String,
        required: true,
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      type: {
        type: String,
        enum: ['string', 'number', 'boolean', 'date', 'array', 'object'],
        required: true
      },
      required: {
        type: Boolean,
        default: false
      },
      defaultValue: {
        type: Schema.Types.Mixed
      },
      options: [{
        label: {
          type: String,
          required: true
        },
        value: {
          type: Schema.Types.Mixed,
          required: true
        }
      }],
      validation: {
        min: Number,
        max: Number,
        pattern: String,
        minLength: Number,
        maxLength: Number
      },
      dependsOn: String,
      visibleWhen: {
        parameter: String,
        value: Schema.Types.Mixed,
        operator: {
          type: String,
          enum: ['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan']
        }
      }
    }],
    dataSources: [{
      name: {
        type: String,
        required: true,
        trim: true
      },
      type: {
        type: String,
        enum: Object.values(ReportDataSourceType),
        required: true
      },
      description: {
        type: String,
        trim: true
      },
      collection: String,
      query: String,
      aggregation: [Schema.Types.Mixed],
      endpoint: String,
      method: {
        type: String,
        enum: ['GET', 'POST', 'PUT']
      },
      headers: {
        type: Map,
        of: String
      },
      body: Schema.Types.Mixed,
      filePath: String,
      fileType: String,
      parameters: [String],
      transformations: [{
        type: {
          type: String,
          enum: ['filter', 'sort', 'group', 'aggregate', 'map', 'join', 'custom'],
          required: true
        },
        config: Schema.Types.Mixed
      }],
      cache: {
        enabled: {
          type: Boolean,
          default: false
        },
        ttlMinutes: {
          type: Number,
          default: 60
        }
      }
    }],
    visualizations: [{
      id: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true,
        trim: true
      },
      type: {
        type: String,
        enum: Object.values(ReportVisualizationType),
        required: true
      },
      dataSource: {
        type: String,
        required: true
      },
      title: String,
      description: String,
      dataMapping: {
        x: String,
        y: String,
        series: String,
        value: String,
        category: String,
        color: String,
        size: String,
        label: String,
        tooltip: [String],
        columns: [String]
      },
      appearance: {
        width: Number,
        height: Number,
        position: {
          row: {
            type: Number,
            required: true
          },
          column: {
            type: Number,
            required: true
          },
          rowSpan: Number,
          colSpan: Number
        },
        colors: [String],
        showLegend: Boolean,
        showLabels: Boolean,
        showGrid: Boolean,
        showTooltip: Boolean,
        theme: {
          type: String,
          enum: ['light', 'dark', 'custom'],
          default: 'light'
        },
        customCSS: String
      },
      interactivity: {
        drillDown: Boolean,
        filters: Boolean,
        sorting: Boolean,
        highlighting: Boolean,
        clickAction: {
          type: {
            type: String,
            enum: ['filter', 'navigate', 'drillDown', 'custom']
          },
          target: String,
          config: Schema.Types.Mixed
        }
      },
      options: Schema.Types.Mixed
    }],
    sections: [{
      id: {
        type: String,
        required: true
      },
      title: {
        type: String,
        required: true,
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      order: {
        type: Number,
        required: true
      },
      visualizations: {
        type: [String],
        required: true
      },
      parameters: [String],
      collapsible: Boolean,
      defaultCollapsed: Boolean,
      conditionalDisplay: {
        parameter: String,
        value: Schema.Types.Mixed,
        operator: {
          type: String,
          enum: ['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan']
        }
      }
    }],
    
    // Layout
    layout: {
      type: {
        type: String,
        enum: ['fixed', 'responsive', 'grid'],
        default: 'responsive'
      },
      config: Schema.Types.Mixed
    },
    
    // Scheduling
    schedule: {
      enabled: {
        type: Boolean,
        default: false
      },
      frequency: {
        type: String,
        enum: Object.values(ReportScheduleFrequency)
      },
      time: String,
      dayOfWeek: {
        type: Number,
        min: 0,
        max: 6
      },
      dayOfMonth: {
        type: Number,
        min: 1,
        max: 31
      },
      month: {
        type: Number,
        min: 1,
        max: 12
      },
      customCron: String,
      timezone: String,
      startDate: Date,
      endDate: Date,
      recipients: [{
        type: {
          type: String,
          enum: ['email', 'user', 'group', 'webhook'],
          required: true
        },
        value: {
          type: String,
          required: true
        }
      }],
      exportFormat: {
        type: String,
        enum: Object.values(ReportExportFormat),
        required: true
      },
      includeParameters: {
        type: Boolean,
        default: true
      },
      subject: String,
      message: String,
      lastRun: Date,
      nextRun: Date
    },
    
    // Export options
    exportOptions: {
      formats: {
        type: [{
          type: String,
          enum: Object.values(ReportExportFormat)
        }],
        default: [ReportExportFormat.PDF]
      },
      headerTemplate: String,
      footerTemplate: String,
      paperSize: {
        type: String,
        enum: ['A4', 'Letter', 'Legal', 'Tabloid'],
        default: 'A4'
      },
      orientation: {
        type: String,
        enum: ['portrait', 'landscape'],
        default: 'portrait'
      },
      margins: {
        top: Number,
        right: Number,
        bottom: Number,
        left: Number
      }
    },
    
    // Access control
    isPublic: {
      type: Boolean,
      default: false,
      index: true
    },
    accessRoles: [{
      type: String,
      index: true
    }],
    
    // Metadata
    tags: [{
      type: String,
      index: true
    }],
    version: {
      type: Number,
      default: 1
    },
    
    // Usage tracking
    usageCount: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date
    },
    
    // Audit fields
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required']
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for common query patterns
reportTemplateSchema.index({ type: 1, status: 1 });
reportTemplateSchema.index({ 'schedule.enabled': 1, 'schedule.nextRun': 1 });
reportTemplateSchema.index({ tags: 1, status: 1 });

// Validate visualization references in sections
reportTemplateSchema.pre('validate', function(next) {
  if (!this.visualizations || !this.sections) {
    return next();
  }
  
  const visualizationIds = this.visualizations.map(v => v.id);
  
  for (const section of this.sections) {
    for (const vizId of section.visualizations) {
      if (!visualizationIds.includes(vizId)) {
        const error = new Error(`Section "${section.title}" references non-existent visualization ID: ${vizId}`);
        return next(error);
      }
    }
  }
  
  next();
});

// Validate data source references in visualizations
reportTemplateSchema.pre('validate', function(next) {
  if (!this.dataSources || !this.visualizations) {
    return next();
  }
  
  const dataSourceNames = this.dataSources.map(ds => ds.name);
  
  for (const viz of this.visualizations) {
    if (!dataSourceNames.includes(viz.dataSource)) {
      const error = new Error(`Visualization "${viz.name}" references non-existent data source: ${viz.dataSource}`);
      return next(error);
    }
  }
  
  next();
});

// Validate parameter references in data sources
reportTemplateSchema.pre('validate', function(next) {
  if (!this.parameters || !this.dataSources) {
    return next();
  }
  
  const parameterNames = this.parameters.map(p => p.name);
  
  for (const ds of this.dataSources) {
    if (ds.parameters) {
      for (const paramName of ds.parameters) {
        if (!parameterNames.includes(paramName)) {
          const error = new Error(`Data source "${ds.name}" references non-existent parameter: ${paramName}`);
          return next(error);
        }
      }
    }
  }
  
  next();
});

// Increment version on update if content changes
reportTemplateSchema.pre('save', function(next) {
  if (!this.isNew && (
    this.isModified('parameters') || 
    this.isModified('dataSources') || 
    this.isModified('visualizations') || 
    this.isModified('sections') ||
    this.isModified('layout')
  )) {
    this.version += 1;
  }
  next();
});

/**
 * Activate report template
 */
reportTemplateSchema.methods.activate = async function(): Promise<IReportTemplate> {
  this.status = ReportTemplateStatus.ACTIVE;
  return this.save();
};

/**
 * Deactivate report template
 */
reportTemplateSchema.methods.deactivate = async function(): Promise<IReportTemplate> {
  this.status = ReportTemplateStatus.INACTIVE;
  return this.save();
};

/**
 * Archive report template
 */
reportTemplateSchema.methods.archive = async function(): Promise<IReportTemplate> {
  this.status = ReportTemplateStatus.ARCHIVED;
  return this.save();
};

/**
 * Duplicate report template
 */
reportTemplateSchema.methods.duplicate = async function(): Promise<IReportTemplate> {
  const ReportTemplateModel = this.constructor as typeof ReportTemplate;
  
  // Create a new template based on this one
  const duplicateData = this.toObject();
  
  // Remove fields that should be unique or reset
  delete duplicateData._id;
  delete duplicateData.id;
  duplicateData.name = `${duplicateData.name} (Copy)`;
  duplicateData.code = `${duplicateData.code}_COPY_${Date.now()}`;
  duplicateData.status = ReportTemplateStatus.DRAFT;
  duplicateData.version = 1;
  duplicateData.usageCount = 0;
  duplicateData.lastUsed = undefined;
  
  // Create and return the new template
  return ReportTemplateModel.create(duplicateData);
};

/**
 * Increment usage count
 */
reportTemplateSchema.methods.incrementUsage = async function(): Promise<IReportTemplate> {
  this.usageCount += 1;
  this.lastUsed = new Date();
  return this.save();
};

/**
 * Add parameter
 */
reportTemplateSchema.methods.addParameter = async function(
  parameter: IReportParameter
): Promise<IReportTemplate> {
  if (!parameter.name || !parameter.label || !parameter.type) {
    throw new Error('Parameter name, label, and type are required');
  }
  
  if (!this.parameters) {
    this.parameters = [];
  }
  
  // Check if parameter with same name already exists
  const existingIndex = this.parameters.findIndex(p => p.name === parameter.name);
  
  if (existingIndex >= 0) {
    // Update existing parameter
    this.parameters[existingIndex] = {
      ...this.parameters[existingIndex],
      ...parameter
    };
  } else {
    // Add new parameter
    this.parameters.push(parameter);
  }
  
  return this.save();
};

/**
 * Add data source
 */
reportTemplateSchema.methods.addDataSource = async function(
  dataSource: IReportDataSource
): Promise<IReportTemplate> {
  if (!dataSource.name || !dataSource.type) {
    throw new Error('Data source name and type are required');
  }
  
  if (!this.dataSources) {
    this.dataSources = [];
  }
  
  // Check if data source with same name already exists
  const existingIndex = this.dataSources.findIndex(ds => ds.name === dataSource.name);
  
  if (existingIndex >= 0) {
    // Update existing data source
    this.dataSources[existingIndex] = {
      ...this.dataSources[existingIndex],
      ...dataSource
    };
  } else {
    // Add new data source
    this.dataSources.push(dataSource);
  }
  
  return this.save();
};

/**
 * Add visualization
 */
reportTemplateSchema.methods.addVisualization = async function(
  visualization: IReportVisualization
): Promise<IReportTemplate> {
  if (!visualization.id || !visualization.name || !visualization.type || !visualization.dataSource) {
    throw new Error('Visualization ID, name, type, and data source are required');
  }
  
  if (!this.visualizations) {
    this.visualizations = [];
  }
  
  // Check if visualization with same ID already exists
  const existingIndex = this.visualizations.findIndex(v => v.id === visualization.id);
  
  if (existingIndex >= 0) {
    // Update existing visualization
    this.visualizations[existingIndex] = {
      ...this.visualizations[existingIndex],
      ...visualization
    };
  } else {
    // Add new visualization
    this.visualizations.push(visualization);
  }
  
  return this.save();
};

/**
 * Add section
 */
reportTemplateSchema.methods.addSection = async function(
  section: IReportSection
): Promise<IReportTemplate> {
  if (!section.id || !section.title || section.order === undefined || !section.visualizations) {
    throw new Error('Section ID, title, order, and visualizations are required');
  }
  
  if (!this.sections) {
    this.sections = [];
  }
  
  // Check if section with same ID already exists
  const existingIndex = this.sections.findIndex(s => s.id === section.id);
  
  if (existingIndex >= 0) {
    // Update existing section
    this.sections[existingIndex] = {
      ...this.sections[existingIndex],
      ...section
    };
  } else {
    // Add new section
    this.sections.push(section);
  }
  
  // Sort sections by order
  this.sections.sort((a, b) => a.order - b.order);
  
  return this.save();
};

/**
 * Find report templates by type
 */
reportTemplateSchema.statics.findByType = async function(
  type: ReportTemplateType,
  activeOnly: boolean = true
): Promise<IReportTemplate[]> {
  const query: any = { type };
  
  if (activeOnly) {
    query.status = ReportTemplateStatus.ACTIVE;
  }
  
  return this.find(query).sort({ name: 1 });
};

/**
 * Find report templates by tags
 */
reportTemplateSchema.statics.findByTags = async function(
  tags: string[],
  activeOnly: boolean = true
): Promise<IReportTemplate[]> {
  const query: any = { tags: { $in: tags } };
  
  if (activeOnly) {
    query.status = ReportTemplateStatus.ACTIVE;
  }
  
  return this.find(query).sort({ name: 1 });
};

/**
 * Find report templates by access roles
 */
reportTemplateSchema.statics.findByAccessRoles = async function(
  roles: string[],
  activeOnly: boolean = true
): Promise<IReportTemplate[]> {
  const query: any = {
    $or: [
      { isPublic: true },
      { accessRoles: { $in: roles } }
    ]
  };
  
  if (activeOnly) {
    query.status = ReportTemplateStatus.ACTIVE;
  }
  
  return this.find(query).sort({ name: 1 });
};

/**
 * Find scheduled report templates
 */
reportTemplateSchema.statics.findScheduled = async function(): Promise<IReportTemplate[]> {
  return this.find({
    status: ReportTemplateStatus.ACTIVE,
    'schedule.enabled': true,
    'schedule.nextRun': { $lte: new Date() }
  }).sort({ 'schedule.nextRun': 1 });
};

/**
 * Find most used report templates
 */
reportTemplateSchema.statics.findMostUsed = async function(
  limit: number = 10
): Promise<IReportTemplate[]> {
  return this.find({
    status: ReportTemplateStatus.ACTIVE
  })
    .sort({ usageCount: -1 })
    .limit(limit);
};

/**
 * Find recently used report templates
 */
reportTemplateSchema.statics.findRecentlyUsed = async function(
  limit: number = 10
): Promise<IReportTemplate[]> {
  return this.find({
    status: ReportTemplateStatus.ACTIVE,
    lastUsed: { $exists: true }
  })
    .sort({ lastUsed: -1 })
    .limit(limit);
};

// Export the model
export const ReportTemplate = model<IReportTemplate>('ReportTemplate', reportTemplateSchema); 