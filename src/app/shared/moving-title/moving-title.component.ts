import { Component, computed, input, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-moving-title',
  standalone: true,
  imports: [],
  templateUrl: './moving-title.component.html',
  styleUrl: './moving-title.component.scss',
})
export class MovingTitleComponent {
  title = input.required<string>();
  isActive = input<boolean>(false);

  isLonger = computed(() => {
    return this.title().length > this.offset();
  });

  trimmedTitle = computed(() => {
    if (this.isLonger()) {
      return this.title().slice(0, this.offset()) + '...';
    } else return this.title();
  });

  titleToDisplay = computed(() => {
    if (this.isActive() && this.isLonger()) {
      return this.title();
    }
    if (this.isLonger()) {
      return this.trimmedTitle();
    }
    return this.title();
  });

  offset = signal<number>(30);
}
