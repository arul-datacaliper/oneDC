import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DevUserDialogComponent } from './dev-user-dialog.component';

describe('DevUserDialogComponent', () => {
  let component: DevUserDialogComponent;
  let fixture: ComponentFixture<DevUserDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DevUserDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DevUserDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
