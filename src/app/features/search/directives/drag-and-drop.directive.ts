import { Directive, HostListener, output, ElementRef, inject, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appDragAndDrop]',
  standalone: true,
  host: {
    draggable: 'true',
  },
})
export class DragAndDropDirective {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private currentDropTarget: HTMLElement | null = null;
  
  reorderSongs = output<{ from: string; to: string }>();

  @HostListener('dragstart', ['$event'])
  onDragStart(event: DragEvent): void {
    const target = this.el.nativeElement;
    event.dataTransfer?.setData('id', target.id);
    this.renderer.addClass(target, 'dragging');
  }

  @HostListener('dragend')
  onDragEnd(): void {
    this.renderer.removeClass(this.el.nativeElement, 'dragging');
    this.clearDropTarget();
  }

  @HostListener('dragenter', ['$event'])
  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const target = this.el.nativeElement;
    if (target.id && !target.classList.contains('dragging')) {
      this.setDropTarget(target);
    }
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (!this.el.nativeElement.contains(relatedTarget)) {
      this.clearDropTarget();
    }
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent): void {
    event.preventDefault();
    const target = this.el.nativeElement;
    const initiatorId = event.dataTransfer?.getData('id');
    const targetId = target.id;
    
    if (initiatorId && targetId && initiatorId !== targetId) {
      this.reorderSongs.emit({ from: initiatorId, to: targetId });
    }
    
    this.clearDropTarget();
  }

  private setDropTarget(target: HTMLElement): void {
    if (this.currentDropTarget !== target) {
      this.clearDropTarget();
      this.currentDropTarget = target;
      this.renderer.addClass(target, 'dragTarget');
    }
  }

  private clearDropTarget(): void {
    if (this.currentDropTarget) {
      this.renderer.removeClass(this.currentDropTarget, 'dragTarget');
      this.currentDropTarget = null;
    }
  }
}
