import {
  Component,
  input,
  output,
  computed,
  ChangeDetectionStrategy,
} from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { faChevronLeft, faChevronRight } from "../../icons";
import { PaginationInfo } from "../../../core/models/song.model";

@Component({
  selector: "app-pagination",
  imports: [FontAwesomeModule],
  templateUrl: "./pagination.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  pagination = input.required<PaginationInfo>();
  pageChange = output<number>();

  faChevronLeft = faChevronLeft;
  faChevronRight = faChevronRight;

  pageNumbers = computed(() => {
    const { currentPage, totalPages } = this.pagination();
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];

    if (currentPage <= 4) {
      this.addPageRange(pages, 1, 5);
      pages.push("...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...");
      this.addPageRange(pages, totalPages - 4, totalPages);
    } else {
      pages.push(1, "...");
      this.addPageRange(pages, currentPage - 1, currentPage + 1);
      pages.push("...", totalPages);
    }

    return pages;
  });

  private addPageRange(
    pages: (number | string)[],
    start: number,
    end: number,
  ): void {
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
  }

  onPageChange(page: number): void {
    const { currentPage, totalPages } = this.pagination();

    if (page !== currentPage && page >= 1 && page <= totalPages) {
      this.pageChange.emit(page);
    }
  }

  isNumber(value: number | string): value is number {
    return typeof value === "number";
  }
}
