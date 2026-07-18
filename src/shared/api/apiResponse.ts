export interface ApiResponse<T> {
  code: number;
  message?: string | null;
  traceId?: string | null;
  result?: T | null;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  pageable?: unknown;
  sort?: unknown;
}
