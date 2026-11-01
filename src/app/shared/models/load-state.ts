import type { ApiError } from '../../core/errors/api-error';

export type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | ({ status: 'error' } & ApiError);
