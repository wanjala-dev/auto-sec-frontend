// Shared config for every import type the app supports. Used by both
// the pre-apply preview (TransactionImportFlow) and the post-Celery
// review modal (BackgroundJobReviewModal). Adding a new import type
// means one entry here — the same table UI renders for all of them.

export const parsedOf = (row) => row?.parsed_data || row?.raw_data || {};

export const readParsed = (row, ...keys) => {
  const data = parsedOf(row);
  for (const k of keys) {
    const v = data?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return typeof v === 'string' ? v : String(v);
    }
  }
  return '';
};

export const IMPORT_TYPE_CONFIG = {
  expense: {
    singular: 'expense',
    plural: 'expenses',
    editable: true,
    previewColumns: [
      { key: 'label', header: 'Description', field: 'label', editType: 'text' },
      {
        key: 'amount',
        header: 'Amount',
        field: 'amount',
        editType: 'number',
        width: 'w-24'
      },
      {
        key: 'category',
        header: 'Category',
        field: 'category_name',
        editType: 'text'
      },
      {
        key: 'date',
        header: 'Date',
        field: 'date',
        editType: 'date',
        width: 'w-32'
      }
    ]
  },
  income: {
    singular: 'income',
    plural: 'income entries',
    editable: true,
    previewColumns: [
      { key: 'label', header: 'Description', field: 'label', editType: 'text' },
      {
        key: 'amount',
        header: 'Amount',
        field: 'amount',
        editType: 'number',
        width: 'w-24'
      },
      {
        key: 'category',
        header: 'Source',
        field: 'category_name',
        editType: 'text'
      },
      {
        key: 'date',
        header: 'Date',
        field: 'date',
        editType: 'date',
        width: 'w-32'
      }
    ]
  },
  budget: {
    singular: 'budget line',
    plural: 'budget lines',
    editable: true,
    previewColumns: [
      { key: 'label', header: 'Description', field: 'label', editType: 'text' },
      {
        key: 'amount',
        header: 'Amount',
        field: 'amount',
        editType: 'number',
        width: 'w-24'
      },
      {
        key: 'category',
        header: 'Category',
        field: 'category_name',
        editType: 'text'
      }
    ]
  },
  recipient: {
    singular: 'recipient',
    plural: 'recipients',
    editable: false,
    previewColumns: [
      {
        key: 'name',
        header: 'Name',
        readOnly: true,
        read: (row) => {
          const parts = ['first_name', 'middle_name', 'last_name']
            .map((k) => readParsed(row, k))
            .filter(Boolean);
          return parts.length
            ? parts.join(' ')
            : readParsed(row, 'name', 'full_name') || row?.label || '—';
        }
      },
      {
        key: 'age',
        header: 'Age',
        readOnly: true,
        read: (r) => readParsed(r, 'age') || '—'
      },
      {
        key: 'gender',
        header: 'Gender',
        readOnly: true,
        read: (r) => readParsed(r, 'gender') || '—'
      },
      {
        key: 'location',
        header: 'Location',
        readOnly: true,
        read: (r) => readParsed(r, 'location') || '—'
      },
      {
        key: 'photo',
        header: 'Photo',
        readOnly: true,
        read: (r) => (readParsed(r, 'photo_url') ? 'Link' : '—')
      }
    ]
  },
  donation: {
    singular: 'donation',
    plural: 'donations',
    editable: true,
    previewColumns: [
      { key: 'donor', header: 'Donor', field: 'label', editType: 'text' },
      {
        key: 'amount',
        header: 'Amount',
        field: 'amount',
        editType: 'number',
        width: 'w-24'
      },
      {
        key: 'date',
        header: 'Date',
        field: 'date',
        editType: 'date',
        width: 'w-32'
      }
    ]
  },
  contact: {
    singular: 'contact',
    plural: 'contacts',
    editable: false,
    previewColumns: [
      {
        key: 'name',
        header: 'Name',
        readOnly: true,
        read: (row) => {
          const parts = ['first_name', 'last_name']
            .map((k) => readParsed(row, k))
            .filter(Boolean);
          return parts.length
            ? parts.join(' ')
            : readParsed(row, 'name', 'full_name') || row?.label || '—';
        }
      },
      {
        key: 'email',
        header: 'Email',
        readOnly: true,
        read: (r) => readParsed(r, 'email') || '—'
      },
      {
        key: 'phone',
        header: 'Phone',
        readOnly: true,
        read: (r) => readParsed(r, 'phone') || '—'
      },
      {
        key: 'role',
        header: 'Role',
        readOnly: true,
        read: (r) => readParsed(r, 'role') || '—'
      },
      {
        key: 'tags',
        header: 'Tags',
        readOnly: true,
        read: (r) => readParsed(r, 'tags') || '—'
      }
    ]
  }
};

export const resolveImportTypeConfig = (importType) =>
  IMPORT_TYPE_CONFIG[importType] || IMPORT_TYPE_CONFIG.expense;
