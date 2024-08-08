import { Component, output, signal } from '@angular/core';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';
import { LibraryService } from '../../services/library.service';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss',
})
export class UserFormComponent {
  name = signal<string>('');
  loadingSubmiting = signal<boolean>(false);

  constructor(private userService: UserService) {}

  setUpUser() {
    this.loadingSubmiting.set(true);
    this.userService.registerUser(this.name()).subscribe({
      next: () => {
        this.loadingSubmiting.set(false);
      },
    });
  }
}
