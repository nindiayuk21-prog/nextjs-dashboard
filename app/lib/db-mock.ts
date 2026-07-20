import fs from 'fs';
import path from 'path';
import { invoices as originalInvoices, customers as originalCustomers } from './placeholder-data';

const FILE_PATH = path.join(process.cwd(), 'app/lib/db-mock.json');
const CUSTOMERS_FILE_PATH = path.join(process.cwd(), 'app/lib/db-customers-mock.json');

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

export function getInvoices(): InvoiceMock[] {
  if (!fs.existsSync(FILE_PATH)) {
    // Initialize with static IDs
    const initial: InvoiceMock[] = originalInvoices.map((inv, index) => ({
      id: (index + 1).toString(),
      customer_id: inv.customer_id,
      amount: inv.amount,
      status: inv.status as 'pending' | 'paid',
      date: inv.date,
    }));
    try {
      fs.writeFileSync(FILE_PATH, JSON.stringify(initial, null, 2));
    } catch (e) {
      console.error('Error writing initial mock DB file', e);
    }
    return initial;
  }
  try {
    const fileContent = fs.readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (e) {
    console.error('Error reading mock DB file, returning empty array', e);
    return [];
  }
}

export function saveInvoices(invoices: InvoiceMock[]) {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(invoices, null, 2));
  } catch (e) {
    console.error('Error writing to mock DB file', e);
  }
}

export function getCustomers(): CustomerMock[] {
  if (!fs.existsSync(CUSTOMERS_FILE_PATH)) {
    try {
      fs.writeFileSync(CUSTOMERS_FILE_PATH, JSON.stringify(originalCustomers, null, 2));
    } catch (e) {
      console.error('Error writing initial customers mock DB file', e);
    }
    return originalCustomers;
  }
  try {
    const fileContent = fs.readFileSync(CUSTOMERS_FILE_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (e) {
    console.error('Error reading customers mock DB file, returning empty array', e);
    return [];
  }
}

export function saveCustomers(customers: CustomerMock[]) {
  try {
    fs.writeFileSync(CUSTOMERS_FILE_PATH, JSON.stringify(customers, null, 2));
  } catch (e) {
    console.error('Error writing to customers mock DB file', e);
  }
}

