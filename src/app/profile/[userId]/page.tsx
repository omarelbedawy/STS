
'use client';

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { useDoc, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import type { UserProfile, Explanation } from "@/lib/types";
import { Header } from "@/components/app/header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, BookOpen, Clock, Users, Award } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { format } from 'date-fns';
import { Loader2 } from "lucide-react";
import { schoolList } from "@/lib/schools";

function getInitials(name: string) {
    if (!name) return '';
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
}

function LoadingProfile() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="sr-only">Loading profile...</p>
        </div>
    );
}

export default function ProfilePage() {
    const params = useParams();
    const userId = params.userId as string;
    const firestore = useFirestore();

    const userProfileRef = useMemoFirebase(() => {
        if (!firestore || !userId) return null;
        return doc(firestore, "users", userId);
    }, [firestore, userId]);
    const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

    const explanationsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile?.school || !userProfile?.grade || !userProfile?.class || !userProfile?.name) return null;
        return query(
            collection(firestore, 'classrooms', `${userProfile.school}-${userProfile.grade}-${userProfile.class}`, 'explanations'),
            where('contributors', 'array-contains', { userId: userId, status: 'accepted', userName: userProfile.name }),
            where('completionStatus', '==', 'explained')
        );
    }, [firestore, userId, userProfile]);

    const { data: explanations, loading: explanationsLoading } = useCollection<Explanation>(explanationsQuery);

    const stats = useMemo(() => {
        if (!explanations) return { total: 0, bySubject: [] };
        
        const bySubject = explanations.reduce((acc, exp) => {
            acc[exp.subject] = (acc[exp.subject] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const sortedBySubject = Object.entries(bySubject)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        return {
            total: explanations.length,
            bySubject: sortedBySubject,
        }
    }, [explanations]);

    const chartConfig: ChartConfig = useMemo(() => {
        const config: ChartConfig = {};
        stats.bySubject.forEach((item, index) => {
            config[item.name] = {
                label: item.name,
                color: `hsl(var(--chart-${(index % 5) + 1}))`,
            };
        });
        return config;
    }, [stats.bySubject]);


    if (profileLoading || explanationsLoading) {
        return <LoadingProfile />;
    }

    if (!userProfile) {
        return (
            <div className="flex min-h-screen flex-col bg-background text-foreground">
                <Header />
                <main className="container mx-auto flex-grow p-4 text-center">
                    <p>User not found.</p>
                </main>
            </div>
        );
    }
    
    const schoolName = schoolList.find(s => s.id === userProfile.school)?.name || userProfile.school;


    return (
        <div className="min-h-screen bg-background text-foreground">
            <Header />
            <main className="container mx-auto px-4 pb-12 pt-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1 space-y-8">
                        <Card>
                            <CardHeader className="items-center text-center">
                                <Avatar className="h-24 w-24 text-3xl mb-4">
                                    <AvatarFallback>{getInitials(userProfile.name)}</AvatarFallback>
                                </Avatar>
                                <CardTitle>{userProfile.name}</CardTitle>
                                <CardDescription>{userProfile.email}</CardDescription>
                            </CardHeader>
                            <CardContent className="text-center">
                                <Badge variant="secondary">{userProfile.role}</Badge>
                                {userProfile.role === 'student' && (
                                    <p className="text-muted-foreground mt-2">Class {userProfile.grade}{userProfile.class?.toUpperCase()} at {schoolName}</p>
                                )}
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex-row items-center gap-4 space-y-0">
                                <Award className="size-8 text-primary" />
                                <div>
                                    <CardDescription>Total Explanations</CardDescription>
                                    <CardTitle className="text-4xl">{stats.total}</CardTitle>
                                </div>
                            </CardHeader>
                        </Card>
                    </div>

                    <div className="md:col-span-2 space-y-8">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><BarChart /> Subject Breakdown</CardTitle>
                                <CardDescription>Number of topics explained per subject.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {stats.bySubject.length > 0 ? (
                                    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                                        <ResponsiveContainer width="100%" height={250}>
                                            <BarChart data={stats.bySubject} layout="vertical" margin={{ left: 10, right: 30 }}>
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--foreground))', dy: 2 }} width={80} />
                                                <ChartTooltip
                                                    cursor={false}
                                                    content={<ChartTooltipContent indicator="line" />}
                                                />
                                                <Bar dataKey="count" layout="vertical" radius={5}>
                                                     {stats.bySubject.map((entry, index) => (
                                                        <Bar
                                                            key={`cell-${index}`}
                                                            dataKey="count"
                                                            fill={`var(--color-${entry.name})`}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                ) : (
                                    <p className="text-muted-foreground text-center py-10">No explanation stats yet!</p>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><BookOpen/> Explanation History</CardTitle>
                                <CardDescription>A log of all topics this student has explained.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                {explanations && explanations.length > 0 ? (
                                    explanations.map(exp => (
                                        <div key={exp.id} className="flex items-start gap-4 rounded-md border p-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                                                <BookOpen className="size-5 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold">{exp.subject}{exp.learningOutcome ? ` - LO ${exp.learningOutcome}` : ''}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    Explained on {format(exp.explanationDate.toDate(), 'PPP')} for Session {exp.session}
                                                </p>
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {exp.concepts.map(c => <Badge key={c} variant="outline">{c}</Badge>)}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-center py-10">No explanations recorded yet.</p>
                                )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}
