
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase/auth/client";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { schoolList } from "@/lib/schools";
import { useFirestore } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";

const classSubjectSchema = z.object({
  grade: z.enum(["10", "11", "12"]),
  class: z.enum(["a", "b", "c", "d", "e", "f"]),
  subject: z.string().min(1, "Subject is required"),
});

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
  school: z.string().min(1, "Please select your school."),
  classes: z.array(classSubjectSchema).min(1, "You must add at least one class."),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

const subjects = ["Arabic", "EN", "Bio", "CH", "PH", "MATH", "MEC", "CITZ", "ACTV", "ADV", "CAP", "REL", "F", "G", "PE", "CS", "Geo", "SOCIAL"];

export default function TeacherSignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      school: "",
      classes: [{ grade: "11", class: "a", subject: "MATH" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "classes",
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: "Database service is not available. Please try again later.",
      });
      setIsLoading(false);
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: values.name });
      
      const userDocRef = doc(firestore, "users", user.uid);
      await setDoc(userDocRef, {
        name: values.name,
        email: values.email,
        role: 'teacher',
        school: values.school,
        teacherProfile: {
          classes: values.classes,
        },
      });

      await sendEmailVerification(user);
      
      toast({
        title: "Account Created",
        description: "Please check your inbox to verify your email address.",
      });

      router.push("/verify-email");

    } catch (error: any) {
      console.error("Sign up error:", error);
      let description = "An unexpected error occurred. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        description = "This email is already registered. Please use a different email or log in.";
      } else if (error.message) {
        description = error.message;
      }

      toast({ 
        variant: "destructive", 
        title: "Sign Up Failed", 
        description: description 
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create a Teacher Account</CardTitle>
          <CardDescription>Fill in your details to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="name" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Jane Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="email" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="you@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField name="password" control={form.control} render={({ field }) => (
                  <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField name="confirmPassword" control={form.control} render={({ field }) => (
                    <FormItem><FormLabel>Confirm Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField name="school" control={form.control} render={({ field }) => (
                <FormItem><FormLabel>School</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select your school" /></SelectTrigger></FormControl><SelectContent>{schoolList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              
              <div>
                <h3 className="text-lg font-medium mb-2">Classes and Subjects</h3>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr_auto] gap-2 items-center p-3 border rounded-lg">
                      <FormField name={`classes.${index}.grade`} control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Grade</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="10">10</SelectItem><SelectItem value="11">11</SelectItem><SelectItem value="12">12</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <FormField name={`classes.${index}.class`} control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Class</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent>{['a','b','c','d','e','f'].map(c=><SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                       <FormField name={`classes.${index}.subject`} control={form.control} render={({ field }) => (
                        <FormItem><FormLabel>Subject</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger></FormControl><SelectContent>{subjects.map(s=><SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                      )} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="self-end text-destructive"><Trash2 className="size-4" /></Button>
                    </div>
                  ))}
                </div>
                 <Button type="button" variant="outline" size="sm" onClick={() => append({ grade: '11', class: 'a', subject: 'MATH'})} className="mt-2"><PlusCircle className="mr-2"/> Add Class</Button>
                 {form.formState.errors.classes?.message && <p className="text-sm font-medium text-destructive mt-2">{form.formState.errors.classes.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Sign Up</Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">Already have an account? <Link href="/login" className="underline">Log in</Link></div>
        </CardContent>
      </Card>
    </div>
  );
}
