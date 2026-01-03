import {
  Component,
  computed,
  input,
  signal,
  effect,
  inject,
  untracked,
  ChangeDetectionStrategy,
  HostListener,
  ElementRef,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { faMagnifyingGlass, faArrowUp } from "../../../shared/icons";
import { FormsModule } from "@angular/forms";
import { TitleCasePipe } from "@angular/common";
import { Router } from "@angular/router";
import { SearchService } from "../services/search.service";
import { SearchStatus } from "../../../core/models/song.model";
import {
  Subject,
  debounceTime,
  distinctUntilChanged,
  switchMap,
  of,
} from "rxjs";

@Component({
  selector: "app-search-bar",
  standalone: true,
  imports: [FontAwesomeModule, FormsModule, TitleCasePipe],
  templateUrl: "./search-bar.component.html",
  styleUrl: "./search-bar.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBarComponent {
  query = input("");
  searchTerm = signal("");
  isFocused = signal(false);

  private searchSubject = new Subject<string>();
  private searchService = inject(SearchService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  suggestions = computed(() => this.searchService.suggestions());
  suggestionsLoading = computed(() => this.searchService.suggestionsLoading());

  faMagnifyingGlass = faMagnifyingGlass;
  faArrowUpLeft = faArrowUp;

  constructor() {
    effect(() => {
      const q = this.query();

      if (!q) {
        if (untracked(() => this.searchTerm()) !== "") {
          this.searchTerm.set("");
        }
        return;
      }

      this.searchTerm.set(q);

      const lastQuery = untracked(() => this.searchService.lastQuery());
      const searchStatus = untracked(() => this.searchService.status());

      if (q !== lastQuery || searchStatus === SearchStatus.None) {
        this.submitSearchSongs();
      }

      this.searchService.resetSuggestions();
    });

    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term) => {
          if (term.trim()) {
            return this.searchService.getSuggestions(term);
          } else {
            this.searchService.resetSuggestions();
            return of([]);
          }
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  fillSuggestion(suggestion: string, event: Event): void {
    event.stopPropagation();
    this.searchTerm.set(suggestion);
  }

  async searchBySuggestion(suggestion: string): Promise<void> {
    this.searchTerm.set(suggestion);
    await this.submit();
  }

  onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
    this.searchSubject.next(value);
  }

  clearSearch(input: HTMLInputElement): void {
    this.searchTerm.set("");
    this.searchService.resetSuggestions();
    input.focus();
  }

  async cancelSearch(): Promise<void> {
    this.searchTerm.set("");
    this.searchService.resetSearch();
    await this.router.navigate(["/songs/"]);
  }

  async submit(): Promise<void> {
    const term = this.searchTerm().trim();
    if (!term) return;

    this.searchService.resetSuggestions();

    if (this.query() !== term) {
      await this.router.navigate([`/songs/${term}`]);
    } else {
      this.submitSearchSongs();
    }
  }

  @HostListener("document:click", ["$event"])
  onClickOutside(event: Event): void {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (
      !clickedInside &&
      (this.suggestions().length > 0 || this.suggestionsLoading())
    ) {
      this.searchService.resetSuggestions();
    }
  }

  private submitSearchSongs(): void {
    this.searchService.searchSongs(this.searchTerm(), 1).subscribe();
  }
}
