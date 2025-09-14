import { TestBed } from '@angular/core/testing';

import { Approvals } from './approvals';

describe('Approvals', () => {
  let service: Approvals;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Approvals);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
