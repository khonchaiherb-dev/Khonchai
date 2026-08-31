import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./tests/e2e',
  timeout:30_000,
  expect:{timeout:7_500},
  fullyParallel:false,
  retries:process.env.CI?1:0,
  reporter:process.env.CI?'line':'list',
  use:{
    baseURL:'http://127.0.0.1:4173',
    serviceWorkers:'block',
    trace:'retain-on-failure',
    screenshot:'only-on-failure'
  },
  projects:[
    {name:'mobile-390',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
    {name:'tablet-820',use:{viewport:{width:820,height:1180},hasTouch:true}},
    {name:'desktop-1440',use:{viewport:{width:1440,height:1000}}}
  ],
  webServer:{
    command:'python3 -m http.server 4173 -d public',
    url:'http://127.0.0.1:4173',
    reuseExistingServer:!process.env.CI,
    timeout:20_000
  }
});
