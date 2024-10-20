import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { GeoadminService } from './geoadmin.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('GeoadminService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      imports: [],
      providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()],
    }),
  );

  it('should be created', () => {
    const service: GeoadminService = TestBed.get(GeoadminService);
    expect(service).toBeTruthy();
  });
});
