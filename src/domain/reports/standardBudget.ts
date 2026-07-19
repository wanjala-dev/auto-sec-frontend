export const normalizeStandardBudgetRow = (row: any) => {
  if (!row) return null;
  const category = row.category || {};
  const categoryId = category?.id ?? row.category_id ?? row.categoryId ?? null;
  const categoryName =
    (typeof category === 'string' ? category : category?.name) ??
    row.category_name ??
    row.category ??
    '';

  const amountValue =
    typeof row.amount === 'number'
      ? row.amount
      : parseFloat(row.amount || 0) || 0;

  const actualAmountRaw = row.actual_amount ?? row.actualAmount ?? 0;
  const actualAmount =
    typeof actualAmountRaw === 'number'
      ? actualAmountRaw
      : parseFloat(actualAmountRaw || 0) || 0;

  const positionValue =
    typeof row.position === 'number'
      ? row.position
      : parseInt(row.position ?? 0, 10) || 0;

  const isBigExpenseRaw =
    row?.is_big_expense ??
    row?.isBigExpense ??
    row?.big_expense ??
    row?.bigExpense ??
    false;

  return {
    id: row.id ?? null,
    budgetId: row.budget_id ?? row.budgetId ?? null,
    categoryId:
      categoryId === undefined || categoryId === null ? null : categoryId,
    category: categoryName || 'Uncategorised',
    name: row.name ?? row.label ?? categoryName ?? '',
    notes: row.notes ?? '',
    amount: amountValue,
    actualAmount,
    position: positionValue,
    updatedAt: row.updated_at ?? row.updatedAt ?? null,
    isBigExpense: Boolean(isBigExpenseRaw)
  };
};

export const normalizeStandardBudgetRows = (payload: any) => {
  const rows = Array.isArray(payload?.results) ? payload.results : [];
  return rows.map((row) => normalizeStandardBudgetRow(row)).filter(Boolean);
};

export const normalizeBudgetDetail = (payload: any) =>
  payload?.data !== undefined ? payload.data : payload;

export const normalizeBudgetStatusRecord = (payload: any) =>
  payload?.data !== undefined ? payload.data : payload;

export const normalizeChildBudgetSummary = (payload: any) => {
  const rawList = Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload)
    ? payload
    : [];

  const normalizedList = rawList
    .map((item, index) => {
      const beneficiaryId =
        item?.beneficiary_id ??
        item?.beneficiaryId ??
        item?.child_id ??
        item?.childId ??
        null;

      if (beneficiaryId === null || beneficiaryId === undefined) {
        return null;
      }

      // estimate_id points at the editable BudgetEstimate row for this
      // (budget, recipient) pair. Surface as `estimateId` so the recipient
      // detail can PATCH /budget/estimate/<id>/ for inline editing of the
      // Planned spend number. Null on legacy rows whose estimate was
      // deleted; treat null as "no inline edit target".
      const estimateId = item?.estimate_id ?? item?.estimateId ?? null;

      return {
        beneficiaryId,
        estimateId,
        planned: Number(item?.planned) || 0,
        actual: Number(item?.actual) || 0,
        remaining:
          item?.remaining !== undefined && item?.remaining !== null
            ? Number(item.remaining) || 0
            : undefined,
        raw: item,
        index
      };
    })
    .filter(Boolean);

  const byId = normalizedList.reduce((acc: Record<string, any>, entry: any) => {
    acc[String(entry.beneficiaryId)] = entry;
    return acc;
  }, {});

  return {
    list: normalizedList,
    byId
  };
};
