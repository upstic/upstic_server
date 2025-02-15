import { Schema } from 'mongoose';

export type SearchEntityType = 
  | 'job'
  | 'worker'
  | 'company'
  | 'application'
  | 'shift'
  | 'message'
  | 'document';

export type SearchSortOrder = 'asc' | 'desc';

export type SearchFilterOperator = 
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'nin'
  | 'exists'
  | 'regex';

export interface SearchQuery {
  keyword?: string;
  entityType: SearchEntityType;
  filters?: SearchFilter[];
  sort?: SearchSort[];
  page?: number;
  limit?: number;
  fields?: string[];
  highlight?: boolean;
  fuzzy?: boolean;
  aggregations?: SearchAggregation[];
}

export interface SearchFilter {
  field: string;
  operator: SearchFilterOperator;
  value: any;
  condition?: 'and' | 'or';
}

export interface SearchSort {
  field: string;
  order: SearchSortOrder;
}

export interface SearchAggregation {
  name: string;
  type: 'terms' | 'range' | 'date_histogram' | 'stats';
  field: string;
  options?: {
    size?: number;
    ranges?: Array<{
      from?: number;
      to?: number;
    }>;
    interval?: string;
  };
}

export interface SearchResult<T> {
  total: number;
  hits: Array<{
    id: string;
    score: number;
    source: T;
    highlights?: Record<string, string[]>;
  }>;
  aggregations?: Record<string, any>;
  page: number;
  totalPages: number;
  took: number;
}

export interface SearchSuggestion {
  text: string;
  score: number;
  frequency: number;
  type: string;
  metadata?: Record<string, any>;
}

export interface SearchFacet {
  field: string;
  values: Array<{
    value: string | number;
    count: number;
    selected?: boolean;
  }>;
}

export interface SearchStats {
  totalQueries: number;
  averageResponseTime: number;
  popularTerms: Array<{
    term: string;
    count: number;
  }>;
  failedQueries: Array<{
    query: string;
    error: string;
    timestamp: Date;
  }>;
  performance: {
    cache: {
      hits: number;
      misses: number;
      ratio: number;
    };
    latency: {
      p50: number;
      p90: number;
      p99: number;
    };
  };
}

export interface SearchHistory {
  userId: Schema.Types.ObjectId;
  query: string;
  filters?: SearchFilter[];
  entityType: SearchEntityType;
  timestamp: Date;
  results: number;
  took: number;
}

export interface SearchIndexConfig {
  name: string;
  settings: {
    numberOfShards: number;
    numberOfReplicas: number;
    refreshInterval: string;
    analysis?: {
      analyzer?: Record<string, any>;
      filter?: Record<string, any>;
    };
  };
  mappings: {
    properties: Record<string, {
      type: string;
      analyzer?: string;
      fields?: Record<string, any>;
      [key: string]: any;
    }>;
  };
}

export interface SearchSynonyms {
  groups: Array<{
    name: string;
    terms: string[];
    type: 'equivalent' | 'explicit';
  }>;
  rules: Array<{
    pattern: string;
    replacement: string;
    flags?: string;
  }>;
} 