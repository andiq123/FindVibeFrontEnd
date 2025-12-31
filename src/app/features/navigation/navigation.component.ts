import {
  Component,
  computed,
  signal,
  ChangeDetectionStrategy,
  inject,
} from "@angular/core";
import {
  FaIconComponent,
  IconDefinition,
} from "@fortawesome/angular-fontawesome";
import {
  faCompass,
  faBookmark,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import { RouterLink, RouterLinkActive } from "@angular/router";
import {
  HapticService,
  HapticFeedback,
} from "../../core/services/haptic.service";

@Component({
  selector: "app-navigation",
  imports: [FaIconComponent, RouterLink, RouterLinkActive],
  templateUrl: "./navigation.component.html",
  styleUrl: "./navigation.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationComponent {
  private hapticService = inject(HapticService);

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

  onNavClick() {
    this.hapticService.impact(HapticFeedback.SELECTION);
  }
}
