import { Component, inject, computed, signal, effect, ChangeDetectionStrategy, ViewChild, ElementRef, OnInit, Renderer2 } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { ModalService } from '../../../core/services/modal.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-global-modal',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  template: `
    @if (activeComponent()) {
      <div class="modal-backdrop" (click)="close()"></div>
      <div class="modal-container" [class.closing]="isClosing()" #modalContainer>
        <div class="modal-handle-bar" (click)="close()">
            <div class="handle"></div>
        </div>
        <div class="modal-content">
          <ng-container *ngComponentOutlet="activeComponent(); inputs: componentInputs()" />
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }

    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.25);
      z-index: 1000;
      backdrop-filter: blur(4px);
    }

    .modal-backdrop:not(.closing) {
      animation: fadeIn var(--anim-duration-normal) ease-out forwards;
    }

    .modal-container {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(25, 25, 25, 0.75);
      border-top-left-radius: 20px;
      border-top-right-radius: 20px;
      z-index: 1001;
      padding-bottom: env(safe-area-inset-bottom);
      box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.3);
      max-height: 92vh;
      display: flex;
      flex-direction: column;
      border-top: 0.5px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(35px) saturate(180%);
      -webkit-backdrop-filter: blur(35px) saturate(180%);
      will-change: transform;
      transform: translateY(100%);
      animation: slide-up var(--anim-duration-slow) var(--anim-ease-spring) forwards;
    }
    
    .modal-container.closing {
      animation: slide-down var(--anim-duration-normal) var(--anim-ease-spring) forwards;
    }

    .modal-handle-bar {
       width: 100%;
       height: 32px;
       display: flex;
       justify-content: center;
       align-items: center;
       cursor: pointer;
       flex-shrink: 0;
    }
    
    .handle {
        width: 36px;
        height: 5px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 100px;
        transition: background 0.2s;
    }

    .modal-handle-bar:hover .handle {
        background: rgba(255, 255, 255, 0.3);
    }

    .modal-content {
      overflow-y: auto;
      flex: 1;
      padding: 0 20px 20px 20px;
      -webkit-overflow-scrolling: touch;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GlobalModalComponent {
  private modalService = inject(ModalService);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  
  activeComponent = this.modalService.activeModal;
  isClosing = signal(false);

  componentInputs = computed(() => {
     const data = this.modalService.modalData();
     return data ? { data } : {};
  });
  
  faXmark = faXmark;

  @ViewChild('modalContainer') modalContainer?: ElementRef;

  constructor() {
    effect(() => {
      const isOpen = this.activeComponent() !== null;
      if (isOpen) {
        this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
      } else {
        this.renderer.removeStyle(this.document.body, 'overflow');
      }
    });
  }

  close() {
    this.isClosing.set(true);
    setTimeout(() => {
        this.modalService.close();
        this.isClosing.set(false);
    }, 300);
  }
}
