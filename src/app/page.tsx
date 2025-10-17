
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, User, Briefcase, Shield, Users } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 border-b">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <BookOpen className="size-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              STS
            </h1>
            <span className="text-lg text-muted-foreground hidden md:inline">Self Teaching STEMer</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2"
          >
            <Button asChild variant="ghost">
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up <ArrowRight className="ml-2 size-4" /></Link>
            </Button>
          </motion.div>
        </div>
      </header>

      <main className="flex-grow">
        <section className="py-20 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground">
                Teach to Learn, Together.
              </h2>
              <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground">
                STS is a collaborative platform designed for STEM school students. Take ownership of your learning by teaching concepts to your peers, tracking your progress, and mastering your curriculum as a community.
              </p>
              <div className="mt-10 flex justify-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="about" className="py-20 sm:py-24 bg-secondary">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h3 className="text-3xl font-bold">What is STS?</h3>
              <p className="mt-4 max-w-3xl mx-auto text-muted-foreground">
                The Self Teaching STEMer (STS) method is an educational approach where students solidify their understanding of complex topics by preparing and delivering explanations to their classmates. It's founded on the principle that the best way to learn something is to teach it.
              </p>
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="p-8 rounded-lg bg-card border"
              >
                <Users className="mx-auto size-12 text-primary" />
                <h4 className="mt-6 text-xl font-semibold">Collaborate</h4>
                <p className="mt-2 text-muted-foreground">Volunteer to explain topics, invite classmates to co-teach, and learn from presentations by your peers.</p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="p-8 rounded-lg bg-card border"
              >
                <Briefcase className="mx-auto size-12 text-primary" />
                <h4 className="mt-6 text-xl font-semibold">Track Progress</h4>
                <p className="mt-2 text-muted-foreground">Teachers can monitor which topics are being covered and mark sessions as successfully explained, creating a record of the class's collective learning.</p>
              </motion.div>
               <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="p-8 rounded-lg bg-card border"
              >
                <Shield className="mx-auto size-12 text-primary" />
                <h4 className="mt-6 text-xl font-semibold">Organize</h4>
                <p className="mt-2 text-muted-foreground">Admins can oversee multiple schools and classrooms, manage users, and ensure the platform runs smoothly for everyone.</p>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="guides" className="py-20 sm:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
             <div className="text-center mb-12">
              <h3 className="text-3xl font-bold">How to Use STS</h3>
              <p className="mt-4 text-muted-foreground">
                Select your role to see how you can get the most out of the platform.
              </p>
            </div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-xl">
                  <User className="mr-3 size-6 text-primary" />For Students
                </AccordionTrigger>
                <AccordionContent className="prose prose-invert max-w-none text-muted-foreground">
                  <ol>
                    <li><strong>Sign Up:</strong> Create an account by selecting your school, grade, and class.</li>
                    <li><strong>View Schedule:</strong> Once logged in, upload your class schedule if it's not already there, or view the existing one.</li>
                    <li><strong>Commit to Explain:</strong> Click on any explainable subject (like Math, Physics, etc.) in the schedule. A dialog will appear.</li>
                    <li><strong>Fill Details:</strong> Select the date, choose the Learning Outcome (LO), and list the specific concepts you'll cover. You can also invite classmates to explain with you.</li>
                    <li><strong>Prepare & Teach:</strong> Prepare your explanation. On the scheduled date, teach the concepts to your peers!</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-xl">
                  <Briefcase className="mr-3 size-6 text-primary" />For Teachers
                </AccordionTrigger>
                <AccordionContent className="prose prose-invert max-w-none text-muted-foreground">
                  <ol>
                    <li><strong>Sign Up:</strong> Create a teacher account, selecting your school and the classes/subjects you teach.</li>
                    <li><strong>Select a Class:</strong> From your dashboard, click on a class to view its schedule.</li>
                    <li><strong>Monitor Commitments:</strong> Your schedule view is filtered to your subject. You can see which students have committed to explain topics.</li>
                    <li><strong>Mark as Explained:</strong> After a session time has passed, the explanation card will appear in the dashboard below the schedule. Use the ✅ and ❌ buttons to mark whether the topic was successfully explained.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-xl">
                  <Shield className="mr-3 size-6 text-primary" />For Admins
                </AccordionTrigger>
                <AccordionContent className="prose prose-invert max-w-none text-muted-foreground">
                  <ol>
                    <li><strong>Sign Up:</strong> Use the special admin sign-up page and enter the secret admin password.</li>
                    <li><strong>Browse Classrooms:</strong> Use the filters on your dashboard to select any school, grade, and class to view their schedule and commitments.</li>
                    <li><strong>Manage Users:</strong> Switch to the 'Users' view to see a list of all students and teachers. You can delete user profiles if necessary.</li>
                    <li><strong>Moderate Content:</strong> As an admin, you have the ability to delete all explanation commitments for a classroom if a reset is needed.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>
      </main>

       <footer className="border-t">
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <p>&copy; {year} STS (Self Teaching STEMer). All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
