import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { Conference } from '@shared/schema';

interface CreateConferenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (conference: Conference) => void;
}

interface FormValues {
  name: string;
}

export default function CreateConferenceModal({
  open,
  onOpenChange,
  onSuccess
}: CreateConferenceModalProps) {
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    defaultValues: {
      name: ''
    }
  });

  const createConferenceMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const res = await apiRequest('POST', '/api/conferences', data);
      if (!res) throw new Error('Не удалось создать конференцию');
      return (await res.json()).conference as Conference;
    },
    onSuccess: (conference) => {
      queryClient.invalidateQueries({ queryKey: ['/api/conferences'] });
      toast({
        title: 'Конференция создана',
        description: `Конференция "${conference.name}" успешно создана`,
      });
      reset();
      onSuccess(conference);
    },
    onError: (error: Error) => {
      toast({
        title: 'Ошибка',
        description: `Не удалось создать конференцию: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  const onSubmit = (data: FormValues) => {
    createConferenceMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Video className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Создание новой конференции</DialogTitle>
          </div>
          <DialogDescription>
            Введите название для новой видеоконференции. После создания вы получите ссылку и код для приглашения участников.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-5 py-3">
            <div className="space-y-2">
              <Label htmlFor="name">Название конференции</Label>
              <Input
                id="name"
                placeholder="Например: Еженедельное совещание"
                className="focus-visible:ring-primary"
                {...register("name", { required: "Название обязательно" })}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-5 gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Отмена
            </Button>
            <Button 
              type="submit" 
              disabled={createConferenceMutation.isPending}
            >
              {createConferenceMutation.isPending ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Создание...
                </>
              ) : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
