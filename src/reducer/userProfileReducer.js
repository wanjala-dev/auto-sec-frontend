import {
  GET_USER,
  CREATE_STORE,
  GET_STORE,
  USER_LOADING,
  USER_ERROR,
  USER_SUCCESS,
  UPDATE_THUMBNAIL_IMAGE,
  SEARCH_USERS,
  LIKE_USER,
  UNLIKE_USER,
  GET_USER_LIKES,
  USER_CREATE_TEAM,
  USER_INVITE,
  USER_INVITATIOINS,
  INVITATION_LOADING,
  INVITATION_SUCCESS,
  INVITATION_ERROR,
  USER_ACCEPT_INVITATION,
  USER_PROFILE_UPDATE,
  USER_PROFILE_UPDATE_LOADING,
  USER_PROFILE_UPDATE_ERROR,
  USER_PROFILE_UPDATE_SUCCESS
} from '../types/userProfileTypes';

// Reducer function
const userReducer = (state, action) => {
  // Destructure action for clarity
  const { type, payload } = action;

  // Use block scope for each case
  switch (type) {
    case GET_USER_LIKES: {
      return {
        ...state,
        likes: payload ?? state.likes,
        loading: false
      };
    }

    case LIKE_USER: {
      return {
        ...state,
        like: payload ?? state.like,
        loading: false
      };
    }

    case UNLIKE_USER: {
      return {
        ...state,
        unlike: payload ?? state.unlike,
        loading: false
      };
    }

    case SEARCH_USERS: {
      return {
        ...state,
        users: payload ?? state.users,
        loading: false
      };
    }

    case GET_USER: {
      return {
        ...state,
        user: payload ?? state.user,
        loading: false
      };
    }

    case CREATE_STORE: {
      return {
        ...state,
        store: payload ?? state.store,
        loading: false
      };
    }

    case GET_STORE: {
      return {
        ...state,
        store: payload ?? state.store,
        loading: false
      };
    }

    case USER_CREATE_TEAM: {
      return {
        ...state,
        createdTeam: payload ?? state.createdTeam
      };
    }

    case USER_INVITE: {
      return {
        ...state,
        invitedUser: payload ?? state.invitedUser
      };
    }

    case USER_INVITATIOINS: {
      return {
        ...state,
        invitations: payload ?? state.invitations
      };
    }

    case USER_ACCEPT_INVITATION: {
      return {
        ...state,
        acceptUserInvitations: payload ?? state.acceptUserInvitations
      };
    }

    case USER_PROFILE_UPDATE: {
      // Safe nested updates with defaults
      return {
        ...state,
        user: {
          ...state.user,
          profile: {
            ...(state.user?.profile || {}),
            ...(payload || {})
          }
        },
        loading: false
      };
    }

    // Multiple cases can share the same handler
    case USER_LOADING:
    case INVITATION_LOADING:
    case USER_PROFILE_UPDATE_LOADING: {
      return {
        ...state,
        loading: true
      };
    }

    case USER_SUCCESS:
    case INVITATION_SUCCESS:
    case UPDATE_THUMBNAIL_IMAGE:
    case USER_PROFILE_UPDATE_SUCCESS: {
      return {
        ...state,
        loading: false
      };
    }

    case USER_ERROR:
    case INVITATION_ERROR:
    case USER_PROFILE_UPDATE_ERROR: {
      return {
        ...state,
        loading: false
      };
    }

    // Default case returns state unchanged
    default:
      return state;
  }
};

export default userReducer;
