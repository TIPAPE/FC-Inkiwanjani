// frontend/src/navigation/navigationRef.js
import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/**
 * Resets the entire navigation stack to the given route name.
 * Used when auth state changes (login/logout) so any screen can
 * trigger a full stack switch without knowing the stack structure.
 */
export function resetTo(routeName) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: routeName }],
      })
    );
  }
}

/**
 * Navigates to a route if the navigation container is ready.
 */
export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}