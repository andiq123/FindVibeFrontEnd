import {
  Component,
  computed,
  signal,
  ChangeDetectionStrategy,
} from "@angular/core";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import {
  faCompass,
  faBookmark,
  faClock,
  IconDefinition,
} from "../../shared/icons";
import { RouterLink, RouterLinkActive } from "@angular/router";

@Component({
  selector: "app-navigation",
  standalone: true,
  imports: [FaIconComponent, RouterLink, RouterLinkActive],
  templateUrl: "./navigation.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationComponent {
  navListSource = computed(() => [
    {
      name: "Explore",
      icon: faCompass,
      link: "/songs",
    },
    {
      name: "Vault",
      icon: faBookmark,
      link: "/library",
    },
    {
      name: "History",
      icon: faClock,
      link: "/recent",
    },
  ]);
  navList = signal<{ name: string; icon: IconDefinition; link: string }[]>(
    this.navListSource(),
  );
}
