import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { App } from './app';

describe('App', () => {
  const themeKey = 'github-explorer-theme';

  beforeEach(async () => {
    localStorage.removeItem(themeKey);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(() => {
    localStorage.removeItem(themeKey);
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the GitHub Explorer title', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const title = compiled.querySelector('a');

    expect(title?.textContent).toContain('GitHub');
    expect(title?.textContent).toContain('Explorer');
  });

  it('should navigate to the searched username', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.returnValue(
      Promise.resolve(true),
    );

    const fixture = TestBed.createComponent(App);

    fixture.componentInstance.onSearch('  octocat  ');

    expect(navigateSpy).toHaveBeenCalledWith(['/u', 'octocat']);
  });

  it('should not navigate when the search input is empty', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');

    const fixture = TestBed.createComponent(App);

    fixture.componentInstance.onSearch('   ');

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should initialize with light mode when no preference is saved', () => {
    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance.isDark()).toBeFalse();
  });

  it('should initialize with dark mode when dark preference is saved', () => {
    localStorage.setItem(themeKey, 'dark');

    const fixture = TestBed.createComponent(App);

    expect(fixture.componentInstance.isDark()).toBeTrue();
  });

  it('should switch to dark mode and save the preference', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.toggleTheme();

    expect(app.isDark()).toBeTrue();
    expect(localStorage.getItem(themeKey)).toBe('dark');
  });

  it('should switch to light mode and save the preference', () => {
    localStorage.setItem(themeKey, 'dark');

    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    app.toggleTheme();

    expect(app.isDark()).toBeFalse();
    expect(localStorage.getItem(themeKey)).toBe('light');
  });
});
