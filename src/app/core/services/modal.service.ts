import { Injectable, signal, Type } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  activeModal = signal<Type<any> | null>(null);
  modalData = signal<any>(null);

  constructor() {}

  open<T>(component: Type<T>, data?: any) {
    this.modalData.set(data);
    this.activeModal.set(component);
  }

  close() {
    this.activeModal.set(null);
    this.modalData.set(null);
  }

  isOpen() {
    return this.activeModal() !== null;
  }
}
