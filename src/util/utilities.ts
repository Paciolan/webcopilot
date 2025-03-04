import puppeteer, { Page } from 'puppeteer';
import sharp from 'sharp';
import config from 'config';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import { Logger } from './logger';
import { LLM } from './llm';
import { Requests } from './requests';

/**
 * Generates a filename with timestamp for screenshots
 * @returns {string} Filename with format './snapshots/YYYY-MM-DD HH.MM.SS.SSS.png'
 */
export const generateScreenshotFilename = (): string => {
    const timestamp = new Date().toISOString()
        .replace(/T/, ' ')
        .replace(/\..+/, (match) => match.substring(0, 4))
        .replace(/:/g, '.')
        .replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
    
    return `./snapshots/${timestamp}.png`;
};

/**
 * Validates if a string is a valid base64 encoded image
 * @param base64String The base64 string to validate
 * @returns {boolean} Whether the string is valid base64
 */
export const validateBase64Image = (base64String: string): boolean => {
    try {
        // Check if it's a valid base64 string
        if (!base64String.match(/^[A-Za-z0-9+/]+={0,2}$/)) {
            return false;
        }

        // Try to decode it
        const buffer = Buffer.from(base64String, 'base64');
        
        // Check if it starts with PNG signature
        const isPNG = buffer[0] === 0x89 && 
                     buffer[1] === 0x50 && 
                     buffer[2] === 0x4E && 
                     buffer[3] === 0x47;

        return isPNG;
    } catch (error) {
        return false;
    }
};

/**
 * Takes a screenshot of the current page
 * @param page Puppeteer Page object
 * @returns {Promise<[string, string]>} Tuple containing [filepath, base64String]
 */
export const takeSnapshot = async (page: Page): Promise<[string, string]> => {
    Logger.debug('Taking snapshot (viewport)...');

    // Create snapshots directory if it doesn't exist
    if (!fs.existsSync('./snapshots')) {
        fs.mkdirSync('./snapshots');
    }

    // Generate filename
    const filename = generateScreenshotFilename();

    // Take screenshot of full page and encode as base64
    const base64Snapshot = await page.screenshot({
        encoding: 'base64',
        type: 'png',
        // fullPage: true // Capture the full scrollable page
    });

    // Convert base64 to buffer and save to file
    const buffer = Buffer.from(base64Snapshot, 'base64');
    fs.writeFileSync(filename, buffer);

    return [filename, base64Snapshot];
}; 

/**
 * Splits an image file into overlapping sections
 * @param inputImagePath Path to the input image file
 * @returns {Promise<[string[], string[], number[]]>} Tuple containing [filepaths[], base64Strings[], offsetHeights[]]
 */
export const splitImageIntoChunks = async (inputImagePath: string): Promise<[string[], string[], number[]]> => {
    Logger.debug('Splitting image into chunks...');

    // Create snapshots directory if it doesn't exist
    if (!fs.existsSync('./snapshots')) {
        fs.mkdirSync('./snapshots');
    }

    // Constants for splitting
    const CHUNK_HEIGHT = 1024;
    const OVERLAP = 200;

    // Get image metadata
    const metadata = await sharp(inputImagePath).metadata();
    if (!metadata.height || !metadata.width) {
        throw new Error('Could not get image dimensions');
    }

    // Calculate number of chunks needed
    const totalChunks = Math.ceil((metadata.height - OVERLAP) / (CHUNK_HEIGHT - OVERLAP));
    
    const filenames: string[] = [];
    const base64Snapshots: string[] = [];
    const offsetHeights: number[] = [];
    
    // Generate base filename
    const baseFilename = generateScreenshotFilename();
    const filenameParts = baseFilename.split('.');
    const filenameBase = filenameParts.slice(0, -1).join('.');
    const extension = filenameParts[filenameParts.length - 1];

    // Split image into chunks
    for (let i = 0; i < totalChunks; i++) {
        // Calculate optimal height and position
        const isShortImage = metadata.height < CHUNK_HEIGHT;
        const height = isShortImage ? metadata.height : CHUNK_HEIGHT;
        
        const isLastChunk = i === totalChunks - 1;
        const defaultStartY = i * (CHUNK_HEIGHT - OVERLAP);
        const lastChunkStartY = Math.max(0, metadata.height - CHUNK_HEIGHT);
        const startY = isLastChunk ? lastChunkStartY : defaultStartY;

        // Generate filename for this section
        const chunkFilename = `${filenameBase}-${i + 1}-${startY}.${extension}`;
        
        // Extract the chunk and get both file and base64
        const chunkBuffer = await sharp(inputImagePath)
            .extract({
                left: 0,
                top: startY,
                width: metadata.width,
                height: height
            })
            .png()
            .toBuffer();

        // Convert to base64
        const base64String = chunkBuffer.toString('base64');
        
        // Save to file
        await fs.promises.writeFile(chunkFilename, chunkBuffer);

        filenames.push(chunkFilename);
        base64Snapshots.push(base64String);
        offsetHeights.push(startY);
    }

    return [filenames, base64Snapshots, offsetHeights];
};

