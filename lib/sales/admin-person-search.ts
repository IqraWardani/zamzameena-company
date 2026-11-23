export const ADMIN_SALES_PERSON_SEARCH_MIN_LENGTH = 2;
export const ADMIN_SALES_PERSON_SEARCH_LIMIT = 10;

export type AdminSalesPersonSearchResult = {
  id: string;
  fullName: string;
  memberCode: string;
};

export function normalizeAdminSalesPersonSearch(value: string | null): string {
  return value?.trim().slice(0, 80) ?? "";
}

export function formatAdminSalesPersonSearchResults(
  people: AdminSalesPersonSearchResult[],
): AdminSalesPersonSearchResult[] {
  return people.slice(0, ADMIN_SALES_PERSON_SEARCH_LIMIT).map(({ id, fullName, memberCode }) => ({
    id,
    fullName,
    memberCode,
  }));
}
