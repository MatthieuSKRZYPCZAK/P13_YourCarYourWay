import { Injectable } from '@angular/core';
import {MatSnackBar} from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class MessageService {

  constructor(private snackBar: MatSnackBar) { }

  showMessage(message: string, action: string = 'Fermer', duration: number = 3000, panelClass: string[] = []): void {
    this.snackBar.open(message, action, {
      duration,
      panelClass,
    });
  }

  showError(message: string): void {
    this.showMessage(message, 'Fermer', 3000, ['snackbar-error']);
  }

  showInfo(message: string): void {
    this.showMessage(message, 'Fermer', 3000, ['snackbar-info']);
  }
}