/**
 * Takes screenshots of the entire page, splitting into overlapping sections if needed
 * @param page Puppeteer Page object
 * @returns {Promise<[string[], string[], number[]]>} Tuple containing [filepaths[], base64Strings[], offsetHeights[]]
 */
export const takeSnapshotFullPage = async (page: Page): Promise<[string[], string[], number[]]> => {
    Logger.debug('Taking full page snapshot...');

    // Create snapshots directory if it doesn't exist
    if (!fs.existsSync('./snapshots')) {
        fs.mkdirSync('./snapshots');
    }

    // Get full page dimensions and device scale factor
    const dimensions = await page.evaluate(() => ({
        height: document.documentElement.scrollHeight,
        width: document.documentElement.scrollWidth,
        deviceScaleFactor: window.devicePixelRatio
    }));
  
    // Generate base filename
    const baseFilename = generateScreenshotFilename();
    const filenameParts = baseFilename.split('.');
    const filenameBase = filenameParts.slice(0, -1).join('.');
    const extension = filenameParts[filenameParts.length - 1];

    // scroll to the top
    await page.evaluate(() => {
        window.scrollTo(0, 0);
    });

    // save current viewport
    const viewport = config.get<{ width: number; height: number }>('viewport');
    // update viewport to full page
    await page.setViewport({
        width: viewport.width, // force the width to be the viewport width to avoid snapshot with width > 1024.
        height: dimensions.height, 
        deviceScaleFactor: 1
    });

    // wait for 0.5 second
    await new Promise(resolve => setTimeout(resolve, 500));

    // Take screenshot of full page
    const base64Snapshot = await page.screenshot({
        encoding: 'base64',
        type: 'png',
        // fullPage: true
    });

    // Generate filename for this section
    const sectionFilename = `${filenameBase}-full.${extension}`;
    
    // Save the screenshot
    const buffer = Buffer.from(base64Snapshot, 'base64');
    fs.writeFileSync(sectionFilename, buffer);

    // call splitImageIntoChunks
    const [filenames, base64Snapshots, offsetHeights] = await splitImageIntoChunks(sectionFilename);

    // wait for 0.5 second
    await new Promise(resolve => setTimeout(resolve, 500));

    // restore viewport
    await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1
    });

    // wait for 0.5 second
    await new Promise(resolve => setTimeout(resolve, 500));

    return [filenames, base64Snapshots, offsetHeights];
};

/**
 * Types text like a human with random delays between keystrokes
 * @param page Puppeteer Page object
 * @param selector Element selector
 * @param text Text to type
 */
export async function humanType(page: Page, selector: string, text: string) {
    await page.waitForSelector(selector);
    for (const char of text) {
        await page.type(selector, char);
        // Random delay between 100ms and 300ms
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));
    }
}

/**
 * Executes a dummy action with a 1 second delay
 * @param page Puppeteer Page object
 * @param offsetHeights Array of offset heights
 * @param action Action object
 * @param retry Boolean flag for retry, defaults to false
 * @returns {Promise<boolean>} Boolean flag for move on, defaults to false
 */
