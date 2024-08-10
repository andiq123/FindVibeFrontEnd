import { Component, computed, input, output, signal } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-moving-title',
  standalone: true,
  imports: [],
  templateUrl: './moving-title.component.html',
  styleUrl: './moving-title.component.scss',
})
export class MovingTitleComponent {
  title = input.required<string>();
  classes = input<string>('text-md font-bold');
  isActive = input<boolean>(false);

  offset = input<number>(26);
  isRedirect = input<boolean>(false);
  closePlayer = output<void>();

  constructor(private router: Router) {}

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

  async redirectToSearch() {
    await this.router.navigate([`/songs/${this.title()}`]);
    this.closePlayer.emit();
  }
}
