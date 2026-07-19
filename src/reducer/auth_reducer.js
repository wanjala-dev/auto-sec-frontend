import {
  LOAD,
  UPDATE_USERNAME,
  UPDATE_PASSWORD,
  TOGGLE_PASSWORD_VISIBILITY,
  RESET_AUTH_FORM,
  SHOW_ERROR,
  SET_EDITTING,
  SET_PERSON,
  UPDATE_EMAIL,
  CLEAR_ERROR,
  UPDATE_SEED,
  REQUEST_REGISTER,
  REGISTER_SUCCESS
  //REGISTER_ERROR
} from '../constants/actions';

// Initial state constant
export const initialState = {
  loading: false,
  loading_desc: '',
  username: '',
  password: '',
  passwordLength: 0,
  email: '',
  error_message: '',
  fail: true,
  hidden: true,
  isAuthenticated: null,
  errors: {}
};

// Reducer function
const LoginAuthReducer = (state = initialState, action) => {
  // Use block scope for each case to avoid variable conflicts
  switch (action.type) {
    case LOAD: {
      // Destructure payload with safe defaults
      const { status, description } = action.payload || {};
      return {
        ...state,
        loading: status ?? state.loading,
        loading_desc: description ?? state.loading_desc
      };
    }

    case SET_PERSON: {
      return {
        ...state,
        person: action.payload,
        isAuthenticated: true
      };
    }

    case UPDATE_USERNAME: {
      return {
        ...state,
        username: action.payload ?? ''
      };
    }

    case UPDATE_PASSWORD: {
      return {
        ...state,
        password: action.payload || ''
      };
    }

    case UPDATE_EMAIL: {
      return {
        ...state,
        email: action.payload ?? ''
      };
    }

    case REQUEST_REGISTER: {
      return {
        ...state,
        loading: true
      };
    }

    case REGISTER_SUCCESS: {
      return {
        ...state,
        loading: false
      };
    }

    // case REGISTER_ERROR: {
    //   return {
    //     ...state,
    //     loading: false,
    //     error_message: action.error
    //   };
    // }

    case TOGGLE_PASSWORD_VISIBILITY: {
      return {
        ...state,
        hidden: !state.hidden
      };
    }

    case RESET_AUTH_FORM: {
      return {
        ...state,
        username: '',
        password: '',
        email: ''
      };
    }

    case SET_EDITTING: {
      return {
        ...state,
        edit: action.payload
      };
    }

    case SHOW_ERROR: {
      // Destructure with defaults for safety
      const { msg = '', fail = true } = action.payload || {};
      return {
        ...state,
        error_message: msg,
        fail: fail
      };
    }

    case CLEAR_ERROR: {
      return {
        ...state,
        error_message: '',
        fail: false
      };
    }

    case UPDATE_SEED: {
      return {
        ...state,
        current_seed: action.payload
      };
    }

    // Default case returns state unchanged
    default:
      return state;
  }
};

export default LoginAuthReducer;
