import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchBar } from './search-bar';

describe('SearchBar', () => {
  let component: SearchBar;
  let fixture: ComponentFixture<SearchBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchBar],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update the query when the user types', () => {
    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;

    input.value = 'octocat';
    input.dispatchEvent(new Event('input'));

    expect(component.query()).toBe('octocat');
  });

  it('should emit the trimmed username when the form is submitted', () => {
    const searchedSpy = jasmine.createSpy('searched');
    component.searched.subscribe(searchedSpy);

    const input = fixture.nativeElement.querySelector(
      'input',
    ) as HTMLInputElement;

    input.value = '  octocat  ';
    input.dispatchEvent(new Event('input'));

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;

    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    expect(searchedSpy).toHaveBeenCalledOnceWith('octocat');
  });

  it('should not emit when the query is empty', () => {
    const searchedSpy = jasmine.createSpy('searched');
    component.searched.subscribe(searchedSpy);

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;

    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    expect(searchedSpy).not.toHaveBeenCalled();
  });

  it('should not emit when the query contains only whitespace', () => {
    const searchedSpy = jasmine.createSpy('searched');
    component.searched.subscribe(searchedSpy);

    component.query.set('   ');

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;

    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    expect(searchedSpy).not.toHaveBeenCalled();
  });

  it('should disable the submit button when the query is empty', () => {
    const button = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;

    expect(button.disabled).toBeTrue();
  });

  it('should enable the submit button when the query is not empty', () => {
    component.query.set('octocat');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;

    expect(button.disabled).toBeFalse();
  });
});
