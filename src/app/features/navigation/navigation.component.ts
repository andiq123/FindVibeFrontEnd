import {
  Component,
  computed,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { FaIconComponent } from "@fortawesome/angular-fontawesome";
import { faCompass, faBookmark, faClock } from "../../shared/icons";
import { RouterLink, RouterLinkActive } from "@angular/router";
import { SearchService } from "../search/services/search.service";

@Component({
  selector: "app-navigation",
  standalone: true,
  imports: [FaIconComponent, RouterLink, RouterLinkActive],
  templateUrl: "./navigation.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavigationComponent {
  private searchService = inject(SearchService);

  navList = computed(() => {
    const lastQuery = this.searchService.lastQuery();
    const songsLink = lastQuery ? `/songs/${lastQuery}` : "/songs";

    return [
      {
        name: "Explore",
        icon: faCompass,
        link: songsLink,
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
    ];
  });
}
