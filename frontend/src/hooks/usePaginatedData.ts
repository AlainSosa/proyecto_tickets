import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { PaginatedResponse } from '../types';

interface UsePaginatedDataOptions {
  endpoint: string;
  page?: number;
  limit?: number;
  filters?: Record<string, string>;
}

export function usePaginatedData<T>({ endpoint, page: initialPage = 1, limit = 10, filters = {} }: UsePaginatedDataOptions) {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filtersKey = JSON.stringify(filters);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), ...filters });
      const response = await api.get<PaginatedResponse<T>>(`${endpoint}?${params}`);
      setData(response.data.data);
      setTotalPages(response.data.meta.totalPages);
      setTotal(response.data.meta.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error fetching data');
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, page, limit, filtersKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = () => fetchData();

  return { data, page, totalPages, total, isLoading, error, setPage, refetch };
}
