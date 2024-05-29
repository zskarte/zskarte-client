import { Directive, Input } from '@angular/core';
import { AbstractControl, NG_VALIDATORS, ValidationErrors, Validator } from '@angular/forms';

@Directive({
  selector: '[appRegexValidator]',
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: RegexValidatorDirective,
      multi: true,
    },
  ],
})
export class RegexValidatorDirective implements Validator {
  @Input('appRegexValidator') options = '';

  validate(control: AbstractControl): ValidationErrors | null {
    try {
      RegExp(control.value, this.options);
      return null;
    } catch (ex) {
      return { regex: ex };
    }
  }
}
