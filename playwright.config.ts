import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',fullyParallel:false,workers:1,reporter:'list',use:{baseURL:'http://localhost:3000',channel:'chrome',trace:'retain-on-failure'},projects:[{name:'mobile-chrome',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}]});
