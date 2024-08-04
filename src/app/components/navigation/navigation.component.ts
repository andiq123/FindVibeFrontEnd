import {Component, computed, signal} from '@angular/core';
import {FaIconComponent, IconDefinition} from "@fortawesome/angular-fontawesome";
import {faList, faMagnifyingGlass} from "@fortawesome/free-solid-svg-icons";
import {TitleCasePipe} from "@angular/common";
import {RouterLink, RouterLinkActive} from "@angular/router";

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    FaIconComponent,
    TitleCasePipe,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss'
})
export class NavigationComponent {
  navListSource = computed(() => [{
    name: 'search',
    icon: faMagnifyingGlass,
    link: '/songs'
  },
    {
      name: 'library',
      icon: faList,
      link: '/library'
    }]);
  navList = signal<{ name: string, icon: IconDefinition, link: string }[]>(this.navListSource());
}
