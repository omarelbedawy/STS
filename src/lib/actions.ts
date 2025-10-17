'use server';

import { z } from 'zod';
import {
  ForgotPasswordSchema,
  LoginSchema,
  ProfileSchema,
  SignupSchema,
} from './schemas';

type FormState = {
  success: boolean;
  message: string;
};

// Simulate a database operation
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function signup(
  values: z.infer<typeof SignupSchema>
): Promise<FormState> {
  await sleep(1000);

  const validation = SignupSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: 'Invalid form data.' };
  }

  console.log('New user signed up:', validation.data.email);

  return {
    success: true,
    message: 'Account created successfully! You can now log in.',
  };
}

export async function login(
  values: z.infer<typeof LoginSchema>
): Promise<FormState> {
  await sleep(1000);

  const validation = LoginSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: 'Invalid form data.' };
  }

  // In a real app, you would verify credentials against a database.
  if (validation.data.password === 'password123') {
    return { success: true, message: 'Logged in successfully!' };
  }

  return { success: false, message: 'Invalid email or password.' };
}

export async function forgotPassword(
  values: z.infer<typeof ForgotPasswordSchema>
): Promise<FormState> {
  await sleep(1000);

  const validation = ForgotPasswordSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: 'Invalid form data.' };
  }

  console.log('Password reset requested for:', validation.data.email);

  return {
    success: true,
    message: 'If an account with that email exists, a reset link has been sent.',
  };
}

export async function updateProfile(
  values: z.infer<typeof ProfileSchema>
): Promise<FormState> {
  await sleep(1000);

  const validation = ProfileSchema.safeParse(values);
  if (!validation.success) {
    return { success: false, message: 'Invalid form data.' };
  }

  console.log('Profile updated for:', validation.data.email);
  
  return {
    success: true,
    message: 'Your profile has been updated successfully.',
  };
}
