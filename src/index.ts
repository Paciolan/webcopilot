#!/usr/bin/env node

import puppeteer from 'puppeteer';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import config from 'config';
import { Command } from 'commander';
import fs from 'fs';
import { executeCommand } from './util/utilities';
import { Logger } from './util/logger';
import { Requests } from './util/requests';
import path from 'path';

// Add this before loading config
process.env["ALLOW_CONFIG_MUTATIONS"] = "true";
process.env["NODE_CONFIG_DIR"] = path.join(process.cwd(), ".webcopilot");
const defaultConfigDir = path.join(__dirname, "..", "config");
if (!process.env["NODE_CONFIG_DIR"].includes(defaultConfigDir)) {
  process.env["NODE_CONFIG_DIR"] += path.delimiter + defaultConfigDir;
}

// Get viewport settings from config
const viewport = config.get<{ width: number; height: number }>('viewport');
const behavior = config.get<{ headless: boolean; useChrome: boolean; keepAlive: boolean }>('behavior');
const claude = config.get<{ apiKey: string }>('claude');

// Add this after the imports
puppeteerExtra.use(StealthPlugin());

const launchBrowser = async () => {
  try {
    // Set up command line options
    const program = new Command();
    program
      .option('-s, --script <path>', 'Path to script file')
      .option('-h, --headless', 'Run in headless mode')
      .option('-c, --chrome', 'Use system installed Chrome')
      .option('-k, --key <key>', 'Override default API key')
      .option('-a, --alive', 'Keep the browser alive after script execution')
      .parse(process.argv);

    const options = program.opts();

    // Check if script file is provided
    if (!options.script) {
      Logger.error('Error: Script file path is required. Use -s or --script option.');
      process.exit(1);
    }

    // Read the script file
    const script = fs.readFileSync(options.script, 'utf8');
    const scriptLines = script.split('\n');

    // Check for Claude API key in command line options
    if (options.key) {
      claude.apiKey = options.key;
    }

    // Check for Claude API key in environment variables
    if (process.env.ANTHROPIC_API_KEY) {
      claude.apiKey = process.env.ANTHROPIC_API_KEY;
    }

    // Check for keepAlive in command line options
    if (options.alive) {
      behavior.keepAlive = true;
    }

    // log the last 4 characters of the api key
    if (claude.apiKey && claude.apiKey.length >= 4) {
      Logger.log(`Claude API key: ****${claude.apiKey.slice(-4)}`);
    } else {
      Logger.log('Claude API key: not set or invalid');
    }

    // Modify config loading to look for .webcopilot_config.yml
    const userConfig = path.join(process.cwd(), '.webcopilot_config.yml');
    if (fs.existsSync(userConfig)) {
      // Config module will automatically merge this with default config
      process.env["NODE_CONFIG_DIR"] = path.dirname(userConfig);
    }

    // Launch Chrome instead of Chromium
    const launchOptions: any = {
      headless: options.headless || behavior.headless,
      args: [
        '--start-maximized',
        '--force-device-scale-factor=1',
      ], // Optional: starts Chrome maximized
      defaultViewport: {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1  // This disables retina/high-DPI scaling
      }
    }

    if (options.chrome || behavior.useChrome) {
      // Set Chrome path based on platform
      switch (process.platform) {
        case 'win32':
          launchOptions.executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
          break;
        case 'darwin':
          launchOptions.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
          break;
        case 'linux':
          launchOptions.executablePath = '/usr/bin/google-chrome';
          break;
        default:
          Logger.error('Unsupported platform for Chrome');
          process.exit(1);
      }
    }
    
    const browser = await puppeteerExtra.launch(launchOptions);
    Logger.info('Browser launched with stealth mode!');

    // Open a new page
    const page = await browser.newPage();

    // register the page with the requests class
    await page.setRequestInterception(true);
    
    page.on('request', request => {
      Requests.newRequest(request);
    });
    
    page.on('requestfinished', request => {
      Requests.finishedRequest(request);
    });
    
    page.on('requestfailed', request => {
      Requests.failedRequest(request);
    });

    // Set viewport size from config
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1  // This disables retina/high-DPI scaling
    });

    // execute the script line by line
    Logger.log('Executing script...');
    for (const line of scriptLines) {
      // trim the line, continue to next line if it's empty
      const trimmedLine = line.trim();
      if (trimmedLine === '') {
        continue;
      }

      await executeCommand(page, trimmedLine);
    }

    // Close the browser
    // await browser.close();
    // console.log('Browser closed.');
    Logger.log('Script execution completed!');

    if (!behavior.keepAlive) {
      // wait for 5 seconds before closing the browser
      await new Promise(resolve => setTimeout(resolve, 5000));

      // close the browser
      await browser.close();
      Logger.log('Browser closed.');
    }
  } catch (error) {
    Logger.error(`Error: ${error}`);
    Logger.error(error instanceof Error ? error.stack || '' : '');

    if (!behavior.keepAlive) {
      // wait for 5 seconds before force exiting
      await new Promise(resolve => setTimeout(resolve, 5000));
      process.exit(1); // Exit with error code 1, a common convention for errors
    }
  }
};

launchBrowser();
