import { Component, input, computed, ChangeDetectionStrategy } from "@angular/core";
import { IconDefinition } from "../icons";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";

@Component({
  selector: "app-empty-state",
  standalone: true,
  imports: [FontAwesomeModule],
  template: `
    <div
      class="flex flex-col items-center justify-center py-20 px-8 text-center"
    >
      <div
        [class]="'w-20 h-20 rounded-3xl flex items-center justify-center mb-6 ring-1 ' + iconBgClass()"
      >
        <fa-icon [icon]="icon()" class="text-3xl" [class]="iconColorClass()" />
      </div>
      <h2 [class]="'text-xl font-semibold mb-2 ' + titleColorClass()">
        {{ title() }}
      </h2>
      <p class="text-base-content/40 text-sm max-w-[240px]">
        {{ description() }}
      </p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  icon = input.required<IconDefinition>();
  title = input.required<string>();
  description = input.required<string>();
  variant = input<"default" | "error">("default");

  iconBgClass = computed(() =>
    this.variant() === "error"
      ? "bg-error/10 ring-error/20"
      : "bg-base-200/50 ring-white/5"
  );

  iconColorClass = computed(() =>
    this.variant() === "error" ? "text-error" : "text-base-content/20"
  );

  titleColorClass = computed(() =>
    this.variant() === "error" ? "text-error" : ""
  );
}
