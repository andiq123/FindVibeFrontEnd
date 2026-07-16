import { Component, ChangeDetectionStrategy, inject } from "@angular/core";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import {
  faCompass,
  faHeart,
  faClockRotateLeft,
  faGear,
} from "../../shared/icons";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { HapticsService } from "../../core/services/haptics.service";

@Component({
  selector: "app-navigation",
  standalone: true,
  imports: [FaIconComponent, RouterLink, RouterLinkActive],
  templateUrl: "./navigation.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationComponent {
  private readonly haptics = inject(HapticsService);

  onNavTap(): void {
    this.haptics.selection();
  }

  /** Short labels — tab bar space is tight on mobile. */
  readonly navList = [
    {
      name: "Explore",
      icon: faCompass,
      link: "/explore",
    },
    {
      name: "Vault",
      icon: faHeart,
      link: "/library",
    },
    {
      name: "Recent",
      icon: faClockRotateLeft,
      link: "/recent",
    },
    {
      name: "Settings",
      icon: faGear,
      link: "/settings",
    },
  ];
}
