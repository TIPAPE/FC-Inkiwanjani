// frontend/src/constants/config.js
import { Platform } from 'react-native';

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;

const DEV_API_URL =
  Platform.OS === 'android'
    ? 'http://10.143.101.41:5000/api'
    : 'http://localhost:5000/api';

const PROD_API_URL = 'https://api.fcinkiwanjani.com/api';

export const API_BASE_URL = ENV_API_URL || (__DEV__ ? DEV_API_URL : PROD_API_URL);

export const APP_NAME = 'FC Inkiwanjani';
export const CLUB_NICKNAME = 'The Wolves';
export const DEFAULT_TIMEOUT = 10000;