'use server';

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getInvoices, saveInvoices, getCustomers, saveCustomers } from './db-mock';

const sql = process.env.POSTGRES_URL
  ? postgres(process.env.POSTGRES_URL, { ssl: 'require' })
  : null;

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoice(prevState: State, formData: FormData) {
  // Validate fields using Zod
  const validatedFields = CreateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // If validation fails, return errors
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];

  if (!sql) {
    console.warn('Database not configured. Saving invoice to persistent JSON file.');
    const invoices = getInvoices();
    invoices.unshift({
      id: Date.now().toString(),
      customer_id: customerId,
      amount: amountInCents,
      status: status as 'pending' | 'paid',
      date,
    });
    saveInvoices(invoices);
  } else {
    try {
      await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      `;
    } catch (error) {
      console.error('Database Error:', error);
      return {
        message: 'Database Error: Failed to Create Invoice.',
      };
    }
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function updateInvoice(id: string, prevState: State, formData: FormData) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }

  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;

  if (!sql) {
    console.warn('Database not configured. Updating invoice in persistent JSON file.');
    const invoices = getInvoices();
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index !== -1) {
      invoices[index] = {
        ...invoices[index],
        customer_id: customerId,
        amount: amountInCents,
        status: status as 'pending' | 'paid',
      };
      saveInvoices(invoices);
    }
  } else {
    try {
      await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
      `;
    } catch (error) {
      console.error('Database Error:', error);
      return { message: 'Database Error: Failed to Update Invoice.' };
    }
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  if (!sql) {
    console.warn('Database not configured. Deleting invoice from persistent JSON file.');
    const invoices = getInvoices();
    const filtered = invoices.filter((inv) => inv.id !== id);
    saveInvoices(filtered);
  } else {
    try {
      await sql`DELETE FROM invoices WHERE id = ${id}`;
    } catch (error) {
      console.error('Database Error:', error);
      throw new Error('Database Error: Failed to Delete Invoice.');
    }
  }
  revalidatePath('/dashboard/invoices');
}

const CustomerFormSchema = z.object({
  id: z.string(),
  name: z.string().min(1, { message: 'Please enter a name.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  imageUrl: z.string().optional(),
});

const CreateCustomer = CustomerFormSchema.omit({ id: true });
const UpdateCustomer = CustomerFormSchema.omit({ id: true });

export type CustomerState = {
  errors?: {
    name?: string[];
    email?: string[];
    imageUrl?: string[];
  };
  message?: string | null;
};

export async function createCustomer(prevState: CustomerState, formData: FormData) {
  const validatedFields = CreateCustomer.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    imageUrl: formData.get('imageUrl') || '/customers/evil-rabbit.png',
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Customer.',
    };
  }

  const { name, email, imageUrl } = validatedFields.data;

  if (!sql) {
    console.warn('Database not configured. Saving customer to persistent JSON file.');
    const customers = getCustomers();
    customers.unshift({
      id: Date.now().toString(),
      name,
      email,
      image_url: imageUrl || '/customers/evil-rabbit.png',
    });
    saveCustomers(customers);
  } else {
    try {
      await sql`
        INSERT INTO customers (name, email, image_url)
        VALUES (${name}, ${email}, ${imageUrl || '/customers/evil-rabbit.png'})
      `;
    } catch (error) {
      console.error('Database Error:', error);
      return {
        message: 'Database Error: Failed to Create Customer.',
      };
    }
  }

  revalidatePath('/dashboard/customers');
  redirect('/dashboard/customers');
}

export async function updateCustomer(id: string, prevState: CustomerState, formData: FormData) {
  const validatedFields = UpdateCustomer.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    imageUrl: formData.get('imageUrl') || '/customers/evil-rabbit.png',
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Customer.',
    };
  }

  const { name, email, imageUrl } = validatedFields.data;

  if (!sql) {
    console.warn('Database not configured. Updating customer in persistent JSON file.');
    const customers = getCustomers();
    const index = customers.findIndex((c) => c.id === id);
    if (index !== -1) {
      customers[index] = {
        ...customers[index],
        name,
        email,
        image_url: imageUrl || customers[index].image_url,
      };
      saveCustomers(customers);
    }
  } else {
    try {
      await sql`
        UPDATE customers
        SET name = ${name}, email = ${email}, image_url = ${imageUrl || '/customers/evil-rabbit.png'}
        WHERE id = ${id}
      `;
    } catch (error) {
      console.error('Database Error:', error);
      return { message: 'Database Error: Failed to Update Customer.' };
    }
  }

  revalidatePath('/dashboard/customers');
  redirect('/dashboard/customers');
}

export async function deleteCustomer(id: string) {
  if (!sql) {
    console.warn('Database not configured. Deleting customer from persistent JSON file.');
    const customers = getCustomers();
    const filtered = customers.filter((c) => c.id !== id);
    saveCustomers(filtered);
    
    // Also delete any invoices belonging to this customer to maintain integrity
    const invoices = getInvoices();
    const filteredInvoices = invoices.filter((inv) => inv.customer_id !== id);
    saveInvoices(filteredInvoices);
  } else {
    try {
      await sql`DELETE FROM customers WHERE id = ${id}`;
    } catch (error) {
      console.error('Database Error:', error);
      throw new Error('Database Error: Failed to Delete Customer.');
    }
  }
  revalidatePath('/dashboard/customers');
  revalidatePath('/dashboard/invoices');
}