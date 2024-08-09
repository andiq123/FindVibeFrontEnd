import { Directive, HostListener, output } from '@angular/core';

@Directive({
  selector: '[appDragAndDrop]',
  standalone: true,
  host: {
    draggable: 'true',
  },
})
export class DragAndDropDirective {
  reorderSongs = output<{ from: string; to: string }>();

  @HostListener('dragstart', ['$event'])
  onDragStart(event: DragEvent) {
    const target = event.target as HTMLDivElement;
    const initiatorId = target.id;

    event.dataTransfer?.setData('id', initiatorId);
    target.classList.add('dragging');

    const elToRemove = target.querySelector('#elToRemove');
    elToRemove?.classList.add('pointer-events-none');
  }

  @HostListener('dragend', ['$event'])
  onDragEnd(event: DragEvent) {
    const target = event.target as HTMLDivElement;
    target.classList.remove('dragging');
    const elToRemove = target.querySelector('#elToRemove');
    elToRemove?.classList.remove('pointer-events-none');
  }

  @HostListener('dragenter', ['$event'])
  onDragEnter(event: DragEvent) {
    event.preventDefault();
    const target = event.target as HTMLDivElement;

    const elToRemove = target.querySelector('#elToRemove');
    elToRemove?.classList.add('pointer-events-none');

    const draggable = target.attributes.getNamedItem('draggable');
    if (draggable) {
      target.classList.add('dragTarget');
    }
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent) {
    event.preventDefault();
    const target = event.target as HTMLDivElement;

    const elToRemove = target.querySelector('#elToRemove');
    elToRemove?.classList.remove('pointer-events-none');

    const draggable = target.attributes.getNamedItem('draggable');
    if (draggable) {
      target.classList.remove('dragTarget');
    }
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    event.preventDefault();
    const target = event.target as HTMLDivElement;

    const elToRemove = target.querySelector('#elToRemove');
    elToRemove?.classList.remove('pointer-events-none');

    target.classList.remove('dragTarget');
    const initiatorId = event.dataTransfer?.getData('id');
    const title = target.id;
    this.reorderSongs.emit({ from: initiatorId!, to: title });
  }

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  private addPointerNone() {
    const el = document.getElementById('elToRemove');
    el?.classList.add('pointer-events-none');
  }

  private removePointerNone() {
    const el = document.getElementById('elToRemove');
    el?.classList.remove('pointer-events-none');
  }
}
