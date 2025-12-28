import { Component, computed, signal } from '@angular/core';
import {
  FaIconComponent,
  IconDefinition,
} from '@fortawesome/angular-fontawesome';
import {
  faMusic,
  faBook,
  faHistory,
} from '@fortawesome/free-solid-svg-icons';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
    selector: 'app-navigation',
    imports: [FaIconComponent, RouterLink, RouterLinkActive],
    templateUrl: './navigation.component.html',
    styleUrl: './navigation.component.scss'
})
export class NavigationComponent {
  navListSource = computed(() => [
    {
      name: 'search',
      icon: faMusic,
      link: '/songs',
    },
    {
      name: 'library',
      icon: faBook,
      link: '/library',
    },
    {
      name: 'recent',
      icon: faHistory,
      link: '/recent',
    },
  ]);
  navList = signal<{ name: string; icon: IconDefinition; link: string }[]>(
    this.navListSource()
  );
}
