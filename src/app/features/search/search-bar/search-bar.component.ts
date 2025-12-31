import {
  Component,
  computed,
  input,
  OnInit,
  signal,
  OnDestroy,
  effect,
  inject,
  untracked,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef,
} from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { faMagnifyingGlass, faArrowUp } from "../../../shared/icons";
import { FormsModule } from "@angular/forms";
import { TitleCasePipe } from "@angular/common";
import { Router } from "@angular/router";
import { SearchService } from "../services/search.service";
import { Subject, debounceTime, distinctUntilChanged } from "rxjs";
import {
  HapticService,
  HapticFeedback,
} from "../../../core/services/haptic.service";

@Component({
  selector: "app-search-bar",
  imports: [FontAwesomeModule, FormsModule, TitleCasePipe],
  templateUrl: "./search-bar.component.html",
  styleUrl: "./search-bar.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBarComponent implements OnInit, OnDestroy {
  query = input<string>("");
  searchTerm = signal<string>("");
  isFocused = signal<boolean>(false);

  private searchSubject = new Subject<string>();
  private suggestionsService = inject(SearchService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);
  private hapticService = inject(HapticService);

  suggestions = computed(() => this.suggestionsService.suggestions());
  suggestionsLoading = computed(() =>
    this.suggestionsService.suggestionsLoading(),
  );

  faMagnifyingGlass = faMagnifyingGlass;
  faArrowUpLeft = faArrowUp;

  constructor() {
    effect(() => {
      const q = this.query();
      untracked(() => {
        if (!q) {
          const lastQ = this.suggestionsService.lastQuery();
          this.searchTerm.set(lastQ || "");
          if (lastQ) this.router.navigate([`/songs/${lastQ}`]);
          return;
        }

        this.searchTerm.set(q);
        if (q !== this.suggestionsService.lastQuery()) {
          this.submitSearchSongs();
        }
        this.suggestionsService.resetSuggestions();
      });
    });
  }

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((term) => {
        if (term.trim()) {
          this.searchSuggestion(term);
        } else {
          this.suggestionsService.resetSuggestions();
        }
      });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
    this.suggestionsService.resetSuggestions();
  }

  fillSuggestion(suggestion: string, event: Event) {
    event.stopPropagation();
    this.searchTerm.set(suggestion);
    this.searchSuggestion(suggestion);
    this.hapticService.impact(HapticFeedback.SELECTION);
  }

  async searchBySuggestion(suggestion: string) {
    this.searchTerm.set(suggestion);
    this.hapticService.impact(HapticFeedback.LIGHT);
    await this.submit();
  }

  onInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.searchSubject.next(value);
  }

  cancelSearch() {
    this.searchTerm.set("");
    this.suggestionsService.resetSearch();
    this.hapticService.impact(HapticFeedback.LIGHT);
    this.router.navigate(["/songs/"]);
  }

  async submit() {
    const term = this.searchTerm().trim();
    if (term === "") {
      return;
    }

    if (this.query() === term) {
      this.submitSearchSongs();
      this.suggestionsService.resetSuggestions();
    } else {
      await this.setQueryParamsToCurrentSearchTerm();
    }
  }

  @HostListener("document:click", ["$event"])
  onClickOutside(event: Event) {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (
      !clickedInside &&
      (this.suggestions().length > 0 || this.suggestionsLoading())
    ) {
      this.suggestionsService.resetSuggestions();
    }
  }

  private async setQueryParamsToCurrentSearchTerm() {
    await this.router.navigate([`/songs/${this.searchTerm()}`]);
  }

  private searchSuggestion(term: string) {
    this.suggestionsService.getSuggestions(term).subscribe({
      error: () => this.suggestionsService.resetSuggestions(),
    });
  }

  private submitSearchSongs() {
    this.suggestionsService.searchSongs(this.searchTerm()).subscribe({
      next: () => this.suggestionsService.resetSuggestions(),
      error: () => this.suggestionsService.resetSuggestions(),
    });
  }
}