export async function executeAction(page: Page, offsetHeights: number[], action: any, retry: boolean = false) {
    // Get current URL
    const currentUrl = await page.url();
    Logger.debug(`Current URL: ${currentUrl}`);

    // navigate to the target url if it exists
    if (action && action.action === 'navigate') {
        Logger.debug(`Navigating to ${action.value}`);
        if (!action.value) {
            Logger.error('No target URL found in action');
            throw new Error('No target URL found in action');
        }
        await page.goto(action.value, { waitUntil: 'networkidle0' });
        Logger.debug(`Page fully loaded: ${await page.url()}`);

        // move to next action
        return true;
    }

    // If target_id exists, get coordinates from tagged element
    if (action.target_id) {
        const elementCoords = await page.evaluate((targetId) => {
            const element = document.querySelector(`.number-tag-target-${targetId}`);
            if (element) {
                const rect = element.getBoundingClientRect();
                return {
                    x: Math.floor(rect.left + rect.width/2),
                    y: Math.floor(rect.top + rect.height/2)
                };
            }
            return null;
        }, action.target_id);

        if (elementCoords) {
            action.location_x = elementCoords.x;
            action.location_y = elementCoords.y;
        }

        Logger.debug(`Tagging mode, Element coordinates: ${action.location_x}, ${action.location_y}`);
    }

    // scroll to the offset height
    await page.evaluate((offsetHeights, action) => {
        window.scrollTo(0, offsetHeights[action.target_image - 1]);
    }, offsetHeights, action);

    // draw a pointer icon on the given location
    if (action.action === 'click' || action.action === 'type') {
        await page.evaluate((action) => {
            const pointer = document.createElement('div');
            pointer.innerHTML = '👆'; // Unicode pointer finger
            pointer.id = 'capstone2024v2-pointer';
            pointer.style.position = 'fixed';
            pointer.style.left = `${action.location_x}px`;
            pointer.style.top = `${action.location_y}px`;
            pointer.style.fontSize = '24px';
            pointer.style.zIndex = '9999';
            pointer.style.pointerEvents = 'none'; // Make it non-interactive
            pointer.style.transition = 'all 0.3s ease'; // Smooth animation
            document.body.appendChild(pointer);
        }, action);
    }

    // Wait for 1 second
    await new Promise(resolve => setTimeout(resolve, 2000));

    // remove the pointer
    await page.evaluate(() => {
        const pointer = document.getElementById('capstone2024v2-pointer');
        if (pointer) {
            pointer.remove();
        }
    });

    // perform the action    
    switch (action.action) {
        case 'click':
            // click on the pointer's position
            // need to use race to wait for the page to load since the click might lead to a navigation or a API call
            Logger.debug('Clicking on the pointer\'s position...');
            if (!action.target_id) {
                await page.mouse.click(action.location_x, action.location_y)
                try {
                    await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 });
                } catch (error) {
                    Logger.debug('Network idle timeout, moving on...');
                }
            } else {
                await page.click(`.number-tag-target-${action.target_id}`)
                try {
                    await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 });
                } catch (error) {
                    Logger.debug('Network idle timeout, moving on...');
                }
            }
            break;

        case 'type':
            // click on the pointer's position
            Logger.debug('Clicking on the pointer\'s position...');
            if (!action.target_id) {
                await page.mouse.click(action.location_x, action.location_y);
            } else {
                await page.click(`.number-tag-target-${action.target_id}`);
            }

            // type the content
            Logger.debug(`typing ${action.value} into ${action.location_x}, ${action.location_y}`);
            await humanType(page, ':focus', action.value);
            break;

        case 'expectation':
            if (action.value === `true` || action.value === true) {
                Logger.info(`Expectation is true. ${action.comment ? action.comment : ''}`);
            } else {
                Logger.error(`Expectation is false. ${action.comment ? action.comment : ''}`);
                if (retry) {
                    // dont't move on
                    return false;
                } else {
                    throw new Error('Expectation is false');
                }
            }
            break;

        case 'unknown':
            Logger.error(`Can't fulfill the action: ${action.comment ? action.comment : ''}`);
            if (retry) {
                // dont't move on
                return false;
            } 
            else {
                throw new Error(`Can't fulfill the action: ${action.comment}`);
            }

        default:
            Logger.debug(`invalid action: ${action.action}`);
            throw new Error(`invalid action: ${JSON.stringify(action, null, 4)}`);
    }

    // wait for the page to load just in case
    try {
        await page.waitForNetworkIdle({ idleTime: 500, timeout: 1000 });
    } catch (error) {
        Logger.debug('Network idle timeout, moving on...');
        await Requests.abortAllRequests(page);
    }

    Logger.debug('Action completed');

    // move to next action
    return true;
}

