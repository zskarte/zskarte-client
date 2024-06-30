import { TestBed } from '@angular/core/testing';

import { BlobService } from './blob.service';

describe('BlobService', () => {
  let service: BlobService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BlobService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
