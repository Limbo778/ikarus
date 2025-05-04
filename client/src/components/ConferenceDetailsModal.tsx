import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, Copy, Check } from 'lucide-react';
import type { Conference } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface ConferenceDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conference: Conference | null;
  onJoin: (conferenceId: string) => void;
}

export default function ConferenceDetailsModal({
  open,
  onOpenChange,
  conference,
  onJoin
}: ConferenceDetailsModalProps) {
  const { toast } = useToast();
  const [linkCopied, setLinkCopied] = useState(false);

  if (!conference) return null;

  // Generate the invitation link
  const invitationLink = `${window.location.origin}/join/${conference.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(invitationLink);
    setLinkCopied(true);
    toast({
      title: 'Ссылка скопирована',
      description: 'Ссылка для приглашения скопирована в буфер обмена',
    });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Link className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>Конференция создана</DialogTitle>
          </div>
          <DialogDescription>
            Ваша конференция "<span className="font-medium">{conference.name}</span>" успешно создана. Используйте следующую информацию для приглашения участников.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-3">
          <div className="space-y-2">
            <Label htmlFor="invitation-link">Ссылка для приглашения</Label>
            <div className="flex rounded-md overflow-hidden shadow-sm">
              <Input
                id="invitation-link"
                value={invitationLink}
                readOnly
                className="focus-visible:ring-primary rounded-r-none"
              />
              <Button
                type="button"
                onClick={copyLink}
                className="rounded-l-none border-l-0"
                variant="secondary"
              >
                {linkCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Отправьте эту ссылку участникам для прямого подключения</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room-code">Код комнаты</Label>
            <div className="relative">
              <Input
                id="room-code"
                value={conference.id}
                readOnly
                className="focus-visible:ring-primary text-center font-medium text-lg"
              />
              <div className="absolute inset-0 pointer-events-none bg-primary/5 opacity-50 rounded-md"></div>
            </div>
            <p className="text-xs text-muted-foreground">Код для ввода на странице входа участника</p>
          </div>
        </div>

        <DialogFooter className="mt-5 gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Закрыть
          </Button>
          <Button 
            type="button" 
            onClick={() => onJoin(conference.id)}
            className="relative group overflow-hidden"
          >
            <span className="relative z-10 flex items-center">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 10L19 6M19 6L15 2M19 6H10.1C7.4 6 5.1 8.3 5.1 11V11C5.1 13.8 7.3 16 10.1 16H15M5 22L9 18M9 18L5 14M9 18H16.9C19.6 18 21.9 15.7 21.9 13V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Подключиться сейчас
            </span>
            <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-10 group-hover:animate-shine"></div>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
