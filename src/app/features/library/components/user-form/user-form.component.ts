import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-user-form',
    standalone: true,
    imports: [FormsModule],
    templateUrl: './user-form.component.html',
    styleUrl: './user-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFormComponent {
  name = signal('');
  loadingSubmiting = signal(false);

  private userService = inject(UserService);

  setUpUser() {
    this.loadingSubmiting.set(true);
    this.userService.registerUser(this.name()).subscribe({
      next: () => {
        this.loadingSubmiting.set(false);
      },
      error: () => {
        this.loadingSubmiting.set(false);
      }
    });
  }
}
