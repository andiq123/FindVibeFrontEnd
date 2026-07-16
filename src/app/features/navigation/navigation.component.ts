import { Component, ChangeDetectionStrategy } from "@angular/core";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import {
  faCompass,
  faBookmark,
  faClock,
  faGear,
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
  readonly navList = [
    {
      name: "Explore",
      icon: faCompass,
      link: "/explore",
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
    {
      name: "Settings",
      icon: faGear,
      link: "/settings",
    },
  ];
}
