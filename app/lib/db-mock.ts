import { invoices as originalInvoices, customers as originalCustomers } from './placeholder-data';

export interface InvoiceMock {
  id: string;
  customer_id: string;
  amount: number;
  status: 'pending' | 'paid';
  date: string;
}

export interface CustomerMock {
  id: string;
  name: string;
  email: string;
  image_url: string;
}

// --- In-Memory Store ---
// On Vercel (serverless, read-only filesystem), we use in-memory arrays.
// Locally, we also use in-memory but try to persist to JSON files via fs (lazy-loaded).
// This approach avoids top-level fs imports that crash Vercel builds.

let invoicesStore: InvoiceMock[] | null = null;
let customersStore: CustomerMock[] | null = null;

function getInitialInvoices(): InvoiceMock[] {
  return originalInvoices.map((inv, index) => ({
    id: (index + 1).toString(),
    customer_id: inv.customer_id,
    amount: inv.amount,
    status: inv.status as 'pending' | 'paid',
    date: inv.date,
  }));
}

function getInitialCustomers(): CustomerMock[] {
  return originalCustomers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    image_url: c.image_url,
  }));
}

// Detect if we can use the filesystem (local dev) or not (Vercel serverless)
function canUseFs(): boolean {
  // VERCEL env var is set on Vercel deployments
  if (process.env.VERCEL) return false;
  return true;
}

// Lazy-load fs module only when needed and only in local dev
function tryReadFile(filePath: string): string | null {
  if (!canUseFs()) return null;
  try {
    const fs = require('fs');
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch {
    // Silently fail — fs not available or file not found
  }
  return null;
}

function tryWriteFile(filePath: string, data: string): void {
  if (!canUseFs()) return;
  try {
    const fs = require('fs');
    const path = require('path');
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, data);
  } catch {
    // Silently fail — read-only filesystem
  }
}

function getFilePath(filename: string): string {
  try {
    const path = require('path');
    return path.join(process.cwd(), 'app/lib', filename);
  } catch {
    return filename;
  }
}

// --- Public API ---

export function getInvoices(): InvoiceMock[] {
  if (invoicesStore !== null) return invoicesStore;

  // Try loading from file first (local dev)
  const filePath = getFilePath('db-mock.json');
  const fileContent = tryReadFile(filePath);
  if (fileContent) {
    try {
      invoicesStore = JSON.parse(fileContent);
      return invoicesStore!;
    } catch {
      // Fall through to defaults
    }
  }

  // Initialize with placeholder data
  invoicesStore = getInitialInvoices();
  tryWriteFile(filePath, JSON.stringify(invoicesStore, null, 2));
  return invoicesStore;
}

export function saveInvoices(invoices: InvoiceMock[]) {
  invoicesStore = invoices;
  const filePath = getFilePath('db-mock.json');
  tryWriteFile(filePath, JSON.stringify(invoices, null, 2));
}

export function getCustomers(): CustomerMock[] {
  if (customersStore !== null) return customersStore;

  // Try loading from file first (local dev)
  const filePath = getFilePath('db-customers-mock.json');
  const fileContent = tryReadFile(filePath);
  if (fileContent) {
    try {
      customersStore = JSON.parse(fileContent);
      return customersStore!;
    } catch {
      // Fall through to defaults
    }
  }

  // Initialize with placeholder data
  customersStore = getInitialCustomers();
  tryWriteFile(filePath, JSON.stringify(customersStore, null, 2));
  return customersStore;
}

export function saveCustomers(customers: CustomerMock[]) {
  customersStore = customers;
  const filePath = getFilePath('db-customers-mock.json');
  tryWriteFile(filePath, JSON.stringify(customers, null, 2));
}
