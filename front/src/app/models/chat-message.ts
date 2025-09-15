export interface ChatMessage {
  content: string;
  type: 'CHAT' | 'JOIN' | 'LEAVE';
  sender: string | null;                 // côté serveur: username ou null (guest)
  timestamp: string;
  clientId?: string;
  senderRole?: string;
  authenticated?: boolean;
}

/** payload reçu par la page support (topic admin) */
export interface AdminMsg {
  clientId: string;
  sender: string | null;                 // auteur côté serveur
  role: string;                          // rôle de l’auteur
  timestamp: string;
  content: string;
  type: 'CHAT' | 'JOIN' | 'LEAVE';
}
