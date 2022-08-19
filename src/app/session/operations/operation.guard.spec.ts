import { TestBed } from '@angular/core/testing';

import { OperationGuard } from './operation.guard';

describe('OperationsGuard', () => {
  let guard: OperationGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(OperationGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
