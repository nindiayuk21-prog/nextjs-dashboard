import postgres from 'postgres';
import {
  Customer,
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';
import {
  revenue as mockRevenue,
} from './placeholder-data';
import { getInvoices, getCustomers } from './db-mock';

// Initialize postgres only if POSTGRES_URL is provided, otherwise set to null
const sql = process.env.POSTGRES_URL
  ? postgres(process.env.POSTGRES_URL, { ssl: 'require' })
  : null;

// Local mock fallbacks for all data fetching functions
function getMockRevenue(): Revenue[] {
  return mockRevenue;
}

function getMockLatestInvoices(): LatestInvoiceRaw[] {
  const invoices = getInvoices();
  const customers = getCustomers();
  return invoices
    .map((invoice) => {
      const customer = customers.find((c) => c.id === invoice.customer_id);
      return {
        id: invoice.id,
        name: customer?.name || '',
        image_url: customer?.image_url || '',
        email: customer?.email || '',
        amount: invoice.amount,
        date: invoice.date,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
}

function getMockCardData() {
  const invoices = getInvoices();
  const customers = getCustomers();
  const numberOfInvoices = invoices.length;
  const numberOfCustomers = customers.length;
  
  let paidSum = 0;
  let pendingSum = 0;
  invoices.forEach((inv) => {
    if (inv.status === 'paid') {
      paidSum += inv.amount;
    } else {
      pendingSum += inv.amount;
    }
  });

  return {
    numberOfCustomers,
    numberOfInvoices,
    totalPaidInvoices: formatCurrency(paidSum),
    totalPendingInvoices: formatCurrency(pendingSum),
  };
}

const ITEMS_PER_PAGE = 6;

function getMockFilteredInvoices(query: string, currentPage: number): InvoicesTable[] {
  const lowerQuery = query.toLowerCase();
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const invoices = getInvoices();
  const customers = getCustomers();

  const filtered = invoices
    .map((inv) => {
      const customer = customers.find((c) => c.id === inv.customer_id);
      return {
        id: inv.id,
        customer_id: inv.customer_id,
        amount: inv.amount,
        date: inv.date,
        status: inv.status,
        name: customer?.name || '',
        email: customer?.email || '',
        image_url: customer?.image_url || '',
      };
    })
    .filter((inv) => {
      return (
        inv.name.toLowerCase().includes(lowerQuery) ||
        inv.email.toLowerCase().includes(lowerQuery) ||
        inv.amount.toString().includes(lowerQuery) ||
        inv.date.includes(lowerQuery) ||
        inv.status.includes(lowerQuery)
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  return filtered.slice(offset, offset + ITEMS_PER_PAGE);
}

function getMockInvoicesPages(query: string): number {
  const lowerQuery = query.toLowerCase();
  const invoices = getInvoices();
  const customers = getCustomers();
  const filtered = invoices
    .map((inv) => {
      const customer = customers.find((c) => c.id === inv.customer_id);
      return {
        name: customer?.name || '',
        email: customer?.email || '',
        amount: inv.amount,
        date: inv.date,
        status: inv.status,
      };
    })
    .filter((inv) => {
      return (
        inv.name.toLowerCase().includes(lowerQuery) ||
        inv.email.toLowerCase().includes(lowerQuery) ||
        inv.amount.toString().includes(lowerQuery) ||
        inv.date.includes(lowerQuery) ||
        inv.status.includes(lowerQuery)
      );
    });

  return Math.ceil(filtered.length / ITEMS_PER_PAGE);
}

function getMockInvoiceById(id: string): InvoiceForm | undefined {
  const invoices = getInvoices();
  const inv = invoices.find((i) => i.id === id);
  if (!inv) return undefined;
  return {
    id: inv.id,
    customer_id: inv.customer_id,
    amount: inv.amount / 100,
    status: inv.status,
  };
}

function getMockCustomers(): CustomerField[] {
  return getCustomers()
    .map((c) => ({ id: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getMockFilteredCustomers(query: string): CustomersTableType[] {
  const lowerQuery = query.toLowerCase();
  const invoices = getInvoices();
  const customers = getCustomers();
  return customers
    .filter((c) => c.name.toLowerCase().includes(lowerQuery) || c.email.toLowerCase().includes(lowerQuery))
    .map((c) => {
      const customerInvoices = invoices.filter((inv) => inv.customer_id === c.id);
      let total_pending = 0;
      let total_paid = 0;
      customerInvoices.forEach((inv) => {
        if (inv.status === 'pending') {
          total_pending += inv.amount;
        } else if (inv.status === 'paid') {
          total_paid += inv.amount;
        }
      });
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        image_url: c.image_url,
        total_invoices: customerInvoices.length,
        total_pending,
        total_paid,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Exported fetching functions with automatic database-to-mock fallbacks
export async function fetchRevenue() {
  if (!sql) {
    return getMockRevenue();
  }
  try {
    const data = await sql<Revenue[]>`SELECT * FROM revenue`;
    return data;
  } catch (error) {
    console.warn('Database Error, falling back to mock data:', error);
    return getMockRevenue();
  }
}

export async function fetchLatestInvoices() {
  if (!sql) {
    const latestInvoices = getMockLatestInvoices().map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  }
  try {
    const data = await sql<LatestInvoiceRaw[]>`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`;

    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  } catch (error) {
    console.warn('Database Error, falling back to mock data:', error);
    const latestInvoices = getMockLatestInvoices().map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  }
}

export async function fetchCardData() {
  if (!sql) {
    return getMockCardData();
  }
  try {
    const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0][0].count ?? '0');
    const numberOfCustomers = Number(data[1][0].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2][0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2][0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.warn('Database Error, falling back to mock data:', error);
    return getMockCardData();
  }
}

export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  if (!sql) {
    return getMockFilteredInvoices(query, currentPage);
  }
  try {
    const invoices = await sql<InvoicesTable[]>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${(currentPage - 1) * ITEMS_PER_PAGE}
    `;

    return invoices;
  } catch (error) {
    console.warn('Database Error, falling back to mock data:', error);
    return getMockFilteredInvoices(query, currentPage);
  }
}

export async function fetchInvoicesPages(query: string) {
  if (!sql) {
    return getMockInvoicesPages(query);
  }
  try {
    const data = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
  `;

    const totalPages = Math.ceil(Number(data[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.warn('Database Error, falling back to mock data:', error);
    return getMockInvoicesPages(query);
  }
}

export async function fetchInvoiceById(id: string) {
  if (!sql) {
    return getMockInvoiceById(id);
  }
  try {
    const data = await sql<InvoiceForm[]>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;

    const invoice = data.map((invoice) => ({
      ...invoice,
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.warn('Database Error, falling back to mock data:', error);
    return getMockInvoiceById(id);
  }
}

export async function fetchCustomers() {
  if (!sql) {
    return getMockCustomers();
  }
  try {
    const customers = await sql<CustomerField[]>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;

    return customers;
  } catch (err) {
    console.warn('Database Error, falling back to mock data:', err);
    return getMockCustomers();
  }
}

export async function fetchFilteredCustomers(query: string) {
  if (!sql) {
    const customers = getMockFilteredCustomers(query).map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));
    return customers;
  }
  try {
    const data = await sql<CustomersTableType[]>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.warn('Database Error, falling back to mock data:', err);
    const customers = getMockFilteredCustomers(query).map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));
    return customers;
  }
}

export async function fetchCustomerById(id: string) {
  if (!sql) {
    const customers = getCustomers();
    return customers.find((c) => c.id === id);
  }
  try {
    const data = await sql<Customer[]>`
      SELECT
        id,
        name,
        email,
        image_url
      FROM customers
      WHERE id = ${id}
    `;
    return data[0];
  } catch (error) {
    console.warn('Database Error, falling back to mock data:', error);
    const customers = getCustomers();
    return customers.find((c) => c.id === id);
  }
}
