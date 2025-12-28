import { Component, signal, inject } from '@angular/core';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-user-form',
    imports: [FormsModule],
    templateUrl: './user-form.component.html',
    styleUrl: './user-form.component.scss'
})
export class UserFormComponent {
  name = signal<string>('');
  loadingSubmiting = signal<boolean>(false);

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
