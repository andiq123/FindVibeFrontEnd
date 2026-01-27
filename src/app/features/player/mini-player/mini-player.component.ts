import {
  Component,
  input,
  output,
  ChangeDetectionStrategy,
  OnDestroy,
} from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { faArrowUp, faTriangleExclamation } from "../../../shared/icons";
import { PlayerStatus } from "../models/player.model";
import { PlayerButtonComponent } from "../../../shared/player-button/player-button.component";
import { MovingTitleComponent } from "../../../shared/moving-title/moving-title.component";
import { Song } from "../../../core/models/song.model";
import { NgOptimizedImage } from "@angular/common";

@Component({
  selector: "app-mini-player",
  standalone: true,
  imports: [
    FontAwesomeModule,
    PlayerButtonComponent,
    MovingTitleComponent,
    NgOptimizedImage,
  ],
  templateUrl: "./mini-player.component.html",
  styleUrl: "./mini-player.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MiniPlayerComponent implements OnDestroy {
  song = input.required<Song>();
  status = input.required<PlayerStatus>();
  progress = input<number>(0);
  toggleSizeEvent = output<void>();

  playerStatus = PlayerStatus;
  faArrowUp = faArrowUp;
  faTriangleExclamation = faTriangleExclamation;

  ngOnDestroy() {
    // No cleanup needed
  }

  toggleSize() {
    this.toggleSizeEvent.emit();
  }
}
