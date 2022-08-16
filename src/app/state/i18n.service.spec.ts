import { TestBed } from '@angular/core/testing';

import { I18NService } from './i18n.service';

describe('I18NService', () => {
  let service: I18NService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(I18NService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
