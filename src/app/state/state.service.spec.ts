import { TestBed } from '@angular/core/testing';

import { ZsMapStateService } from './state.service';

describe('StateService', () => {
  let service: ZsMapStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ZsMapStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
