'use client';
import {createBrowserClient} from '@supabase/ssr';
import {credentials} from './config';
export function browserClient(){const {url,key}=credentials();return createBrowserClient(url,key);}
