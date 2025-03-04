import { Page } from 'puppeteer';
import { Logger } from './logger';
import config from 'config';

export class Requests {
    private static instance: Requests;
    private ongoingRequests: Map<string, { 
        timestamp: number;
        method: string;
        resourceType: string;
    }>;
    private networkConfig: {
        block: string[];
    };

    private constructor() {
        this.ongoingRequests = new Map();
        this.networkConfig = config.get('network');
    }

    private static isUrlMatchingPattern(url: string, pattern: string): boolean {
        // Convert glob pattern to RegExp
        const regexPattern = pattern
            .replace(/\./g, '\\.')  // Escape dots
            .replace(/\*/g, '.*')   // Convert * to .*
            .replace(/\?/g, '.');   // Convert ? to .
        
        const regex = new RegExp(`^${regexPattern}$`);
        
        try {
            const urlObj = new URL(url);
            // Test against hostname + path
            const testString = urlObj.hostname + urlObj.pathname;
            return regex.test(testString);
        } catch {
            return false;
        }
    }

    public static getInstance(): Requests {
        if (!Requests.instance) {
            Requests.instance = new Requests();
        }
        return Requests.instance;
    }

    private static shouldBlockRequest(url: string): boolean {
        const instance = Requests.getInstance();
        return instance.networkConfig.block.some(pattern => 
            Requests.isUrlMatchingPattern(url, pattern)
        );
    }

    public static newRequest(request: any): void {
        const instance = Requests.getInstance();
        
        // check if the request is blocked
        if (Requests.shouldBlockRequest(request.url())) {
            Logger.debug(`Request blocked: ${request.url()}`);
            request.abort();
            return;
        }

        // proceed with request
        request.continue();
        
        instance.ongoingRequests.set(request.url(), {
            timestamp: Date.now(),
            method: request.method(),
            resourceType: request.resourceType()
        });
    }

    public static finishedRequest(request: any): void {
        const instance = Requests.getInstance();
        instance.ongoingRequests.delete(request.url());
        // Logger.debug(`Finished request: ${request.url()}`);
    }

    public static failedRequest(request: any): void {
        const instance = Requests.getInstance();
        instance.ongoingRequests.delete(request.url());
        // Logger.debug(`Failed request: ${request.url()}`);
    }

    public static async abortAllRequests(page: Page): Promise<void> {
        const instance = Requests.getInstance();

        if (instance.ongoingRequests.size === 0) {
            return;
        }

        console.log(`Aborting ${instance.ongoingRequests.size} pending requests:`);
        instance.ongoingRequests.forEach((details, url) => {
            const duration = Date.now() - details.timestamp;
            console.log(`- ${details.method} ${url}`);
            console.log(`  Type: ${details.resourceType}, Duration: ${duration}ms`);
        });

        // Get all client handles
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        
        // Abort all pending requests
        await client.send('Network.setBlockedURLs', { urls: ['*'] });
        
        // Optional: Clear the blocked URLs afterward
        await client.send('Network.setBlockedURLs', { urls: [] });

        instance.ongoingRequests.clear();
    }
}
