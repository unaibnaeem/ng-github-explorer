import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { SearchPage } from './search-page';

describe('SearchPage', () => {
  let component: SearchPage;
  let fixture: ComponentFixture<SearchPage>;
  let router: Router;
  let navigateSpy: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchPage);
    component = fixture.componentInstance;

    router = TestBed.inject(Router);
    navigateSpy = spyOn(router, 'navigate').and.returnValue(
      Promise.resolve(true),
    );

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should contain the expected example usernames', () => {
    expect(component.examples).toEqual(['torvalds', 'gaearon', 'sindresorhus']);
  });

  it('should navigate to the searched username', () => {
    component.search('octocat');

    expect(navigateSpy).toHaveBeenCalledWith(['/u', 'octocat']);
  });

  it('should trim whitespace from the username before navigating', () => {
    component.search('  octocat  ');

    expect(navigateSpy).toHaveBeenCalledWith(['/u', 'octocat']);
  });

  it('should not navigate when the username is empty', () => {
    component.search('');

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should not navigate when the username contains only whitespace', () => {
    component.search('   ');

    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
