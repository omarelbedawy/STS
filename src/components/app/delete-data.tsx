
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteAllDataAction } from '@/app/admin/delete-actions';
import { Loader2, Trash2 } from 'lucide-react';

export function DeleteData() {
  const { toast } = useToast();
  const [target, setTarget] = useState<'all' | 'users' | 'schedules'>('all');
  const [adminSecret, setAdminSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    toast({
        title: "Deletion in Progress...",
        description: `Attempting to delete all ${target}. Please do not navigate away.`,
    });

    const result = await deleteAllDataAction({ target, adminSecret });

    if (result.success) {
      toast({
        title: 'Deletion Successful',
        description: result.message,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: result.message,
      });
    }
    setAdminSecret('');
    setIsLoading(false);
  };

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle>Danger Zone: Bulk Data Deletion</CardTitle>
        <CardDescription>
          This is a high-risk area. These actions will permanently delete large
          amounts of data from the database and cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
            <label className="text-sm font-medium">Data to Delete</label>
            <Select onValueChange={(value) => setTarget(value as any)} defaultValue={target}>
                <SelectTrigger>
                    <SelectValue placeholder="Select data to delete" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="schedules">All Classroom Data (Schedules & Explanations)</SelectItem>
                    <SelectItem value="users">All Users (Auth & Profiles)</SelectItem>
                    <SelectItem value="all" className="text-destructive">EVERYTHING (All Users & All Classrooms)</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <label htmlFor="admin-secret" className="text-sm font-medium">Admin Secret</label>
             <Input
                id="admin-secret"
                type="password"
                placeholder="Enter the secret password to confirm"
                value={adminSecret}
                onChange={(e) => setAdminSecret(e.target.value)}
            />
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={!adminSecret || isLoading}>
              {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Trash2 className="mr-2" />}
              Initiate Deletion
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action is irreversible. You are about to delete{' '}
                <span className="font-bold text-destructive">all {target}</span> from the system.
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Yes, Delete The Data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </CardContent>
    </Card>
  );
}
