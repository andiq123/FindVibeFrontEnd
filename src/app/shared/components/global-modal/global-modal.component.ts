import {
  Component,
  inject,
  computed,
  signal,
  effect,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  Renderer2,
} from "@angular/core";
import { CommonModule, DOCUMENT } from "@angular/common";
import { ModalService } from "../../../core/services/modal.service";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { faXmark } from "../../icons";
import { SwipeDownDirective } from "../../../features/player/directives/swipe-down.directive";

@Component({
  selector: "app-global-modal",
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, SwipeDownDirective],
  template: `
    @if (activeComponent()) {
      <div class="modal-backdrop" (click)="close()" role="presentation"></div>
      <div
        class="modal-container"
        [class.opening]="isOpening()"
        [class.closing]="isClosing()"
        #modalContainer
        role="dialog"
        aria-modal="true"
        appSwipeDown
        [handleSelector]="'.modal-handle-bar, .modal-content'"
        (closePanel)="close()"
      >
        <div
          class="modal-handle-bar"
          (click)="close()"
          (keydown.enter)="close()"
          (keydown.space)="close(); $event.preventDefault()"
          tabindex="0"
          role="button"
          aria-label="Close modal"
        >
          <div class="handle"></div>
        </div>
        <div class="modal-content">
          <ng-container
            *ngComponentOutlet="activeComponent(); inputs: componentInputs()"
          />
        </div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: oklch(from oklch(var(--b1)) l c h / 0.6);
        z-index: 199;
        backdrop-filter: blur(8px);
      }

      .modal-backdrop:not(.closing) {
        animation: fadeIn var(--anim-duration-normal) ease-out forwards;
      }

      .modal-container {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: oklch(from oklch(var(--b2)) l c h / 0.95);
        border-top-left-radius: 24px;
        border-top-right-radius: 24px;
        z-index: 200;
        padding-bottom: env(safe-area-inset-bottom);
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
        max-height: 92vh;
        display: flex;
        flex-direction: column;
        border-top: 1px solid oklch(from oklch(var(--bc)) l c h / 0.1);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        will-change: transform;
        transform: translateY(0);
      }

      .modal-container.opening {
        animation: slide-up var(--anim-duration-slow) var(--anim-ease-out)
          forwards;
      }

      .modal-container.closing {
        animation: slide-down var(--anim-duration-normal) var(--anim-ease-in)
          forwards;
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalModalComponent {
  private modalService = inject(ModalService);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);

  activeComponent = this.modalService.activeModal;
  isClosing = signal(false);
  isOpening = signal(false);

  componentInputs = computed(() => {
    const data = this.modalService.modalData();
    return data ? { data } : {};
  });

  faXmark = faXmark;

  @ViewChild("modalContainer") modalContainer?: ElementRef;

  constructor() {
    effect(() => {
      const isOpen = this.activeComponent() !== null;
      if (isOpen) {
        this.isOpening.set(true);
        this.renderer.setStyle(this.document.body, "overflow", "hidden");
        setTimeout(() => this.isOpening.set(false), 600);
      } else {
        this.renderer.removeStyle(this.document.body, "overflow");
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
