import { TestBed } from '@angular/core/testing';

import { SessionGuard } from './session.guard';

describe('AuthGuardGuard', () => {
  let guard: SessionGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(SessionGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
