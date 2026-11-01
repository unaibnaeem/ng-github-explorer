import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ProfilePage } from './profile-page';
import { ProfileStore } from '../profile-store';

function installIntersectionObserverMock() {
  let callback: IntersectionObserverCallback | undefined;

  const observeSpy = jasmine.createSpy('observe');
  const disconnectSpy = jasmine.createSpy('disconnect');

  class MockIntersectionObserver {
    constructor(observerCallback: IntersectionObserverCallback) {
      callback = observerCallback;
    }

    observe = observeSpy;
    unobserve = jasmine.createSpy('unobserve');
    disconnect = disconnectSpy;
    takeRecords = jasmine.createSpy('takeRecords').and.returnValue([]);
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: MockIntersectionObserver,
  });

  return {
    observeSpy,
    disconnectSpy,

    trigger(isIntersecting: boolean): void {
      callback?.(
        [{ isIntersecting } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    },
  };
}

describe('ProfilePage', () => {
  let originalObserverDescriptor: PropertyDescriptor | undefined;

  let storeMock: {
    profile: ReturnType<typeof signal>;
    repos: ReturnType<typeof signal>;
    sortedRepos: ReturnType<typeof signal>;
    sortDir: ReturnType<typeof signal>;
    loadingMoreRepos: ReturnType<typeof signal>;
    hasMoreRepos: ReturnType<typeof signal>;
    loadMoreError: ReturnType<typeof signal>;
    load: jasmine.Spy;
    cancel: jasmine.Spy;
    retryProfile: jasmine.Spy;
    retryRepos: jasmine.Spy;
    loadMoreRepos: jasmine.Spy;
    toggleSortDirection: jasmine.Spy;
  };

  beforeEach(async () => {
    originalObserverDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'IntersectionObserver',
    );

    storeMock = {
      profile: signal({ status: 'idle' }),
      repos: signal({ status: 'idle' }),
      sortedRepos: signal([]),
      sortDir: signal<'desc' | 'asc'>('desc'),
      loadingMoreRepos: signal(false),
      hasMoreRepos: signal(false),
      loadMoreError: signal(null),

      load: jasmine.createSpy('load'),
      cancel: jasmine.createSpy('cancel'),
      retryProfile: jasmine.createSpy('retryProfile'),
      retryRepos: jasmine.createSpy('retryRepos'),
      loadMoreRepos: jasmine.createSpy('loadMoreRepos'),
      toggleSortDirection: jasmine.createSpy('toggleSortDirection'),
    };

    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideRouter([]),
        {
          provide: ProfileStore,
          useValue: storeMock,
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    if (originalObserverDescriptor) {
      Object.defineProperty(
        window,
        'IntersectionObserver',
        originalObserverDescriptor,
      );
    } else {
      Reflect.deleteProperty(window, 'IntersectionObserver');
    }
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ProfilePage);

    fixture.componentRef.setInput('username', 'octocat');
    fixture.detectChanges();

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load the requested username', () => {
    const fixture = TestBed.createComponent(ProfilePage);

    fixture.componentRef.setInput('username', 'octocat');
    fixture.detectChanges();

    expect(storeMock.load).toHaveBeenCalledWith('octocat');
  });

  it('should cancel the store when destroyed', () => {
    const fixture = TestBed.createComponent(ProfilePage);

    fixture.componentRef.setInput('username', 'octocat');
    fixture.detectChanges();

    fixture.destroy();

    expect(storeMock.cancel).toHaveBeenCalled();
  });

  it('should trim whitespace from the username before loading', () => {
    const fixture = TestBed.createComponent(ProfilePage);

    fixture.componentRef.setInput('username', '  octocat  ');
    fixture.detectChanges();

    expect(storeMock.load).toHaveBeenCalledWith('octocat');
  });

  it('should cancel the previous request when the username changes', () => {
    const fixture = TestBed.createComponent(ProfilePage);

    fixture.componentRef.setInput('username', 'octocat');
    fixture.detectChanges();

    fixture.componentRef.setInput('username', 'torvalds');
    fixture.detectChanges();

    expect(storeMock.cancel).toHaveBeenCalledTimes(1);
    expect(storeMock.load).toHaveBeenCalledWith('torvalds');
  });

  it('should delegate profile retry to the store', () => {
    const fixture = TestBed.createComponent(ProfilePage);

    fixture.componentInstance.retryProfile();

    expect(storeMock.retryProfile).toHaveBeenCalled();
  });

  it('should delegate repository retry to the store', () => {
    const fixture = TestBed.createComponent(ProfilePage);

    fixture.componentInstance.retryRepos();

    expect(storeMock.retryRepos).toHaveBeenCalled();
  });

  it('should delegate loading more repositories to the store', () => {
    const fixture = TestBed.createComponent(ProfilePage);

    fixture.componentInstance.loadMoreRepos();

    expect(storeMock.loadMoreRepos).toHaveBeenCalled();
  });

  it('should delegate sort direction changes to the store', () => {
    const fixture = TestBed.createComponent(ProfilePage);

    fixture.componentInstance.toggleSortDirection();

    expect(storeMock.toggleSortDirection).toHaveBeenCalled();
  });

  it('should not load a profile when the username is empty', () => {
    const fixture = TestBed.createComponent(ProfilePage);

    fixture.componentRef.setInput('username', '   ');
    fixture.detectChanges();

    expect(storeMock.load).not.toHaveBeenCalled();
  });

  it('should observe the sentinel and load more when it becomes visible', async () => {
    const observerMock = installIntersectionObserverMock();

    const fixture = TestBed.createComponent(ProfilePage);

    fixture.componentRef.setInput('username', 'octocat');
    fixture.detectChanges();

    await fixture.whenStable();

    const sentinel = fixture.nativeElement.querySelector(
      '[aria-hidden="true"]',
    ) as HTMLDivElement;

    expect(sentinel).toBeTruthy();
    expect(observerMock.observeSpy).toHaveBeenCalledWith(sentinel);

    observerMock.trigger(false);

    expect(storeMock.loadMoreRepos).not.toHaveBeenCalled();

    observerMock.trigger(true);

    expect(storeMock.loadMoreRepos).toHaveBeenCalledTimes(1);

    fixture.destroy();

    expect(observerMock.disconnectSpy).toHaveBeenCalled();
  });
});
