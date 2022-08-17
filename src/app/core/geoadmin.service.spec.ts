import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { GeoadminService } from './geoadmin.service';

describe('GeoadminService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    })
  );

  it('should be created', () => {
    const service: GeoadminService = TestBed.get(GeoadminService);
    expect(service).toBeTruthy();
  });
});