/**
 * Gets LLM response for the current page state
 * @param page Puppeteer page object
 * @param instruction Instruction string for the LLM
 * @param tagging Optional boolean flag for tagging mode, defaults to false
 * @returns Promise that resolves with LLM response, base64 strings and offset heights
 */
export async function getLLMResponseWithCurrentPage(page: any, instruction: string, tagging: boolean = false): Promise<[string, string[], number[], string | null]> {
    // Get Claude configurations from config
    const claudeConfig = config.get<{
        apiKey: string;
        model: string;
        temperature: number;
        maxTokens: number;
        topP: number;
        topK: number;
        frequencyPenalty: number;
        presencePenalty: number;
    }>('claude');

    if (tagging) {
        // Inject tagging functionality into the page
        await injectTagging(page);

        // wait for 1 second
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Take screenshot using utility function
    const [filename, base64Strings, offsetHeights] = await takeSnapshotFullPage(page);
    Logger.debug(`Screenshot saved to ${filename}`);

    if (tagging) {
        // Remove tagging functionality from the page
        await removeTagging(page);
    }
    
    // Call Claude API with the image
    const promptContent = fs.readFileSync(
        tagging ? './prompts/tag_and_determine_action.md' : './prompts/locate_and_determine_action.md', 
        'utf8'
    );
    const prompt = promptContent.replace(
        `<%=instruction%>`, 
        instruction
    );

    // Limit to first 5 images
    const maxImages = 5;
    const limitedBase64Strings = base64Strings.slice(0, maxImages);

    const [llmResponse, cacheHash] = await LLM.invoke(prompt, limitedBase64Strings);

    if (base64Strings.length > maxImages) {
        console.warn(`Warning: Only first ${maxImages} images were sent to Claude due to API limitations.`);
    }

    return [llmResponse, base64Strings, offsetHeights, cacheHash];
}

/**
 * Injects tagging functionality into the page and executes it
 * @param page Puppeteer Page object
 * @returns {Promise<void>}
 */
export async function injectTagging(page: Page): Promise<void> {
    // clear appended target classes
    await clearAppendedTargetClasses(page);

    // First remove any existing number tags
    await page.evaluate(() => {
        const existingTags = document.querySelectorAll('.number-tag');
        existingTags.forEach(tag => tag.remove());
    });

    // Inject and execute the numberElements function
    await page.evaluate(() => {
        function numberElements() {
            // Create and append style element for embedded CSS
            const style = document.createElement('style');
            style.innerHTML = `
                .number-tag {
                    position: absolute;
                    background-color: yellow;
                    border: 1px solid black;
                    padding: 5px;
                    font-size: 12px;
                    z-index: 1000;
                }
            `;
            document.head.appendChild(style);

            // Get all anchor and button tags
            const elements = document.querySelectorAll('input, textarea');

            // Loop through each element and create the numbered tag
            elements.forEach((element, index) => {
                const numberTag = document.createElement('div');
                numberTag.classList.add('number-tag');
                numberTag.innerText = (index + 1).toString();

                // Add target class to the element
                element.classList.add(`number-tag-target-${index + 1}`);

                const rect = element.getBoundingClientRect();
                numberTag.style.top = `${rect.top + window.scrollY - 0}px`;
                numberTag.style.left = `${rect.left + window.scrollX - 0}px`;

                document.body.appendChild(numberTag);
            });
        }

        // Execute the function
        numberElements();
    });
}

/**
 * Removes any existing number tags from the page
 * @param page Puppeteer Page object
 * @returns {Promise<void>}
 */
export async function removeTagging(page: Page): Promise<void> {
    await page.evaluate(() => {
        // Remove number tags
        const existingTags = document.querySelectorAll('.number-tag');
        existingTags.forEach(tag => tag.remove());
    });
}

/**
 * Clear appended target classes from the elements
 * @param page Puppeteer Page object
 * @returns {Promise<void>}
 */
export async function clearAppendedTargetClasses(page: Page): Promise<void> {
    await page.evaluate(() => {
        // Remove number-tag-target classes
        document.querySelectorAll('[class*="number-tag-target-"]').forEach(element => {
            const classes = element.className.split(' ');
            element.className = classes.filter(c => !c.startsWith('number-tag-target-')).join(' ');
        });
    });
}

/**
 * Executes a command with a 1 second delay
 * @param page Puppeteer Page object
 * @param command Command string to execute
 * @returns {Promise<void>}
 */
export async function executeCommand(page: Page, command: string): Promise<void> {
    // save current viewport
    const retry = config.get<{ enabled: boolean; maxRetries: number; retryDelay: number }>('retry');
    let currentRetry = 0;
    let maxRetries = retry.enabled ? retry.maxRetries - 1 : 1;

    while (currentRetry <= maxRetries) {
        // Default useTag to false
        let useTag = false;
        let realCommand = command;

        // Check if command starts with tag: or locate:
        if (command.startsWith('tag:')) {
            useTag = true;
            realCommand = command.substring(4).trim();
        } else if (command.startsWith('locate:')) {
            useTag = false;
            realCommand = command.substring(7).trim();
        }

        // apply template
        realCommand = LLM.applyTemplate(realCommand);

        Logger.log(`_[Attempt ${currentRetry + 1}/${maxRetries + 1}] Executing command (**${useTag ? 'tagging' : 'locating'}**): **${realCommand}**_`);

        // Get LLM response with current page
        const [llmResponse, base64Strings, offsetHeights, cacheHash] = await getLLMResponseWithCurrentPage(page, realCommand, useTag);
        const action = extractJSONFromString(llmResponse);

        // Log the LLM response
        Logger.debug(`Action: ${JSON.stringify(action, null, 4)}`);

        // execute the action
        await new Promise(resolve => setTimeout(resolve, 2000));
        const moveOn = await executeAction(page, offsetHeights, action, retry.enabled && currentRetry < maxRetries);
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (moveOn) {
            break;
        }
        else {
            // remove the cache
            if (cacheHash) {
                LLM.removeCache(cacheHash);
            }
        }

        // wait for the retry delay
        await new Promise(resolve => setTimeout(resolve, retry.retryDelay));

        currentRetry++;
    }

    return;
}

/**
 * Extracts JSON from a string that may contain markdown or other text
 * @param str String that may contain JSON
 * @returns {object | null} Parsed JSON object or null if no valid JSON found
 */
export const extractJSONFromString = (str: string): object | null => {
    try {
        // Try direct JSON parse first
        try {
            return JSON.parse(str);
        } catch {
            // Continue to other methods if direct parse fails
        }

        // Look for JSON between markdown code blocks
        const codeBlockMatch = str.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (codeBlockMatch) {
            return JSON.parse(codeBlockMatch[1]);
        }

        // Look for properly formatted JSON objects
        const matches = str.match(/\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g);
        if (matches) {
            // Try each match until we find a valid JSON
            for (const match of matches) {
                try {
                    const parsed = JSON.parse(match);
                    if (typeof parsed === 'object' && parsed !== null) {
                        return parsed;
                    }
                } catch {
                    continue;
                }
            }
        }

        return null;
    } catch (error) {
        return null;
    }
};


